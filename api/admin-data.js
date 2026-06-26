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
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const token = (req.headers.authorization || '').replace('Bearer ', '');
  const decoded = verifyAdminToken(token);
  if (!decoded) return res.status(401).json({ error: 'Unauthorized' });

  try {
    const [customersRes, paymentsRes] = await Promise.all([
      supabase.from('customers').select('*').order('created_at', { ascending: false }),
      supabase.from('payments').select('*').order('created_at', { ascending: false })
    ]);

    return res.status(200).json({
      customers: customersRes.data || [],
      payments: paymentsRes.data || []
    });

  } catch(e) {
    return res.status(500).json({ error: 'Server error' });
  }
};