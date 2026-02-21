#!/usr/bin/env node
/**
 * Create Driver Portfolio
 *
 * Usage (via Claude Code):
 * "Create a portfolio for Larenzo Davis with these files:
 *  - Tenstreet: ~/Downloads/Larenzo_Davis.pdf
 *  - MVR: ~/Downloads/MVR.pdf
 *  - PSP: ~/Downloads/PSP.pdf
 *  - Training school: TruckGod Training, graduated January 2025"
 *
 * This script:
 * 1. Parses PDFs with OpenAI
 * 2. Creates/updates Airtable record
 * 3. Generates AI recruiter notes
 * 4. Returns portfolio URL
 */

import 'dotenv/config';
import {
  extractTextFromPDF,
  parseTenstreetApplication,
  parseMVR,
  parsePSP,
  parseClearinghouse,
  generateRecruiterNotes,
  generateNarrative,
} from './lib/openai.js';
import {
  upsertCandidate,
  generateSlug,
} from './lib/airtable.js';

async function createDriver({
  tenstreetPdf,
  mvrPdf,
  pspPdf,
  clearinghousePdf,
  trainingSchool,
  trainingGraduated,
  trainingHours = 160,
}) {
  console.log('Starting driver portfolio creation...\n');

  // Step 1: Parse PDFs
  let driverData = {};
  let mvrData = {};
  let pspData = {};
  let clearinghouseData = {};

  if (tenstreetPdf) {
    console.log('Parsing Tenstreet application...');
    const text = await extractTextFromPDF(tenstreetPdf);
    driverData = await parseTenstreetApplication(text);
    console.log(`  Found: ${driverData.fullName}`);
  }

  if (mvrPdf) {
    console.log('Parsing MVR...');
    const text = await extractTextFromPDF(mvrPdf);
    mvrData = await parseMVR(text);
    console.log(`  Status: ${mvrData.mvr_status}`);
  }

  if (pspPdf) {
    console.log('Parsing PSP...');
    const text = await extractTextFromPDF(pspPdf);
    pspData = await parsePSP(text);
    console.log(`  Crashes: ${pspData.psp_crashes_5yr}, Inspections: ${pspData.psp_inspections_3yr}`);
  }

  if (clearinghousePdf) {
    console.log('Parsing Clearinghouse...');
    const text = await extractTextFromPDF(clearinghousePdf);
    clearinghouseData = await parseClearinghouse(text);
    console.log(`  Status: ${clearinghouseData.clearinghouse_status}`);
  }

  // Step 2: Combine all data
  const fullName = driverData.fullName || 'Unknown Driver';
  const slug = generateSlug(fullName);

  const combinedData = {
    fullName,
    firstName: driverData.firstName,
    lastName: driverData.lastName,
    email: driverData.email,
    phone: driverData.phone,
    city: driverData.city,
    state: driverData.state,
    cdl_class: driverData.cdl_class,
    endorsements: driverData.endorsements,
    years_experience: driverData.years_experience,
    license_number: driverData.license_number,
    license_state: driverData.license_state,
    license_expiration: driverData.license_expiration,
    employment_history: JSON.stringify(driverData.employment_history || []),
    equipment_experience: JSON.stringify(driverData.equipment_experience || []),
    training_school: trainingSchool,
    training_graduated: trainingGraduated,
    training_hours: trainingHours,
    ...mvrData,
    ...pspData,
    ...clearinghouseData,
    portfolio_slug: slug,
    portfolio_published: true,
  };

  // Step 3: Generate AI content
  console.log('\nGenerating AI recruiter notes...');
  const recruiterNotes = await generateRecruiterNotes(combinedData);
  combinedData.ai_recruiter_notes = recruiterNotes;

  console.log('Generating driver narrative...');
  const narrative = await generateNarrative(combinedData, null);
  combinedData.ai_narrative = narrative;

  // Step 4: Save to Airtable
  console.log('\nSaving to Airtable...');
  const record = await upsertCandidate(fullName, combinedData);

  // Step 5: Generate output
  const baseUrl = process.env.VERCEL_URL || 'https://driver-talent-portfolio.vercel.app';
  const portfolioUrl = `${baseUrl}/portfolio/${slug}`;

  console.log('\n' + '='.repeat(60));
  console.log('Driver Portfolio Created Successfully!');
  console.log('='.repeat(60));
  console.log(`\nDriver: ${fullName}`);
  console.log(`Portfolio URL: ${portfolioUrl}`);
  console.log(`\nAirtable Record ID: ${record.id}`);
  console.log('\nNext steps:');
  console.log('1. Send driver the Airtable form to complete their story');
  console.log('2. Review and verify the portfolio at the URL above');
  console.log('3. Share with recruiters');

  return {
    portfolioUrl,
    recordId: record.id,
    slug,
    fullName,
  };
}

// Export for use as a module
export { createDriver };

// CLI usage
if (process.argv[1].includes('create-driver')) {
  // Example usage - in practice, Claude Code will call createDriver() directly
  console.log('Usage: Import and call createDriver() from Claude Code');
  console.log('\nExample:');
  console.log(`
import { createDriver } from './scripts/create-driver.js';

await createDriver({
  tenstreetPdf: '~/Downloads/Larenzo_Davis.pdf',
  mvrPdf: '~/Downloads/MVR.pdf',
  pspPdf: '~/Downloads/PSP.pdf',
  clearinghousePdf: '~/Downloads/clearinghouse.pdf',
  trainingSchool: 'TruckGod Training',
  trainingGraduated: 'January 2025',
  trainingHours: 160,
});
`);
}
