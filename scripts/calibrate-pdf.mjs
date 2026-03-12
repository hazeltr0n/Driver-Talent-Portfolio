#!/usr/bin/env node
// Calibrate PDF layout to fill the page exactly
import { chromium } from 'playwright';

const URL = 'http://localhost:3002/portfolio/emmanuel-martinez?pdf=true&submission=rec3oSuvP1yw7mvEY';

// Letter page dimensions in pixels at 96 DPI with 0.3in margins
const PAGE_WIDTH_IN = 8.5;
const PAGE_HEIGHT_IN = 11;
const MARGIN_IN = 0.3;
const DPI = 96;

const PAGE_HEIGHT = PAGE_HEIGHT_IN * DPI; // 1056px
const CONTENT_HEIGHT = (PAGE_HEIGHT_IN - MARGIN_IN * 2) * DPI; // ~998px available
const CONTENT_WIDTH = (PAGE_WIDTH_IN - MARGIN_IN * 2) * DPI; // ~758px available

async function measure() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.setViewportSize({ width: 816, height: 1056 });

  await page.goto(URL, { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(1000);

  // Measure the actual content height
  const contentHeight = await page.evaluate(() => {
    return document.body.scrollHeight;
  });

  console.log('=== PDF Calibration ===');
  console.log(`Letter page: ${PAGE_HEIGHT_IN}" x ${PAGE_WIDTH_IN}" @ ${DPI} DPI`);
  console.log(`Page height: ${PAGE_HEIGHT}px`);
  console.log(`Content area (after margins): ${CONTENT_HEIGHT}px`);
  console.log(`Actual content height: ${contentHeight}px`);
  console.log(`Gap at bottom: ${CONTENT_HEIGHT - contentHeight}px`);

  if (contentHeight < CONTENT_HEIGHT) {
    const extraSpacePerSection = Math.floor((CONTENT_HEIGHT - contentHeight) / 10);
    console.log(`\nNeed to ADD ~${extraSpacePerSection}px per section to fill page`);
  } else {
    console.log(`\nContent OVERFLOWS by ${contentHeight - CONTENT_HEIGHT}px - need to reduce`);
  }

  // Take a screenshot to visualize
  await page.screenshot({ path: '/tmp/pdf-preview.png', fullPage: true });
  console.log('\nScreenshot saved to /tmp/pdf-preview.png');

  await browser.close();
  return { contentHeight, gap: CONTENT_HEIGHT - contentHeight };
}

measure().catch(console.error);
