const https = require('https');
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

function intasendRequest(options, payload) {
  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => resolve({ status: res.statusCode, body: data }));
    });
    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
  });
}

module.exports = async function(req, res) {
  if (req.method === 'POST') {
    // Initiate STK push
    const { phone, amount, userId } = req.body;
    if (!phone) return res.status(400).json({ error: 'Phone number is required' });

    let formattedPhone = phone.replace(/\s/g, '');
    if (formattedPhone.startsWith('0')) {
      formattedPhone = '254' + formattedPhone.substring(1);
    }

    const payload = JSON.stringify({
      phone_number: formattedPhone,
      amount: amount || 390,
      currency: 'KES',
      narrative: 'Quote Card Maker Premium'
    });

    const options = {
      hostname: 'payment.intasend.com',
      path: '/api/v1/payment/mpesa-stk-push/',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + process.env.INTASEND_SECRET_KEY,
        'Content-Length': Buffer.byteLength(payload)
      }
    };

    try {
      const response = await intasendRequest(options, payload);
      const parsed = JSON.parse(response.body);
      console.log('STK Push response:', JSON.stringify(parsed));

      const invoiceId = parsed.invoice?.invoice_id || parsed.id || null;
      if (invoiceId) {
        await supabase.from('payments').insert({
          customer_id: userId || null,
          phone: formattedPhone,
          amount: amount || 390,
          currency: 'KES',
          method: 'M-Pesa',
          status: 'pending',
          transaction_id: invoiceId
        });
      }

      return res.status(200).json({ ...parsed, invoice_id: invoiceId });
    } catch(e) {
      return res.status(500).json({ error: e.message });
    }

  } else if (req.method === 'GET') {
    // Check payment status
    const { invoice_id } = req.query;
    if (!invoice_id) return res.status(400).json({ error: 'invoice_id required' });

    const options = {
      hostname: 'payment.intasend.com',
      path: '/api/v1/payment/status/' + invoice_id + '/',
      method: 'GET',
      headers: {
        'Authorization': 'Bearer ' + process.env.INTASEND_SECRET_KEY
      }
    };

    try {
      const response = await intasendRequest(options, null);
      const parsed = JSON.parse(response.body);
      console.log('Payment status:', JSON.stringify(parsed));

      const status = parsed.invoice?.state || parsed.state || '';
      const completed = status === 'COMPLETE';

      if (completed) {
        // Mark payment as success
        const { data: paymentRow } = await supabase
          .from('payments')
          .update({ status: 'success' })
          .eq('transaction_id', invoice_id)
          .select('customer_id')
          .single();

        // Mark the customer as premium too — this is what unlocks the app
        if (paymentRow && paymentRow.customer_id) {
          await supabase
            .from('customers')
            .update({
              is_premium: true,
              premium_granted_at: new Date().toISOString()
            })
            .eq('id', paymentRow.customer_id);
        }
      }

      return res.status(200).json({ completed, status, raw: parsed });
    } catch(e) {
      return res.status(500).json({ error: e.message });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
};