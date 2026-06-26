// Run this once locally to generate a bcrypt hash for your admin password.
// Usage: node generate-admin-hash.js "yourPasswordHere"
//
// Copy the printed hash into the `password_hash` column of your `admins`
// table in Supabase, alongside the admin's email.

const bcrypt = require('bcryptjs');

const password = process.argv[2];

if (!password) {
  console.log('Usage: node generate-admin-hash.js "yourPassword"');
  process.exit(1);
}

const hash = bcrypt.hashSync(password, 10);
console.log('\nPassword hash (copy this into the admins.password_hash column):\n');
console.log(hash);
console.log('');