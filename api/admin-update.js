const { createClient } = require('@supabase/supabase-js');
const jwt = require('jsonwebtoken');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

function verifyAdminToken(token) {
  if (!token) return null;
  try {
    return jwt.verify(token, process.env.ADMIN_JWT_SECRET);
  } catch (e) {
    return null;
  }
}

module.exports = async function(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const token = (req.headers.authorization || '').replace('Bearer ', '');
  const decoded = verifyAdminToken(token);
  if (!decoded) return res.status(401).json({ error: 'Unauthorized' });

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