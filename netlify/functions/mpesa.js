exports.handler = async function(event) {
  const { phone, amount } = JSON.parse(event.body);

  const response = await fetch('https://payment.intasend.com/api/v1/payment/mpesa-stk-push/', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + process.env.INTASEND_SECRET_KEY
    },
    body: JSON.stringify({
      phone_number: phone,
      amount: amount,
      currency: 'KES',
      narrative: 'Quote Card Maker Premium'
    })
  });

  const data = await response.json();
  return {
    statusCode: 200,
    body: JSON.stringify(data)
  };
};