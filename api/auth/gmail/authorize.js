// Gmail OAuth - Start authorization flow
import { google } from 'googleapis';

const GMAIL_CLIENT_ID = process.env.GMAIL_CLIENT_ID;
const GMAIL_CLIENT_SECRET = process.env.GMAIL_CLIENT_SECRET;
const GMAIL_REDIRECT_URI = process.env.GMAIL_REDIRECT_URI || 'http://localhost:3000/api/auth/gmail/callback';

export default async function handler(req, res) {
  if (!GMAIL_CLIENT_ID || !GMAIL_CLIENT_SECRET) {
    return res.status(500).json({ error: 'Gmail OAuth not configured' });
  }

  const oauth2Client = new google.auth.OAuth2(
    GMAIL_CLIENT_ID,
    GMAIL_CLIENT_SECRET,
    GMAIL_REDIRECT_URI
  );

  const authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent',
    scope: ['https://www.googleapis.com/auth/gmail.send'],
  });

  res.redirect(authUrl);
}
