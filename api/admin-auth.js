const { createClient } = require('@supabase/supabase-js');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

module.exports = async function(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password required' });
  }

  try {
    // Look up the admin row by email
    const { data: admin, error } = await supabase
      .from('admins')
      .select('id, email, password_hash')
      .eq('email', email.trim().toLowerCase())
      .single();

    if (error || !admin) {
      // Don't reveal whether the email exists
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Compare submitted password against the stored bcrypt hash
    const valid = await bcrypt.compare(password, admin.password_hash);

    if (!valid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Issue a short-lived signed token — this is what admin-data/admin-update will verify
    const token = jwt.sign(
      { adminId: admin.id, email: admin.email },
      process.env.ADMIN_JWT_SECRET,
      { expiresIn: '8h' }
    );

    // Track last login + token (optional bookkeeping, matches your schema)
    await supabase
      .from('admins')
      .update({ last_login: new Date().toISOString(), last_token: token })
      .eq('id', admin.id);

    return res.status(200).json({ token });

  } catch(e) {
    console.log('Error:', e.message);
    return res.status(500).json({ error: 'Server error' });
  }
};