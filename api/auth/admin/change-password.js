import bcrypt from 'bcryptjs';
import { verifyAdminToken } from '../../lib/auth.js';

const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY;
const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID;
const AIRTABLE_ADMIN_USERS_TABLE_ID = process.env.AIRTABLE_ADMIN_USERS_TABLE_ID;

const SALT_ROUNDS = 10;

/**
 * POST /api/auth/admin/change-password
 * Body: { currentPassword, newPassword }
 * Returns: { success: true }
 */
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const admin = verifyAdminToken(req);
  if (!admin) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword) {
    return res.status(400).json({ error: 'Current password and new password are required' });
  }

  if (newPassword.length < 8) {
    return res.status(400).json({ error: 'New password must be at least 8 characters' });
  }

  // Fetch current user record to verify current password
  const url = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${AIRTABLE_ADMIN_USERS_TABLE_ID}/${admin.admin_id}`;
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${AIRTABLE_API_KEY}` },
  });

  if (!response.ok) {
    return res.status(500).json({ error: 'Failed to fetch user record' });
  }

  const record = await response.json();
  const storedHash = record.fields.password_hash;

  // Verify current password
  const isValid = await bcrypt.compare(currentPassword, storedHash);
  if (!isValid) {
    return res.status(401).json({ error: 'Current password is incorrect' });
  }

  // Hash new password
  const newHash = await bcrypt.hash(newPassword, SALT_ROUNDS);

  // Update Airtable record
  const updateUrl = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${AIRTABLE_ADMIN_USERS_TABLE_ID}/${admin.admin_id}`;
  const updateRes = await fetch(updateUrl, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${AIRTABLE_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      fields: {
        password_hash: newHash,
      },
    }),
  });

  if (!updateRes.ok) {
    const err = await updateRes.json();
    console.error('Failed to update password:', err);
    return res.status(500).json({ error: 'Failed to update password' });
  }

  return res.status(200).json({ success: true });
}
