import crypto from 'crypto';
import { sendMagicLinkEmail } from '../lib/email.js';

const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY;
const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID;
const EMPLOYERS_TABLE_ID = process.env.AIRTABLE_EMPLOYERS_TABLE_ID || 'tbl9bxGlAKtQfnPhY';
const APP_URL = process.env.APP_URL || 'https://driver-talent-portfolio.vercel.app';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ error: 'Email required' });
  }

  // Find employer by main_contact_email
  const employer = await findEmployerByEmail(email);

  if (!employer) {
    // Don't reveal whether email exists for security
    return res.status(200).json({
      message: 'If an account exists with this email, a magic link has been sent.'
    });
  }

  // Generate magic token (32 bytes = 64 hex chars)
  const token = crypto.randomBytes(32).toString('hex');
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
  const expires = new Date(Date.now() + 15 * 60 * 1000).toISOString(); // 15 minutes

  // Store token hash in Airtable
  await updateEmployerAuth(employer.id, {
    auth_token_hash: tokenHash,
    auth_token_expires: expires,
  });

  // Build magic link
  const magicLink = `${APP_URL}/employer/verify?token=${token}&email=${encodeURIComponent(email)}`;

  // Send email
  await sendMagicLinkEmail({
    to: email,
    contactName: employer.fields.main_contact_name,
    magicLink,
  });

  res.status(200).json({
    message: 'If an account exists with this email, a magic link has been sent.',
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
