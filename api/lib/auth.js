import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET;

/**
 * Verify JWT token from Authorization header and return employer payload
 * @param {Request} req - The incoming request
 * @returns {Object|null} - Decoded JWT payload or null if invalid
 */
export function verifyEmployerToken(req) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }

  const token = authHeader.substring(7);

  if (!JWT_SECRET) {
    console.error('JWT_SECRET not configured');
    return null;
  }

  try {
    const payload = jwt.verify(token, JWT_SECRET);
    // Ensure this is an employer token (has employer_id)
    if (!payload.employer_id) return null;
    return payload;
  } catch (err) {
    return null;
  }
}

/**
 * Express-style middleware that requires employer auth
 * Returns 401 if not authenticated
 * @param {Request} req
 * @param {Response} res
 * @returns {Object|null} - Employer payload if authenticated, null if response sent
 */
export function requireEmployerAuth(req, res) {
  const employer = verifyEmployerToken(req);

  if (!employer) {
    res.status(401).json({ error: 'Authentication required' });
    return null;
  }

  return employer;
}

/**
 * Verify JWT token from Authorization header and return admin payload
 * @param {Request} req - The incoming request
 * @returns {Object|null} - Decoded JWT payload or null if invalid
 */
export function verifyAdminToken(req) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }

  const token = authHeader.substring(7);

  if (!JWT_SECRET) {
    console.error('JWT_SECRET not configured');
    return null;
  }

  try {
    const payload = jwt.verify(token, JWT_SECRET);
    // Ensure this is an admin token (has admin_id)
    if (!payload.admin_id) return null;
    return payload;
  } catch (err) {
    return null;
  }
}

/**
 * Express-style middleware that requires admin auth
 * Returns 401 if not authenticated
 * @param {Request} req
 * @param {Response} res
 * @returns {Object|null} - Admin payload if authenticated, null if response sent
 */
export function requireAdminAuth(req, res) {
  const admin = verifyAdminToken(req);

  if (!admin) {
    res.status(401).json({ error: 'Admin authentication required' });
    return null;
  }

  return admin;
}
