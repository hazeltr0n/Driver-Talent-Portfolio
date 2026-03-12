import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY;
const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID;
const AIRTABLE_ADMIN_USERS_TABLE_ID = process.env.AIRTABLE_ADMIN_USERS_TABLE_ID;
const JWT_SECRET = process.env.JWT_SECRET;

/**
 * POST /api/auth/admin/login
 * Body: { email, password }
 * Returns: { token, admin: { email, name } }
 */
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  if (!AIRTABLE_ADMIN_USERS_TABLE_ID) {
    return res.status(500).json({ error: 'Admin users table not configured' });
  }

  if (!JWT_SECRET) {
    return res.status(500).json({ error: 'JWT secret not configured' });
  }

  // Look up user by email
  const formula = encodeURIComponent(`{email} = "${email.toLowerCase()}"`);
  const url = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${AIRTABLE_ADMIN_USERS_TABLE_ID}?filterByFormula=${formula}&maxRecords=1`;

  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${AIRTABLE_API_KEY}` },
  });

  if (!response.ok) {
    const err = await response.json();
    console.error('Airtable lookup failed:', err);
    return res.status(500).json({ error: 'Failed to look up user' });
  }

  const data = await response.json();

  if (!data.records || data.records.length === 0) {
    return res.status(401).json({ error: 'Invalid email or password' });
  }

  const record = data.records[0];
  const storedHash = record.fields.password_hash;

  if (!storedHash) {
    return res.status(401).json({ error: 'Invalid email or password' });
  }

  // Verify password
  const isValid = await bcrypt.compare(password, storedHash);
  if (!isValid) {
    return res.status(401).json({ error: 'Invalid email or password' });
  }

  // Create JWT with 7-day expiry (longer for internal admin users)
  const payload = {
    admin_id: record.id,
    email: record.fields.email,
    name: record.fields.name || record.fields.email.split('@')[0],
  };

  const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });

  return res.status(200).json({
    token,
    admin: {
      email: payload.email,
      name: payload.name,
    },
  });
}
