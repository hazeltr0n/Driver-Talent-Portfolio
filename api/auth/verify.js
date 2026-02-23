import crypto from 'crypto';
import jwt from 'jsonwebtoken';

const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY;
const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID;
const EMPLOYERS_TABLE_ID = process.env.AIRTABLE_EMPLOYERS_TABLE_ID || 'tbl9bxGlAKtQfnPhY';
const JWT_SECRET = process.env.JWT_SECRET;

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { token, email } = req.query;

  if (!token || !email) {
    return res.status(400).json({ error: 'Token and email required' });
  }

  if (!JWT_SECRET) {
    return res.status(500).json({ error: 'JWT_SECRET not configured' });
  }

  // Find employer by email
  const employer = await findEmployerByEmail(email);

  if (!employer) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }

  const { auth_token_hash, auth_token_expires } = employer.fields;

  // Check if token matches
  const providedHash = crypto.createHash('sha256').update(token).digest('hex');

  if (providedHash !== auth_token_hash) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }

  // Check if token expired
  if (new Date(auth_token_expires) < new Date()) {
    return res.status(401).json({ error: 'Token has expired' });
  }

  // Clear the token and update last_login
  await updateEmployerAuth(employer.id, {
    auth_token_hash: null,
    auth_token_expires: null,
    last_login: new Date().toISOString(),
  });

  // Generate JWT (24h expiry)
  const jwtPayload = {
    employer_id: employer.id,
    employer_name: employer.fields.name,
    email: employer.fields.main_contact_email,
    contact_name: employer.fields.main_contact_name,
  };

  const jwtToken = jwt.sign(jwtPayload, JWT_SECRET, { expiresIn: '24h' });

  res.status(200).json({
    success: true,
    token: jwtToken,
    employer: {
      id: employer.id,
      name: employer.fields.name,
      contact_name: employer.fields.main_contact_name,
      email: employer.fields.main_contact_email,
    },
  });
}

async function findEmployerByEmail(email) {
  const formula = encodeURIComponent(`LOWER({main_contact_email}) = "${email.toLowerCase()}"`);
  const url = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${EMPLOYERS_TABLE_ID}?filterByFormula=${formula}&maxRecords=1`;

  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${AIRTABLE_API_KEY}` },
  });

  if (!response.ok) {
    throw new Error(`Airtable error: ${response.status}`);
  }

  const data = await response.json();
  return data.records?.[0] || null;
}

async function updateEmployerAuth(recordId, fields) {
  const url = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${EMPLOYERS_TABLE_ID}/${recordId}`;

  const response = await fetch(url, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${AIRTABLE_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ fields }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Update failed: ${error}`);
  }

  return response.json();
}
