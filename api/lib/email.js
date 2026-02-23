import nodemailer from 'nodemailer';

const SMTP_HOST = process.env.SMTP_HOST;
const SMTP_PORT = process.env.SMTP_PORT || 587;
const SMTP_USER = process.env.SMTP_USER;
const SMTP_PASS = process.env.SMTP_PASS;
const EMAIL_FROM = process.env.EMAIL_FROM || 'FreeWorld <placement@freeworld.org>';

let transporter = null;

function getTransporter() {
  if (!transporter && SMTP_HOST && SMTP_USER && SMTP_PASS) {
    transporter = nodemailer.createTransport({
      host: SMTP_HOST,
      port: parseInt(SMTP_PORT),
      secure: SMTP_PORT === '465',
      auth: {
        user: SMTP_USER,
        pass: SMTP_PASS,
      },
    });
  }
  return transporter;
}

export async function sendEmail({ to, subject, html }) {
  const transport = getTransporter();

  if (!transport) {
    console.log('📧 Email (SMTP not configured):');
    console.log(`   To: ${to}`);
    console.log(`   Subject: ${subject}`);
    console.log(`   ---`);
    return { success: true, simulated: true };
  }

  try {
    const result = await transport.sendMail({
      from: EMAIL_FROM,
      to,
      subject,
      html,
    });
    console.log(`📧 Email sent to ${to}: ${subject}`);
    return { success: true, messageId: result.messageId };
  } catch (err) {
    console.error('📧 Email failed:', err.message);
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
