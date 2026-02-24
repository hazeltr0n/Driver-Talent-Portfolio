#!/usr/bin/env node
/**
 * Capture screenshots for Career Agent Playbook
 * Usage: npx playwright test scripts/capture-playbook-screenshots.mjs
 * Or: node scripts/capture-playbook-screenshots.mjs (requires dev server running)
 */

import { chromium } from 'playwright';
import { mkdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SCREENSHOTS_DIR = join(__dirname, '../docs/playbook-screenshots');
const BASE_URL = process.env.BASE_URL || 'http://localhost:5173';

// Ensure screenshots directory exists
if (!existsSync(SCREENSHOTS_DIR)) {
  mkdirSync(SCREENSHOTS_DIR, { recursive: true });
}

async function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function captureScreenshots() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
  });
  const page = await context.newPage();

  console.log('Starting screenshot capture...');
  console.log(`Base URL: ${BASE_URL}`);
  console.log(`Output: ${SCREENSHOTS_DIR}\n`);

  try {
    // 1. Dashboard
    console.log('1. Capturing Dashboard...');
    await page.goto(`${BASE_URL}/admin`);
    await page.waitForLoadState('networkidle');
    await delay(500);
    await page.screenshot({ path: join(SCREENSHOTS_DIR, '01-dashboard.png') });

    // 2. Drivers List
    console.log('2. Capturing Drivers list...');
    await page.goto(`${BASE_URL}/admin/drivers`);
    await page.waitForLoadState('networkidle');
    await delay(500);
    await page.screenshot({ path: join(SCREENSHOTS_DIR, '02-drivers-list.png') });

    // 3. Add Driver Modal - Step 1 (Search)
    console.log('3. Capturing Add Driver modal (Search step)...');
    await page.click('button:has-text("+ Add Driver")');
    await delay(300);
    await page.screenshot({ path: join(SCREENSHOTS_DIR, '03-add-driver-search.png') });

    // 3b. Type in search and show results (if any drivers exist)
    await page.fill('input[placeholder="Enter name..."]', 'test');
    await page.click('button:has-text("Search")');
    await delay(1000);
    await page.screenshot({ path: join(SCREENSHOTS_DIR, '03b-add-driver-search-results.png') });

    // Close modal
    await page.click('button:has-text("×")');
    await delay(200);

    // 4. Driver Detail Modal (if drivers exist)
    console.log('4. Capturing Driver detail modal...');
    const viewButtons = await page.$$('button:has-text("View")');
    if (viewButtons.length > 0) {
      await viewButtons[0].click();
      await delay(300);
      await page.screenshot({ path: join(SCREENSHOTS_DIR, '04-driver-detail.png') });

      // Scroll down to show more sections
      await page.evaluate(() => {
        const modal = document.querySelector('[style*="overflow: auto"]');
        if (modal) modal.scrollTop = 400;
      });
      await delay(200);
      await page.screenshot({ path: join(SCREENSHOTS_DIR, '04b-driver-detail-scroll.png') });

      // Video section
      await page.evaluate(() => {
        const modal = document.querySelector('[style*="overflow: auto"]');
        if (modal) modal.scrollTop = modal.scrollHeight;
      });
      await delay(200);
      await page.screenshot({ path: join(SCREENSHOTS_DIR, '04c-driver-video-section.png') });

      await page.click('button:has-text("×")');
      await delay(200);
    }

    // 5. Employers List
    console.log('5. Capturing Employers list...');
    await page.goto(`${BASE_URL}/admin/employers`);
    await page.waitForLoadState('networkidle');
    await delay(500);
    await page.screenshot({ path: join(SCREENSHOTS_DIR, '05-employers-list.png') });

    // 6. Add Employer Modal
    console.log('6. Capturing Add Employer modal...');
    await page.click('button:has-text("+ Add Employer")');
    await delay(300);
    await page.screenshot({ path: join(SCREENSHOTS_DIR, '06-add-employer.png') });
    await page.click('button:has-text("x")');
    await delay(200);

    // 7. Requisitions List
    console.log('7. Capturing Requisitions list...');
    await page.goto(`${BASE_URL}/admin/requisitions`);
    await page.waitForLoadState('networkidle');
    await delay(500);
    await page.screenshot({ path: join(SCREENSHOTS_DIR, '07-requisitions-list.png') });

    // 8. Add Job Modal
    console.log('8. Capturing Add Job modal...');
    await page.click('button:has-text("+ Add Job")');
    await delay(300);
    await page.screenshot({ path: join(SCREENSHOTS_DIR, '08-add-job.png') });
    await page.click('button:has-text("×")');
    await delay(200);

    // 9. Job Detail Modal (if jobs exist)
    console.log('9. Capturing Job detail modal...');
    const jobViewButtons = await page.$$('button:has-text("View")');
    if (jobViewButtons.length > 0) {
      await jobViewButtons[0].click();
      await delay(300);
      await page.screenshot({ path: join(SCREENSHOTS_DIR, '09-job-detail.png') });

      // Show submit driver panel
      await page.click('button:has-text("+ Submit Driver")');
      await delay(200);
      await page.screenshot({ path: join(SCREENSHOTS_DIR, '09b-submit-driver.png') });

      await page.click('button:has-text("×")');
      await delay(200);
    }

    // 10. Submissions List
    console.log('10. Capturing Submissions list...');
    await page.goto(`${BASE_URL}/admin/submissions`);
    await page.waitForLoadState('networkidle');
    await delay(500);
    await page.screenshot({ path: join(SCREENSHOTS_DIR, '10-submissions-list.png') });

    // 11. Submission Detail (if any exist)
    console.log('11. Capturing Submission detail...');
    const subViewButtons = await page.$$('button:has-text("View")');
    if (subViewButtons.length > 0) {
      await subViewButtons[0].click();
      await delay(300);
      await page.screenshot({ path: join(SCREENSHOTS_DIR, '11-submission-detail.png') });
      await page.click('button:has-text("×")');
    }

    // 12. Driver Story Form (public)
    console.log('12. Capturing Driver Story Form...');
    // Use a sample UUID - this will show the form UI even if driver doesn't exist
    await page.goto(`${BASE_URL}/form/sample-uuid`);
    await page.waitForLoadState('networkidle');
    await delay(500);
    await page.screenshot({ path: join(SCREENSHOTS_DIR, '12-driver-form.png') });

    // 13. Video Recorder (public)
    console.log('13. Capturing Video Recorder...');
    await page.goto(`${BASE_URL}/record/sample-uuid`);
    await page.waitForLoadState('networkidle');
    await delay(500);
    await page.screenshot({ path: join(SCREENSHOTS_DIR, '13-video-recorder.png') });

    console.log('\nScreenshot capture complete!');
    console.log(`Screenshots saved to: ${SCREENSHOTS_DIR}`);

  } catch (error) {
    console.error('Error capturing screenshots:', error);
  } finally {
    await browser.close();
  }
}

captureScreenshots();
