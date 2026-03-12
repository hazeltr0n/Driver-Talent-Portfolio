import { verifyAdminToken } from '../../lib/auth.js';

/**
 * GET /api/auth/admin/me
 * Returns: { admin: { email, name } }
 */
export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const admin = verifyAdminToken(req);

  if (!admin) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }

  return res.status(200).json({
    admin: {
      email: admin.email,
      name: admin.name,
    },
  });
}
