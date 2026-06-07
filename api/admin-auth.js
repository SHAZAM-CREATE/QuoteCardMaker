const { createClient } = require('@supabase/supabase-js');
const crypto = require('crypto');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

function hashPassword(password) {
  return crypto.createHash('sha256').update(password + process.env.ADMIN_SALT || 'qcm-salt-2026').digest('hex');
}

function generateToken(email) {
  return crypto.createHash('sha256').update(email + Date.now() + (process.env.ADMIN_SALT || 'qcm-salt-2026')).digest('hex');
}

module.exports = async function(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password required' });
  }

  try {
    const hashed = hashPassword(password);

    const { data, error } = await supabase
      .from('admins')
      .select('*')
      .eq('email', email.toLowerCase())
      .eq('password_hash', hashed)
      .single();

    if (error || !data) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = generateToken(email);

    // Store token temporarily (store in admin row)
    await supabase
      .from('admins')
      .update({ last_token: token, last_login: new Date().toISOString() })
      .eq('id', data.id);

    return res.status(200).json({ token });

  } catch(e) {
    return res.status(500).json({ error: 'Server error' });
  }
};