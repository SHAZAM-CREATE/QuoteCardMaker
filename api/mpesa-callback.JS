const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// PayHero POSTs here when an STK push completes (success OR failure).
// We don't control PayHero's exact payload shape with certainty, so we
// defensively read every likely field name before giving up.
module.exports = async function(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const body = req.body || {};
    console.log('PayHero callback received:', JSON.stringify(body));

    // PayHero wraps actual transaction data inside a "response" object
    // for their other endpoints (confirmed in their withdraw/topup docs),
    // so check both top-level and nested shapes.
    const data = body.response || body;

    const externalReference = data.ExternalReference || data.external_reference || body.external_reference;
    const resultCode = data.ResultCode !== undefined ? data.ResultCode : data.result_code;
    const status = (data.Status || data.status || '').toString().toLowerCase();

    if (!externalReference) {
      console.log('Callback missing external_reference — cannot match payment');
      return res.status(200).json({ received: true }); // ack anyway so PayHero stops retrying
    }

    // Success: either ResultCode === 0, or status text says success/complete
    const isSuccess = resultCode === 0 || status === 'success' || status === 'complete' || status === 'completed';

    if (isSuccess) {
      // Mark the payment row as successful
      const { data: paymentRow } = await supabase
        .from('payments')
        .update({ status: 'success' })
        .eq('transaction_id', externalReference)
        .select('customer_id')
        .single();

      // Unlock premium for the linked customer
      if (paymentRow && paymentRow.customer_id) {
        await supabase
          .from('customers')
          .update({
            is_premium: true,
            premium_granted_at: new Date().toISOString()
          })
          .eq('id', paymentRow.customer_id);
      }
    } else {
      // Failed or cancelled — mark it so the frontend stops polling with a clear state
      await supabase
        .from('payments')
        .update({ status: 'failed' })
        .eq('transaction_id', externalReference);
    }

    return res.status(200).json({ received: true });

  } catch(e) {
    console.log('Callback error:', e.message);
    // Still return 200 — PayHero will retry on non-2xx, and retries won't fix a code bug
    return res.status(200).json({ received: true, error: e.message });
  }
};