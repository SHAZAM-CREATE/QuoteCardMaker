const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

const supabaseAuth = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

async function verifyToken(token) {
  if (!token) return false;
  const { data, error } = await supabaseAuth.auth.getUser(token);
  return !error && !!data.user;
}

module.exports = async function(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const token = (req.headers.authorization || '').replace('Bearer ', '');
  const valid = await verifyToken(token);
  if (!valid) return res.status(401).json({ error: 'Unauthorized' });

  const { customerId, isPremium } = req.body;

  if (!customerId) {
    return res.status(400).json({ error: 'Customer ID required' });
  }

  try {
    const { error } = await supabase
      .from('customers')
      .update({
        is_premium: isPremium,
        premium_granted_at: isPremium ? new Date().toISOString() : null
      })
      .eq('id', customerId);

    if (error) return res.status(500).json({ error: error.message });

    return res.status(200).json({ success: true });

  } catch(e) {
    return res.status(500).json({ error: 'Server error' });
  }
};