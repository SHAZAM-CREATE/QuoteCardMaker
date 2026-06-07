const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
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
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password: password.trim()
    });

    if (error || !data.session) {
      console.log('Auth error:', error?.message);
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    return res.status(200).json({ token: data.session.access_token });

  } catch(e) {
    console.log('Error:', e.message);
    return res.status(500).json({ error: 'Server error' });
  }
};