import { google } from 'googleapis';

const GMAIL_CLIENT_ID = process.env.GMAIL_CLIENT_ID;
const GMAIL_CLIENT_SECRET = process.env.GMAIL_CLIENT_SECRET;
const GMAIL_REFRESH_TOKEN = process.env.GMAIL_REFRESH_TOKEN;
const EMAIL_FROM = process.env.EMAIL_FROM || 'FreeWorld <placement@freeworld.org>';

// Extract email address from "Name <email>" format
function extractEmail(from) {
  const match = from.match(/<(.+)>/);
  return match ? match[1] : from;
}

export async function sendEmail({ to, cc, subject, html }) {
  if (!GMAIL_CLIENT_ID || !GMAIL_CLIENT_SECRET || !GMAIL_REFRESH_TOKEN) {
    console.log('📧 Email (Gmail not configured):');
    console.log(`   To: ${to}`);
    console.log(`   Subject: ${subject}`);
    console.log(`   ---`);
    console.log('   Run: http://localhost:3000/api/auth/gmail/authorize to set up Gmail OAuth');
    return { success: true, simulated: true };
  }

  try {
    const oauth2Client = new google.auth.OAuth2(
      GMAIL_CLIENT_ID,
      GMAIL_CLIENT_SECRET
    );

    oauth2Client.setCredentials({
      refresh_token: GMAIL_REFRESH_TOKEN,
    });

    const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

    // Build the email
    const fromEmail = extractEmail(EMAIL_FROM);
    const headers = [
      `From: ${EMAIL_FROM}`,
      `To: ${to}`,
    ];
    if (cc) {
      headers.push(`Cc: ${cc}`);
    }
    headers.push(
      `Subject: ${subject}`,
      'MIME-Version: 1.0',
      'Content-Type: text/html; charset=utf-8'
    );
    const rawMessage = [...headers, '', html].join('\r\n');

    console.log('📧 Email headers:', headers.slice(0, 4)); // Log first 4 headers (From, To, Cc, Subject)

    // Base64url encode
    const encodedMessage = Buffer.from(rawMessage)
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');

    const result = await gmail.users.messages.send({
      userId: 'me',
      requestBody: {
        raw: encodedMessage,
      },
    });

    console.log(`📧 Email sent via Gmail to ${to}: ${subject}`);
    return { success: true, messageId: result.data.id };
  } catch (err) {
    console.error('📧 Gmail send failed:', err.message);
    throw err;
  }
}

// Pre-built email templates

export async function sendMagicLinkEmail({ to, contactName, magicLink }) {
  return sendEmail({
    to,
    subject: 'Sign in to FreeWorld Employer Portal',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px;">
        <h2 style="color: #004751; margin-bottom: 16px;">Sign in to Employer Portal</h2>
        <p style="color: #5A7A82; margin-bottom: 24px;">
          Hi ${contactName || 'there'},<br><br>
          Click the button below to sign in to your FreeWorld Employer Portal.
          This link expires in 15 minutes.
        </p>
        <a href="${magicLink}" style="display: inline-block; background: #004751; color: #FFFFFF; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600;">
          Sign In
        </a>
        <p style="color: #9CA3AF; font-size: 12px; margin-top: 24px;">
          If you didn't request this email, you can safely ignore it.
        </p>
      </div>
    `,
  });
}

export async function sendInterviewRequestEmail({ employer, employerContact, candidate, job, fitScore, notes }) {
  const to = process.env.CAREER_AGENT_EMAIL || 'placement@freeworld.org';

  return sendEmail({
    to,
    subject: `Interview Request: ${employer} wants to interview ${candidate}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px;">
        <h2 style="color: #004751;">New Interview Request</h2>
        <p><strong>${employer}</strong> (${employerContact}) has requested an interview.</p>

        <div style="background: #F8FAFB; padding: 16px; border-radius: 8px; margin: 20px 0;">
          <p style="margin: 0 0 8px;"><strong>Candidate:</strong> ${candidate}</p>
          <p style="margin: 0 0 8px;"><strong>Position:</strong> ${job}</p>
          <p style="margin: 0 0 8px;"><strong>Fit Score:</strong> ${fitScore}%</p>
          ${notes ? `<p style="margin: 0;"><strong>Notes:</strong> ${notes}</p>` : ''}
        </div>

        <p>Please follow up with both parties to facilitate the interview.</p>
      </div>
    `,
  });
}

export async function sendStatusChangeEmail({ employer, candidate, job, oldStatus, newStatus, rejectionReason, rejectionExplanation, interviewNotes }) {
  const to = process.env.CAREER_AGENT_EMAIL || 'placement@freeworld.org';

  let subject = `Status Update: ${candidate} - ${newStatus}`;
  let details = '';

  if (newStatus === 'Rejected') {
    subject = `Rejection: ${candidate} for ${job} at ${employer}`;
    details = `
      <p><strong>Rejection Reason:</strong> ${rejectionReason || 'Not specified'}</p>
      ${rejectionExplanation ? `<p><strong>Details:</strong> ${rejectionExplanation}</p>` : ''}
    `;
  } else if (newStatus === 'Hired') {
    subject = `Hired! ${candidate} at ${employer}`;
  } else if (newStatus === 'Interviewing') {
    details = interviewNotes ? `<p><strong>Interview Notes:</strong> ${interviewNotes}</p>` : '';
  }

  return sendEmail({
    to,
    subject,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px;">
        <h2 style="color: #004751;">Submission Status Update</h2>

        <div style="background: #F8FAFB; padding: 16px; border-radius: 8px; margin: 20px 0;">
          <p style="margin: 0 0 8px;"><strong>Candidate:</strong> ${candidate}</p>
          <p style="margin: 0 0 8px;"><strong>Position:</strong> ${job}</p>
          <p style="margin: 0 0 8px;"><strong>Employer:</strong> ${employer}</p>
          <p style="margin: 0 0 8px;"><strong>Status:</strong> ${oldStatus} → <strong>${newStatus}</strong></p>
          ${details}
        </div>
      </div>
    `,
  });
}
