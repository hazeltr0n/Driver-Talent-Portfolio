// Send driver profile email to employer with video thumbnail, quote, and stats
import { sendEmail } from '../lib/email.js';

const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY;
const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID;
const CANDIDATES_TABLE_ID = process.env.AIRTABLE_CANDIDATES_TABLE_ID;
const APP_URL = process.env.APP_URL || 'https://driver-talent-portfolio-sigma.vercel.app';
const R2_PUBLIC_URL = 'https://pub-422282bc0284434c83ea29192d0e301c.r2.dev';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { uuid, toEmail, toName, fitScore, jobTitle, employerName } = req.body;

  if (!uuid || !toEmail) {
    return res.status(400).json({ error: 'uuid and toEmail required' });
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
    const {
      fullName,
      city,
      state,
      video_url,
      ai_pull_quote,
      cdl_class,
      years_experience,
      endorsements,
      mvr_status,
      clearinghouse_status,
      home_time_preference,
      portfolio_slug,
    } = candidate;

    const firstName = fullName?.split(' ')[0] || 'Driver';
    const portfolioUrl = portfolio_slug ? `${APP_URL}/portfolio/${portfolio_slug}` : null;
    const videoUrl = video_url || portfolioUrl;

    // Generate video thumbnail URL (use a poster frame or placeholder)
    // Cloudflare Stream videos have thumbnail at /thumbnails/thumbnail.jpg
    // For R2-hosted videos, we'll use a branded placeholder
    const thumbnailUrl = `${R2_PUBLIC_URL}/assets/video-thumbnail-placeholder.png`;

    // Clean up quote (remove extra quotes if present)
    const quote = ai_pull_quote?.replace(/^["']|["']$/g, '').trim() || null;

    // Build stats badges
    const stats = [];
    if (cdl_class) stats.push({ label: 'CDL Class', value: cdl_class });
    if (years_experience !== undefined) stats.push({ label: 'Experience', value: `${years_experience} yr${years_experience !== 1 ? 's' : ''}` });
    if (endorsements) stats.push({ label: 'Endorsements', value: endorsements });
    if (mvr_status) stats.push({ label: 'MVR', value: mvr_status });
    if (clearinghouse_status) stats.push({ label: 'Clearinghouse', value: clearinghouse_status });
    if (home_time_preference) stats.push({ label: 'Home Time', value: home_time_preference });

    // Generate stats HTML
    const statsHtml = stats.slice(0, 4).map(s => `
      <td style="padding: 8px 16px; text-align: center;">
        <div style="color: #6B7280; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px;">${s.label}</div>
        <div style="color: #1F2937; font-size: 16px; font-weight: 600; margin-top: 4px;">${s.value}</div>
      </td>
    `).join('');

    const subject = fitScore
      ? `${firstName} matches ${fitScore}% for your ${jobTitle || 'open position'}`
      : `Meet ${firstName} - CDL-${cdl_class || 'A'} Driver from ${city || 'your area'}`;

    await sendEmail({
      to: toEmail,
      subject,
      html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; background-color: #F3F4F6; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #F3F4F6; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #FFFFFF; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);">

          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #004751 0%, #006B7A 100%); padding: 24px 32px;">
              <img src="https://freeworld.org/images/logo.svg" alt="FreeWorld" style="height: 32px;">
            </td>
          </tr>

          <!-- Video Thumbnail Section -->
          <tr>
            <td style="padding: 32px 32px 24px;">
              <a href="${videoUrl || portfolioUrl || '#'}" style="display: block; position: relative; text-decoration: none;">
                <div style="position: relative; border-radius: 12px; overflow: hidden; background: #1F2937;">
                  <!-- Video thumbnail or placeholder -->
                  <img src="${thumbnailUrl}" alt="Watch ${firstName}'s video" style="width: 100%; height: auto; display: block; min-height: 200px; object-fit: cover;">

                  <!-- Play button overlay -->
                  <div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); width: 72px; height: 72px; background: rgba(158, 240, 26, 0.95); border-radius: 50%; display: flex; align-items: center; justify-content: center;">
                    <div style="width: 0; height: 0; border-left: 24px solid #1F2937; border-top: 14px solid transparent; border-bottom: 14px solid transparent; margin-left: 6px;"></div>
                  </div>

                  <!-- Driver name overlay -->
                  <div style="position: absolute; bottom: 0; left: 0; right: 0; background: linear-gradient(transparent, rgba(0,0,0,0.8)); padding: 40px 20px 20px;">
                    <div style="color: #FFFFFF; font-size: 24px; font-weight: 700;">${fullName}</div>
                    <div style="color: #b0db2a; font-size: 14px; margin-top: 4px;">📍 ${city || 'Location'}${state ? `, ${state}` : ''}</div>
                  </div>
                </div>
              </a>
            </td>
          </tr>

          ${fitScore ? `
          <!-- Fit Score Banner -->
          <tr>
            <td style="padding: 0 32px 24px;">
              <div style="background: linear-gradient(135deg, #b0db2a 0%, #70D000 100%); border-radius: 8px; padding: 16px 24px; text-align: center;">
                <span style="color: #1F2937; font-size: 14px; font-weight: 500;">Fit Score for ${jobTitle || 'your position'}</span>
                <span style="color: #1F2937; font-size: 32px; font-weight: 800; margin-left: 16px;">${fitScore}%</span>
              </div>
            </td>
          </tr>
          ` : ''}

          ${quote ? `
          <!-- Quote Section -->
          <tr>
            <td style="padding: 0 32px 24px;">
              <div style="border-left: 4px solid #b0db2a; padding-left: 20px;">
                <div style="color: #374151; font-size: 18px; font-style: italic; line-height: 1.6;">
                  "${quote}"
                </div>
                <div style="color: #6B7280; font-size: 14px; margin-top: 8px;">
                  — ${firstName}, in their own words
                </div>
              </div>
            </td>
          </tr>
          ` : ''}

          <!-- Stats Section -->
          ${stats.length > 0 ? `
          <tr>
            <td style="padding: 0 32px 24px;">
              <table width="100%" cellpadding="0" cellspacing="0" style="background: #F9FAFB; border-radius: 8px;">
                <tr>
                  ${statsHtml}
                </tr>
              </table>
            </td>
          </tr>
          ` : ''}

          <!-- CTA Button -->
          <tr>
            <td style="padding: 0 32px 32px;" align="center">
              <a href="${portfolioUrl || videoUrl || '#'}" style="display: inline-block; background: #004751; color: #FFFFFF; padding: 16px 40px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">
                View Full Profile
              </a>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background: #F9FAFB; padding: 24px 32px; border-top: 1px solid #E5E7EB;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="color: #6B7280; font-size: 13px; line-height: 1.6;">
                    <strong>Interested in ${firstName}?</strong><br>
                    Reply to this email or contact your FreeWorld Career Agent to request an interview.
                  </td>
                </tr>
                <tr>
                  <td style="color: #9CA3AF; font-size: 12px; padding-top: 16px;">
                    FreeWorld connects employers with qualified CDL drivers.<br>
                    <a href="https://freeworld.org" style="color: #9CA3AF;">freeworld.org</a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
      `,
    });

    res.status(200).json({
      success: true,
      to: toEmail,
      candidate: fullName,
      subject,
    });
  } catch (error) {
    console.error('Driver profile email error:', error);
    res.status(500).json({ error: error.message });
  }
}
