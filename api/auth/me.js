import jwt from 'jsonwebtoken';

const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY;
const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID;
const EMPLOYERS_TABLE_ID = process.env.AIRTABLE_EMPLOYERS_TABLE_ID || 'tbl9bxGlAKtQfnPhY';
const JWT_SECRET = process.env.JWT_SECRET;

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  const token = authHeader.substring(7);

  if (!JWT_SECRET) {
    return res.status(500).json({ error: 'JWT_SECRET not configured' });
  }

  try {
    const payload = jwt.verify(token, JWT_SECRET);

    // Optionally fetch fresh employer data
    const employer = await getEmployer(payload.employer_id);

    if (!employer) {
      return res.status(401).json({ error: 'Employer not found' });
    }

    res.status(200).json({
      authenticated: true,
      employer: {
        id: employer.id,
        name: employer.fields.name,
        contact_name: employer.fields.main_contact_name,
        email: employer.fields.main_contact_email,
        city: employer.fields.city,
        state: employer.fields.state,
      },
    });
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Session expired' });
    }
    return res.status(401).json({ error: 'Invalid token' });
  }
}

async function getEmployer(recordId) {
  const url = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${EMPLOYERS_TABLE_ID}/${recordId}`;

  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${AIRTABLE_API_KEY}` },
  });

  if (!response.ok) return null;
  return response.json();
}

// Middleware helper for other employer API routes
export function verifyEmployerToken(req) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }

  const token = authHeader.substring(7);

  if (!JWT_SECRET) {
    return null;
  }

  try {
    return jwt.verify(token, JWT_SECRET);
  } catch {
    return null;
  }
}
