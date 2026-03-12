// Send email to driver when their video is complete
import { sendEmail } from '../lib/email.js';

const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY;
const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID;
const CANDIDATES_TABLE_ID = process.env.AIRTABLE_CANDIDATES_TABLE_ID;
const APP_URL = process.env.APP_URL || 'https://driver-talent-portfolio-sigma.vercel.app';

// Testing: send all emails to this address instead of the actual recipient
const TEST_EMAIL_OVERRIDE = process.env.TEST_EMAIL_OVERRIDE || 'james@freeworld.org';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { uuid, videoUrl } = req.body;

  if (!uuid) {
    return res.status(400).json({ error: 'uuid required' });
  }

  try {
    // Get candidate data from Airtable
    const formula = encodeURIComponent(`{uuid} = "${uuid}"`);
    const searchUrl = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${CANDIDATES_TABLE_ID}?filterByFormula=${formula}&maxRecords=1`;

    const searchResponse = await fetch(searchUrl, {
      headers: { Authorization: `Bearer ${AIRTABLE_API_KEY}` },
    });

    const searchData = await searchResponse.json();

    if (!searchData.records || searchData.records.length === 0) {
      return res.status(404).json({ error: 'Candidate not found' });
    }

    const candidate = searchData.records[0].fields;
    const email = candidate.email;
    const firstName = candidate.fullName?.split(' ')[0] || candidate.name?.split(' ')[0] || 'Driver';
    const portfolioSlug = candidate.portfolio_slug;

    if (!portfolioSlug) {
      console.log(`No portfolio_slug for candidate ${uuid}`);
      return res.status(200).json({ success: true, skipped: true, reason: 'no portfolio_slug' });
    }

    const portfolioUrl = `${APP_URL}/portfolio/${portfolioSlug}`;

    if (!email) {
      console.log(`No email on file for candidate ${uuid}`);
      return res.status(200).json({ success: true, skipped: true, reason: 'no email' });
    }

    // Send the email (use test override if set)
    const toEmail = TEST_EMAIL_OVERRIDE || email;
    if (TEST_EMAIL_OVERRIDE) {
      console.log(`[TEST MODE] Sending to ${toEmail} instead of ${email}`);
    }

    await sendEmail({
      to: toEmail,
      subject: `${firstName}, your Driver Story Video is ready!`,
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <img src="https://pub-422282bc0284434c83ea29192d0e301c.r2.dev/assets/fw-logo.svg" alt="FreeWorld" style="height: 40px; margin-bottom: 20px;">

          <h1 style="color: #1a1a1a; font-size: 24px; margin-bottom: 16px;">
            Your Driver Story Video is Ready!
          </h1>

          <p style="color: #4a4a4a; font-size: 16px; line-height: 1.6;">
            Hey ${firstName},
          </p>

          <p style="color: #4a4a4a; font-size: 16px; line-height: 1.6;">
            Great news - your Driver Story Video has been assembled and added to your portfolio. Employers can now see the real you, not just a resume.
          </p>

          <div style="margin: 32px 0;">
            <a href="${portfolioUrl}" style="background-color: #9EF01A; color: #1a1a1a; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 600; display: inline-block;">
              View Your Portfolio
            </a>
          </div>

          <p style="color: #4a4a4a; font-size: 16px; line-height: 1.6;">
            Your Career Agent will be in touch soon with next steps. In the meantime, feel free to share your portfolio link with anyone you'd like.
          </p>

          <p style="color: #4a4a4a; font-size: 16px; line-height: 1.6;">
            Keep moving forward,<br>
            <strong>The FreeWorld Team</strong>
          </p>

          <hr style="border: none; border-top: 1px solid #e5e5e5; margin: 32px 0;">

          <p style="color: #999; font-size: 12px;">
            FreeWorld helps formerly incarcerated individuals find careers in trucking.<br>
            <a href="https://freeworld.io" style="color: #999;">freeworld.io</a>
          </p>
        </div>
      `,
    });

    res.status(200).json({ success: true, email, portfolioUrl });
  } catch (error) {
    console.error('Completion email error:', error);
    res.status(500).json({ error: error.message });
  }
}
