const https = require('https');

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

  const payload = JSON.stringify({
    phone_number: formattedPhone,
    amount: amount || 390,
    currency: 'KES',
    narrative: 'Quote Card Maker Premium'
  });

  return new Promise((resolve) => {
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
      response.on('end', () => {
        console.log('IntaSend status:', response.statusCode);
        console.log('IntaSend response:', data);
        try {
          const parsed = JSON.parse(data);
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