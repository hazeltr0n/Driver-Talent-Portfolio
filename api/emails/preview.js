// Preview driver profile email HTML (for testing)
const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY;
const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID;
const CANDIDATES_TABLE_ID = process.env.AIRTABLE_CANDIDATES_TABLE_ID;
const APP_URL = process.env.APP_URL || 'https://driver-talent-portfolio-sigma.vercel.app';
const R2_ASSETS = 'https://pub-422282bc0284434c83ea29192d0e301c.r2.dev/assets';

// FreeWorld Brand Colors
const BRAND = {
  teal: '#004751',
  tealLight: '#006575',
  lime: '#b0db2a',
  textDark: '#1A2A30',
  textMuted: '#5A7A82',
  bgLight: '#F4F4F4',
  bgCard: '#F8FAFB',
  success: '#059669',
  successBg: '#D1FAE5',
};

export default async function handler(req, res) {
  const { uuid, fitScore, jobTitle } = req.query;

  if (!uuid) {
    return res.status(400).send('uuid query param required. Try: /api/emails/preview?uuid=xxx');
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
      return res.status(404).send('Candidate not found');
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
    const lastName = fullName?.split(' ').slice(1).join(' ') || '';
    const lastInitial = lastName ? lastName[0] + '.' : '';
    const displayName = `${firstName} ${lastInitial}`;
    const portfolioUrl = portfolio_slug ? `${APP_URL}/portfolio/${portfolio_slug}` : null;
    const videoUrl = video_url || portfolioUrl;

    // Clean up quote
    const quote = ai_pull_quote?.replace(/^["']|["']$/g, '').trim() || null;

    // Build stats
    const stats = [];
    if (cdl_class) stats.push({ label: 'CDL', value: `Class ${cdl_class}` });
    if (years_experience !== undefined && years_experience > 0) stats.push({ label: 'Experience', value: `${years_experience} yr${years_experience !== 1 ? 's' : ''}` });
    if (endorsements) stats.push({ label: 'Endorsements', value: endorsements });
    if (mvr_status) stats.push({ label: 'MVR', value: mvr_status });
    if (clearinghouse_status) stats.push({ label: 'Clearinghouse', value: clearinghouse_status });
    if (home_time_preference) stats.push({ label: 'Home Time', value: home_time_preference });

    const statsHtml = stats.slice(0, 4).map(s => `
      <td style="padding: 12px 8px; text-align: center; width: 25%;">
        <div style="color: ${BRAND.textMuted}; font-size: 10px; text-transform: uppercase; letter-spacing: 0.5px; font-weight: 600;">${s.label}</div>
        <div style="color: ${BRAND.textDark}; font-size: 15px; font-weight: 700; margin-top: 4px;">${s.value}</div>
      </td>
    `).join('');

    const parsedFitScore = fitScore ? parseInt(fitScore) : null;

    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Driver Profile: ${fullName}</title>
  <!--[if mso]>
  <style type="text/css">
    table, td { font-family: Arial, sans-serif !important; }
  </style>
  <![endif]-->
</head>
<body style="margin: 0; padding: 0; background-color: ${BRAND.bgLight}; font-family: 'Segoe UI', system-ui, -apple-system, sans-serif; -webkit-font-smoothing: antialiased;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: ${BRAND.bgLight}; padding: 32px 16px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; background-color: #FFFFFF; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 24px rgba(0, 71, 81, 0.08);">

          <!-- Header with Round Logo -->
          <tr>
            <td style="background: linear-gradient(135deg, ${BRAND.teal} 0%, ${BRAND.tealLight} 100%); padding: 20px 28px;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td>
                    <img src="${R2_ASSETS}/fw-logo-white.svg" alt="FreeWorld" style="height: 36px; width: 36px;" />
                  </td>
                  <td align="right">
                    <span style="color: rgba(255,255,255,0.7); font-size: 11px; text-transform: uppercase; letter-spacing: 1px; font-weight: 600;">Driver Fit Profile</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Video Thumbnail Section -->
          <tr>
            <td style="padding: 28px 28px 20px;">
              <a href="${videoUrl || portfolioUrl || '#'}" style="display: block; text-decoration: none;">
                <table width="100%" cellpadding="0" cellspacing="0" style="border-radius: 12px; overflow: hidden; background: linear-gradient(135deg, ${BRAND.teal} 0%, ${BRAND.tealLight} 100%);">
                  <tr>
                    <td style="height: 200px; text-align: center; vertical-align: middle; position: relative;">
                      <!-- Play button -->
                      <div style="display: inline-block; width: 72px; height: 72px; background: ${BRAND.lime}; border-radius: 50%; line-height: 72px; text-align: center;">
                        <span style="display: inline-block; width: 0; height: 0; border-left: 22px solid ${BRAND.teal}; border-top: 13px solid transparent; border-bottom: 13px solid transparent; margin-left: 6px; vertical-align: middle;"></span>
                      </div>
                      <div style="margin-top: 12px; color: rgba(255,255,255,0.9); font-size: 13px; font-weight: 500;">Watch ${firstName}'s Story</div>
                    </td>
                  </tr>
                  <!-- Driver info overlay -->
                  <tr>
                    <td style="background: linear-gradient(to top, rgba(0,0,0,0.7), transparent); padding: 24px 20px 20px;">
                      <div style="color: #FFFFFF; font-size: 26px; font-weight: 700; font-family: Georgia, serif;">${displayName}</div>
                      <div style="color: ${BRAND.lime}; font-size: 14px; margin-top: 6px;">📍 ${city || 'Location'}${state ? `, ${state}` : ''}</div>
                    </td>
                  </tr>
                </table>
              </a>
            </td>
          </tr>

          ${parsedFitScore ? `
          <!-- Fit Score Banner -->
          <tr>
            <td style="padding: 0 28px 20px;">
              <table width="100%" cellpadding="0" cellspacing="0" style="background: linear-gradient(135deg, ${BRAND.lime} 0%, #c4e84d 100%); border-radius: 10px;">
                <tr>
                  <td style="padding: 14px 20px;">
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="color: ${BRAND.teal}; font-size: 13px; font-weight: 600;">Fit Score for ${jobTitle || 'your open position'}</td>
                        <td align="right" style="color: ${BRAND.teal}; font-size: 28px; font-weight: 800;">${parsedFitScore}%</td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          ` : ''}

          ${quote ? `
          <!-- Quote Section -->
          <tr>
            <td style="padding: 0 28px 24px;">
              <table width="100%" cellpadding="0" cellspacing="0" style="background: linear-gradient(135deg, #F0F9FF 0%, #F0FAF0 100%); border-radius: 12px; border-left: 4px solid ${BRAND.teal};">
                <tr>
                  <td style="padding: 20px 24px;">
                    <div style="color: ${BRAND.teal}; font-size: 48px; font-family: Georgia, serif; line-height: 1; opacity: 0.2; margin-bottom: -20px;">"</div>
                    <div style="color: ${BRAND.teal}; font-size: 17px; font-style: italic; line-height: 1.6; font-family: Georgia, serif;">
                      ${quote}
                    </div>
                    <div style="color: ${BRAND.textMuted}; font-size: 13px; margin-top: 12px; font-weight: 600;">
                      — ${firstName}, in their own words
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          ` : ''}

          <!-- Stats Section -->
          ${stats.length > 0 ? `
          <tr>
            <td style="padding: 0 28px 24px;">
              <table width="100%" cellpadding="0" cellspacing="0" style="background: ${BRAND.bgCard}; border-radius: 10px; border: 1px solid #E8ECEE;">
                <tr>
                  ${statsHtml}
                </tr>
              </table>
            </td>
          </tr>
          ` : ''}

          <!-- CTA Button - Download PDF -->
          <tr>
            <td style="padding: 0 28px 28px;" align="center">
              <a href="${APP_URL}/api/pdf/driver-profile?uuid=${uuid}${parsedFitScore ? `&fitScore=${parsedFitScore}` : ''}${jobTitle ? `&jobTitle=${encodeURIComponent(jobTitle)}` : ''}" style="display: inline-block; background: ${BRAND.teal}; color: #FFFFFF; padding: 14px 36px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 15px;">
                Download Full Profile (PDF) →
              </a>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background: ${BRAND.bgCard}; padding: 20px 28px; border-top: 1px solid #E8ECEE;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="color: ${BRAND.textMuted}; font-size: 13px; line-height: 1.6;">
                    <strong style="color: ${BRAND.textDark};">Interested in ${firstName}?</strong><br>
                    Reply to this email or contact your FreeWorld Career Agent to request an interview.
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Brand Footer with Wordmark -->
          <tr>
            <td style="background: ${BRAND.teal}; padding: 16px 28px;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center">
                    <img src="${R2_ASSETS}/fw-wordmark.svg" alt="FreeWorld" style="height: 20px; width: auto;" />
                  </td>
                </tr>
                <tr>
                  <td align="center" style="padding-top: 8px;">
                    <a href="https://freeworld.org" style="color: rgba(255,255,255,0.6); font-size: 11px; text-decoration: none;">freeworld.org</a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

        </table>

        <!-- Unsubscribe footer -->
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; margin-top: 16px;">
          <tr>
            <td align="center" style="color: #9CA3AF; font-size: 11px; line-height: 1.5;">
              FreeWorld connects employers with qualified CDL drivers.<br>
              Questions? Contact <a href="mailto:placement@freeworld.org" style="color: #9CA3AF;">placement@freeworld.org</a>
            </td>
          </tr>
        </table>

      </td>
    </tr>
  </table>
</body>
</html>
    `;

    res.setHeader('Content-Type', 'text/html');
    res.send(html);
  } catch (error) {
    console.error('Email preview error:', error);
    res.status(500).send(`Error: ${error.message}`);
  }
}
