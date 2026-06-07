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
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const token = (req.headers.authorization || '').replace('Bearer ', '');
  const valid = await verifyToken(token);
  if (!valid) return res.status(401).json({ error: 'Unauthorized' });

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