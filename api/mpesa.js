const https = require('https');
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

function payheroRequest(path, method, payload) {
  return new Promise((resolve, reject) => {
    const authToken = Buffer.from(
      process.env.PAYHERO_USERNAME + ':' + process.env.PAYHERO_PASSWORD
    ).toString('base64');

    const body = payload ? JSON.stringify(payload) : null;

    const options = {
      hostname: 'backend.payhero.co.ke',
      path: path,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Basic ' + authToken
      }
    };
    if (body) options.headers['Content-Length'] = Buffer.byteLength(body);

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => resolve({ status: res.statusCode, body: data }));
    });
    req.on('error', reject);
    if (body) req.write(body);
    req.end();
  });
}

module.exports = async function(req, res) {
  if (req.method === 'POST') {
    // ── Initiate STK push via PayHero ──
    const { phone, amount, userId } = req.body;
    if (!phone) return res.status(400).json({ error: 'Phone number is required' });

    let formattedPhone = phone.replace(/\s/g, '');
    if (formattedPhone.startsWith('0')) {
      formattedPhone = '254' + formattedPhone.substring(1);
    } else if (formattedPhone.startsWith('+')) {
      formattedPhone = formattedPhone.substring(1);
    }

    // Unique reference we control — lets us match the callback back to this attempt
    const externalReference = 'QCM-' + Date.now() + '-' + Math.random().toString(36).substring(2, 8);

    const payload = {
      amount: amount || 390,
      phone_number: formattedPhone,
      channel_id: process.env.PAYHERO_CHANNEL_ID,
      provider: 'm-pesa',
      external_reference: externalReference,
      callback_url: process.env.PAYHERO_CALLBACK_URL // e.g. https://quote-card-maker.vercel.app/api/mpesa-callback
    };

    try {
      // Save a pending payment row FIRST, so the callback has something to match against
      await supabase.from('payments').insert({
        customer_id: userId || null,
        phone: formattedPhone,
        amount: amount || 390,
        currency: 'KES',
        method: 'M-Pesa',
        status: 'pending',
        transaction_id: externalReference
      });

      const response = await payheroRequest('/api/v2/payments/initiate-stk-push', 'POST', payload);
      const parsed = JSON.parse(response.body);
      console.log('PayHero STK Push response:', JSON.stringify(parsed));

      if (response.status >= 200 && response.status < 300) {
        return res.status(200).json({ success: true, reference: externalReference });
      } else {
        // STK push failed — clean up the pending row so it doesn't linger
        await supabase.from('payments').delete().eq('transaction_id', externalReference);
        return res.status(400).json({ error: parsed.error_message || 'Failed to initiate STK push' });
      }
    } catch(e) {
      console.log('Error:', e.message);
      return res.status(500).json({ error: e.message });
    }

  } else if (req.method === 'GET') {
    // ── Check payment status — reads OUR OWN database, populated by the callback ──
    const { reference } = req.query;
    if (!reference) return res.status(400).json({ error: 'reference required' });

    try {
      const { data: payment } = await supabase
        .from('payments')
        .select('status, customer_id')
        .eq('transaction_id', reference)
        .single();

      if (!payment) return res.status(404).json({ error: 'Payment not found' });

      const completed = payment.status === 'success';
      return res.status(200).json({ completed, status: payment.status });
    } catch(e) {
      return res.status(500).json({ error: e.message });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
};