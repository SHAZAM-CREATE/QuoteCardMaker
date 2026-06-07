exports.handler = async function(event) {
  const { phone, amount } = JSON.parse(event.body);

  // Convert 07xx to 2547xx
  let formattedPhone = phone.replace(/\s/g, '');
  if (formattedPhone.startsWith('0')) {
    formattedPhone = '254' + formattedPhone.substring(1);
  }

  const response = await fetch('https://payment.intasend.com/api/v1/payment/mpesa-stk-push/', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + process.env.INTASEND_SECRET_KEY
    },
    body: JSON.stringify({
      phone_number: formattedPhone,
      amount: amount,
      currency: 'KES',
      narrative: 'Quote Card Maker Premium'
    })
  });

  const data = await response.json();
  console.log('IntaSend response:', JSON.stringify(data));
  return {
    statusCode: 200,
    body: JSON.stringify(data)
  };
};