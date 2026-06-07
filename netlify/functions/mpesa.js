const https = require('https');

exports.handler = async function(event) {
  const { phone, amount } = JSON.parse(event.body);

  // Convert 07xx to 2547xx
  let formattedPhone = phone.replace(/\s/g, '');
  if (formattedPhone.startsWith('0')) {
    formattedPhone = '254' + formattedPhone.substring(1);
  }

  return new Promise((resolve) => {
    const payload = JSON.stringify({
      phone_number: formattedPhone,
      amount: amount,
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

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        resolve({
          statusCode: 200,
          body: data
        });
      });
    });

    req.on('error', (e) => {
      resolve({
        statusCode: 500,
        body: JSON.stringify({ error: e.message })
      });
    });

    req.write(payload);
    req.end();
  });
};