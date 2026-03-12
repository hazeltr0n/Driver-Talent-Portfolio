// Generate Driver Fit Profile PDF using Puppeteer - renders actual portfolio page
import puppeteer from 'puppeteer-core';
import chromium from '@sparticuz/chromium';

const IS_LOCAL = !process.env.VERCEL;
const LOCAL_CHROME_PATH = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const APP_URL = process.env.APP_URL || 'https://driver-talent-portfolio-sigma.vercel.app';
const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY;
const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID;
const CANDIDATES_TABLE_ID = process.env.AIRTABLE_CANDIDATES_TABLE_ID;

export default async function handler(req, res) {
  const { uuid, submissionId } = req.query;

  if (!uuid) {
    return res.status(400).json({ error: 'uuid query param required' });
  }

  let browser = null;

  try {
    // Get candidate to find portfolio_slug
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
    const portfolioSlug = candidate.portfolio_slug;
    const firstName = candidate.fullName?.split(' ')[0] || 'Driver';

    if (!portfolioSlug) {
      return res.status(400).json({ error: 'Candidate has no portfolio_slug' });
    }

    // Build portfolio URL with PDF mode for single-page layout
    let portfolioUrl = `${APP_URL}/portfolio/${portfolioSlug}?pdf=true`;
    if (submissionId) {
      portfolioUrl += `&submission=${submissionId}`;
    }

    // Launch browser - use local Chrome for dev, serverless chromium for production
    // Letter page at 96 DPI: 8.5" x 11" = 816px x 1056px, minus 0.3" margins = 758px x 998px
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

    // Navigate to portfolio page
    await page.goto(portfolioUrl, {
      waitUntil: 'networkidle0',
      timeout: 30000,
    });

    // Wait for content to load
    await page.waitForSelector('[class*="dfp-content"]', { timeout: 10000 }).catch(async () => {
      // Fallback - wait a bit more
      await new Promise(resolve => setTimeout(resolve, 2000));
    });

    // Add print styles for PDF
    await page.evaluate(() => {
      const style = document.createElement('style');
      style.textContent = `
        * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
      `;
      document.head.appendChild(style);
    });

    // Generate PDF
    const pdfBuffer = await page.pdf({
      format: 'Letter',
      printBackground: true,
      margin: {
        top: '0.3in',
        right: '0.3in',
        bottom: '0.3in',
        left: '0.3in',
      },
    });

    await browser.close();
    browser = null;

    // Send PDF
    const filename = `${firstName.toLowerCase()}-driver-profile.pdf`;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', pdfBuffer.length);
    res.send(Buffer.from(pdfBuffer));

  } catch (error) {
    console.error('PDF generation error:', error);
    if (browser) {
      await browser.close();
    }
    res.status(500).json({ error: error.message });
  }
}

// Increase timeout for PDF generation
export const config = {
  maxDuration: 60,
};
