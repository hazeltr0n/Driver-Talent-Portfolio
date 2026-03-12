// Gmail OAuth - Handle callback and store refresh token
import { google } from 'googleapis';
import fs from 'fs';
import path from 'path';

const GMAIL_CLIENT_ID = process.env.GMAIL_CLIENT_ID;
const GMAIL_CLIENT_SECRET = process.env.GMAIL_CLIENT_SECRET;
const GMAIL_REDIRECT_URI = process.env.GMAIL_REDIRECT_URI || 'http://localhost:3000/api/auth/gmail/callback';

// For Vercel, we'll store in env var. For local dev, we can write to a file.
const IS_LOCAL = !process.env.VERCEL;

export default async function handler(req, res) {
  const { code, error } = req.query;

  if (error) {
    return res.status(400).send(`OAuth error: ${error}`);
  }

  if (!code) {
    return res.status(400).send('No authorization code received');
  }

  try {
    const oauth2Client = new google.auth.OAuth2(
      GMAIL_CLIENT_ID,
      GMAIL_CLIENT_SECRET,
      GMAIL_REDIRECT_URI
    );

    const { tokens } = await oauth2Client.getToken(code);

    console.log('Gmail OAuth tokens received:');
    console.log('Access Token:', tokens.access_token?.substring(0, 20) + '...');
    console.log('Refresh Token:', tokens.refresh_token);

    if (tokens.refresh_token) {
      // For local dev, append to .env file
      if (IS_LOCAL) {
        const envPath = path.join(process.cwd(), '.env');
        const envContent = fs.readFileSync(envPath, 'utf8');

        if (envContent.includes('GMAIL_REFRESH_TOKEN=')) {
          // Replace existing
          const updated = envContent.replace(
            /GMAIL_REFRESH_TOKEN=.*/,
            `GMAIL_REFRESH_TOKEN=${tokens.refresh_token}`
          );
          fs.writeFileSync(envPath, updated);
        } else {
          // Append
          fs.appendFileSync(envPath, `\nGMAIL_REFRESH_TOKEN=${tokens.refresh_token}\n`);
        }
        console.log('Refresh token saved to .env');
      }

      res.send(`
        <html>
          <body style="font-family: system-ui; padding: 40px; text-align: center;">
            <h1 style="color: #059669;">✅ Gmail Connected!</h1>
            <p>Your refresh token has been saved.</p>
            <p style="font-family: monospace; background: #f3f4f6; padding: 12px; border-radius: 8px; word-break: break-all;">
              ${tokens.refresh_token}
            </p>
            <p style="color: #6b7280; font-size: 14px;">
              ${IS_LOCAL ? 'Token saved to .env file.' : 'Add GMAIL_REFRESH_TOKEN to your Vercel environment variables.'}
            </p>
            <p><a href="/admin/submissions">Back to Submissions</a></p>
          </body>
        </html>
      `);
    } else {
      res.send(`
        <html>
          <body style="font-family: system-ui; padding: 40px; text-align: center;">
            <h1 style="color: #dc2626;">⚠️ No Refresh Token</h1>
            <p>Google didn't return a refresh token. This usually means you've already authorized this app.</p>
            <p>Try revoking access at <a href="https://myaccount.google.com/permissions">Google Account Permissions</a> and try again.</p>
          </body>
        </html>
      `);
    }
  } catch (err) {
    console.error('Gmail OAuth error:', err);
    res.status(500).send(`OAuth error: ${err.message}`);
  }
}
