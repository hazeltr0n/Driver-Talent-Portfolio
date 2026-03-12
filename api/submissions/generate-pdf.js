// Generate PDF for a submission and upload to R2
import puppeteer from 'puppeteer-core';
import chromium from '@sparticuz/chromium';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

const IS_LOCAL = !process.env.VERCEL;
const LOCAL_CHROME_PATH = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const APP_URL = process.env.APP_URL || 'https://driver-talent-portfolio-sigma.vercel.app';

const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY;
const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID;
const CANDIDATES_TABLE_ID = process.env.AIRTABLE_CANDIDATES_TABLE_ID;
const SUBMISSIONS_TABLE_ID = 'tblRy25nM6WGZBq0J';

// R2 Configuration
const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID;
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID;
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY;
const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME || 'driver-story-videos';
const R2_PUBLIC_URL = process.env.R2_PUBLIC_URL || 'https://pub-422282bc0284434c83ea29192d0e301c.r2.dev';

const s3Client = new S3Client({
  region: 'auto',
  endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: R2_ACCESS_KEY_ID,
    secretAccessKey: R2_SECRET_ACCESS_KEY,
  },
});

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { submissionId } = req.body;

  if (!submissionId) {
    return res.status(400).json({ error: 'submissionId required' });
  }

  let browser = null;

  try {
    // Get submission data
    const submissionUrl = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${SUBMISSIONS_TABLE_ID}/${submissionId}`;
    const submissionRes = await fetch(submissionUrl, {
      headers: { Authorization: `Bearer ${AIRTABLE_API_KEY}` },
    });
    const submissionData = await submissionRes.json();

    if (submissionData.error) {
      return res.status(404).json({ error: 'Submission not found' });
    }

    const submission = submissionData.fields;
    const candidateUuid = submission.candidate_uuid;

    if (!candidateUuid) {
      return res.status(400).json({ error: 'Submission has no candidate_uuid' });
    }

    // Get candidate to find portfolio_slug
    const formula = encodeURIComponent(`{uuid} = "${candidateUuid}"`);
    const searchUrl = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${CANDIDATES_TABLE_ID}?filterByFormula=${formula}&maxRecords=1`;
    const searchResponse = await fetch(searchUrl, {
      headers: { Authorization: `Bearer ${AIRTABLE_API_KEY}` },
    });
    const searchData = await searchResponse.json();

    if (!searchData.records || searchData.records.length === 0) {
      return res.status(404).json({ error: 'Candidate not found' });
    }

    const candidate = searchData.records[0].fields;
    const portfolioSlug = candidate.portfolio_slug;
    const firstName = candidate.fullName?.split(' ')[0] || 'Driver';

    if (!portfolioSlug) {
      return res.status(400).json({ error: 'Candidate has no portfolio_slug' });
    }

    // Build portfolio URL with PDF mode
    const portfolioUrl = `${APP_URL}/portfolio/${portfolioSlug}?pdf=true&submission=${submissionId}`;

    // Launch browser
    const launchOptions = IS_LOCAL
      ? {
          executablePath: LOCAL_CHROME_PATH,
          headless: true,
          defaultViewport: { width: 816, height: 1056 },
          args: ['--no-sandbox', '--disable-setuid-sandbox'],
        }
      : {
          args: chromium.args,
          defaultViewport: { width: 816, height: 1056 },
          executablePath: await chromium.executablePath(),
          headless: chromium.headless,
        };

    browser = await puppeteer.launch(launchOptions);
    const page = await browser.newPage();

    await page.goto(portfolioUrl, {
      waitUntil: 'networkidle0',
      timeout: 30000,
    });

    // Wait for content
    await page.waitForSelector('[class*="dfp-content"]', { timeout: 10000 }).catch(async () => {
      await new Promise(resolve => setTimeout(resolve, 2000));
    });

    // Add print styles
    await page.evaluate(() => {
      const style = document.createElement('style');
      style.textContent = `* { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }`;
      document.head.appendChild(style);
    });

    // Generate PDF
    const pdfBuffer = await page.pdf({
      format: 'Letter',
      printBackground: true,
      margin: { top: '0.3in', right: '0.3in', bottom: '0.3in', left: '0.3in' },
    });

    await browser.close();
    browser = null;

    // Upload to R2
    const timestamp = Date.now();
    const pdfKey = `pdfs/${submissionId}-${timestamp}.pdf`;

    await s3Client.send(new PutObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: pdfKey,
      Body: pdfBuffer,
      ContentType: 'application/pdf',
    }));

    const pdfUrl = `${R2_PUBLIC_URL}/${pdfKey}`;

    // Update submission with PDF URL
    await fetch(submissionUrl, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${AIRTABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        fields: { pdf_url: pdfUrl },
      }),
    });

    console.log(`📄 PDF generated for submission ${submissionId}: ${pdfUrl}`);

    res.status(200).json({
      success: true,
      pdf_url: pdfUrl,
    });

  } catch (error) {
    console.error('PDF generation error:', error);
    if (browser) {
      await browser.close();
    }
    res.status(500).json({ error: error.message });
  }
}

export const config = {
  maxDuration: 60,
};
