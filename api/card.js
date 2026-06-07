const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

module.exports = async function(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { email, amount } = req.body;

  if (!email) {
    return res.status(400).json({ error: 'Email is required' });
  }

  try {
    // Check if customer exists
    let customerId = null;

    const { data: existing } = await supabase
      .from('customers')
      .select('id')
      .eq('email', email.toLowerCase().trim())
      .single();

    if (existing) {
      customerId = existing.id;
      await supabase
        .from('customers')
        .update({
          is_premium: true,
          premium_granted_at: new Date().toISOString()
        })
        .eq('id', customerId);
    } else {
      const { data: newCustomer } = await supabase
        .from('customers')
        .insert({
          email: email.toLowerCase().trim(),
          is_premium: true,
          premium_granted_at: new Date().toISOString()
        })
        .select('id')
        .single();
      if (newCustomer) customerId = newCustomer.id;
    }

    // Save payment record
    await supabase.from('payments').insert({
      customer_id: customerId,
      email: email.toLowerCase().trim(),
      amount: amount || 3,
      currency: 'USD',
      method: 'Card',
      status: 'success'
    });

    return res.status(200).json({ success: true });

  } catch(e) {
    console.log('Error:', e.message);
    return res.status(500).json({ error: 'Server error' });
  }
};