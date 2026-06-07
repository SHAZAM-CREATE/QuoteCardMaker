const https = require('https');
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

module.exports = async function(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { phone, amount } = req.body;

  if (!phone) {
    return res.status(400).json({ error: 'Phone number is required' });
  }

  // Convert 07xx to 2547xx
  let formattedPhone = phone.replace(/\s/g, '');
  if (formattedPhone.startsWith('0')) {
    formattedPhone = '254' + formattedPhone.substring(1);
  }

  return new Promise((resolve) => {
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

    const request = https.request(options, (response) => {
      let data = '';
      response.on('data', (chunk) => { data += chunk; });
      response.on('end', async () => {
        console.log('IntaSend status:', response.statusCode);
        console.log('IntaSend response:', data);

        try {
          const parsed = JSON.parse(data);
          const success = parsed.invoice || parsed.success;

          // Save to Supabase
          try {
            // Upsert customer by phone
            let customerId = null;

            const { data: existing } = await supabase
              .from('customers')
              .select('id')
              .eq('phone', formattedPhone)
              .single();

            if (existing) {
              customerId = existing.id;
              // Update premium status
              await supabase
                .from('customers')
                .update({
                  is_premium: true,
                  premium_granted_at: new Date().toISOString()
                })
                .eq('id', customerId);
            } else {
              // Create new customer
              const { data: newCustomer } = await supabase
                .from('customers')
                .insert({
                  phone: formattedPhone,
                  is_premium: !!success,
                  premium_granted_at: success ? new Date().toISOString() : null
                })
                .select('id')
                .single();
              if (newCustomer) customerId = newCustomer.id;
            }

            // Save payment record
            await supabase.from('payments').insert({
              customer_id: customerId,
              phone: formattedPhone,
              amount: amount || 390,
              currency: 'KES',
              method: 'M-Pesa',
              status: success ? 'success' : 'failed',
              transaction_id: parsed.invoice?.invoice_id || null
            });

          } catch(dbErr) {
            console.log('DB error:', dbErr.message);
          }

          res.status(200).json(parsed);
        } catch(e) {
          res.status(200).send(data);
        }
        resolve();
      });
    });

    request.on('error', (e) => {
      console.log('Request error:', e.message);
      res.status(500).json({ error: e.message });
      resolve();
    });

    request.write(payload);
    request.end();
  });
};