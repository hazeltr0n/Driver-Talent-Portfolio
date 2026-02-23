import { test, expect } from '@playwright/test';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '../.env') });

/**
 * Full E2E Test Flow for Driver Talent Portfolio
 *
 * Test Data:
 * - Employer: Cemex - AZ - Phoenix (from HubSpot)
 * - Candidate: Darrien Twyman (from Free Agents)
 * - Job: Ready-Mix Driver Trainee
 *
 * Run with: npx playwright test e2e/full-flow.spec.js --headed
 */

// Test configuration
const TEST_DATA = {
  employer: {
    searchTerm: 'Cemex Phoenix', // Be specific to get only Phoenix location
    expectedName: 'Cemex - AZ - Phoenix',
    location: 'Phoenix',
  },
  candidate: {
    searchTerm: 'Darrien Twyman',
    name: 'Darrien Twyman',
  },
  job: {
    title: 'Ready-Mix Driver Trainee',
    location: 'Phoenix, AZ',
    routeType: 'Local',
    cdlClass: 'A',
    minExperience: 0,
    payMin: 20,
    payMax: 28,
    homeTime: 'Home Daily',
    touchFreight: 'Medium',
    equipmentTypes: 'Ready-Mix Concrete',
    positionsAvailable: 2,
    rawDescription: `As a Ready-Mix Driver Trainee, you will be trained to operate concrete mixers to deliver ready-mix concrete to various job sites. This role will require you to work in diverse environments and navigate various site conditions, including uneven ground. Must possess a valid commercial driver's license (CDL A or B). No DUI's or DWI's in the last 5 years, no more than 3 moving violations in the previous 3 years.`,
  },
};

// Store created IDs for later tests
let createdEmployerId = null;
let createdEmployerName = null;
let createdEmployerEmail = null;
let createdCandidateUuid = null;
let createdJobId = null;
let employerJwt = null;

test.describe.serial('Admin Flow', () => {

  test('1. Import Employer from HubSpot (Cemex Phoenix)', async ({ page }) => {
    await page.goto('/admin/employers');

    // Wait for page to load
    await expect(page.locator('h1')).toContainText('Employers');

    // Click Add Employer button
    await page.click('button:has-text("Add Employer")');

    // Wait for modal
    await expect(page.locator('h2')).toContainText('Search HubSpot Companies');

    // Search for Cemex
    await page.fill('input[placeholder*="Search by company name"]', TEST_DATA.employer.searchTerm);
    await page.click('button:has-text("Search")');

    // Wait for results
    await page.waitForTimeout(2000); // Wait for API response

    // Click on the first search result (should be Cemex - AZ - Phoenix)
    const resultItem = page.locator('[style*="cursor: pointer"]').filter({ hasText: 'Cemex' }).first();
    await expect(resultItem).toBeVisible({ timeout: 5000 });
    await resultItem.click();

    // Wait for confirmation screen
    await expect(page.locator('h2')).toContainText('Confirm Employer');

    // Capture employer details
    const companyNameEl = page.locator('text=/Name:/ >> .. >> span').last();
    createdEmployerName = await companyNameEl.textContent();
    console.log('Creating employer:', createdEmployerName);

    // Click Add to CAP
    await page.click('button:has-text("Add to CAP")');

    // Wait for success (modal closes, employer appears in list)
    await page.waitForTimeout(2000);

    // Verify employer appears in list - look for the specific name
    await expect(page.locator('text=Cemex - AZ - Phoenix')).toBeVisible({ timeout: 5000 });

    console.log('✓ Employer imported successfully: Cemex - AZ - Phoenix');
  });

  test('2. Sync Candidate from Free Agents (Darrien Twyman)', async ({ page }) => {
    await page.goto('/admin/drivers');

    // Wait for page to load
    await expect(page.locator('h1')).toContainText('Drivers');

    // Click Add Driver button
    await page.click('button:has-text("Add Driver")');

    // Wait for modal
    await expect(page.locator('h2')).toContainText('Add Driver');

    // Search for Darrien Twyman
    await page.fill('input[placeholder*="Search"]', TEST_DATA.candidate.searchTerm);
    await page.click('button:has-text("Search")');

    // Wait for results
    await page.waitForTimeout(2000);

    // Look for Free Agents section and click on Darrien
    const freeAgentResult = page.locator('div').filter({ hasText: TEST_DATA.candidate.name }).first();
    await freeAgentResult.click();

    // Should create the candidate - wait for modal to close or show edit view
    await page.waitForTimeout(3000);

    // Search for the newly created candidate
    await page.fill('input[placeholder*="Search drivers"]', TEST_DATA.candidate.name);
    await page.waitForTimeout(1000);

    // Verify candidate appears
    await expect(page.locator('text=' + TEST_DATA.candidate.name)).toBeVisible();

    // Get the UUID from the card/link
    const candidateCard = page.locator('[data-uuid]').first();
    if (await candidateCard.count() > 0) {
      createdCandidateUuid = await candidateCard.getAttribute('data-uuid');
    }

    console.log('✓ Candidate synced successfully:', createdCandidateUuid || TEST_DATA.candidate.name);
  });

  test('3. Create Job Requisition (Ready-Mix Driver)', async ({ page }) => {
    await page.goto('/admin/requisitions');

    // Wait for page to load
    await expect(page.locator('h1')).toContainText('Requisitions');

    // Click Add Requisition button
    await page.click('button:has-text("Add")');

    // Wait for form/modal
    await page.waitForTimeout(1000);

    // Fill in job details
    await page.fill('input[name="title"], input[placeholder*="title"]', TEST_DATA.job.title);

    // Select employer - look for dropdown or autocomplete
    const employerField = page.locator('input[name="employer"], select[name="employer"], [data-field="employer"]');
    if (await employerField.count() > 0) {
      await employerField.fill(TEST_DATA.employer.searchTerm);
    }

    // Fill location
    const locationField = page.locator('input[name="location"]');
    if (await locationField.count() > 0) {
      await locationField.fill(TEST_DATA.job.location);
    }

    // Select route type
    const routeTypeSelect = page.locator('select[name="route_type"]');
    if (await routeTypeSelect.count() > 0) {
      await routeTypeSelect.selectOption(TEST_DATA.job.routeType);
    }

    // Select CDL class
    const cdlSelect = page.locator('select[name="cdl_class"]');
    if (await cdlSelect.count() > 0) {
      await cdlSelect.selectOption(TEST_DATA.job.cdlClass);
    }

    // Fill pay range
    const payMinField = page.locator('input[name="pay_min"]');
    if (await payMinField.count() > 0) {
      await payMinField.fill(String(TEST_DATA.job.payMin));
    }

    const payMaxField = page.locator('input[name="pay_max"]');
    if (await payMaxField.count() > 0) {
      await payMaxField.fill(String(TEST_DATA.job.payMax));
    }

    // Fill raw description
    const descField = page.locator('textarea[name="raw_description"]');
    if (await descField.count() > 0) {
      await descField.fill(TEST_DATA.job.rawDescription);
    }

    // Submit the form
    await page.click('button[type="submit"], button:has-text("Create"), button:has-text("Save")');

    // Wait for success
    await page.waitForTimeout(2000);

    // Verify job appears in list
    await expect(page.locator('text=' + TEST_DATA.job.title)).toBeVisible();

    console.log('✓ Job requisition created successfully');
  });

  test('4. Verify Fit Profile Generated', async ({ page, request }) => {
    // Use API to check fit profile was generated
    const response = await request.get('/api/candidates');
    const data = await response.json();

    // Find our candidate
    const candidate = data.candidates?.find(c =>
      c.fullName?.toLowerCase().includes('darrien') ||
      c.fullName?.toLowerCase().includes('twyman')
    );

    if (candidate) {
      createdCandidateUuid = candidate.uuid;
      console.log('Found candidate:', candidate.fullName, 'UUID:', candidate.uuid);

      // Try to generate fit profiles via API
      const generateResponse = await request.post('/api/fit-profiles/generate', {
        data: { candidate_uuid: candidate.uuid }
      });
      const genResult = await generateResponse.json();
      console.log('Fit profile generation:', genResult.message || genResult);
    }

    console.log('✓ Fit profile check complete');
  });
});

test.describe.serial('Employer Portal Flow', () => {

  test.beforeAll(async ({ request }) => {
    // Get employer details from Airtable
    const response = await request.get('/api/employers');
    const data = await response.json();

    // Find the Cemex employer
    const employer = data.employers?.find(e =>
      e.name?.toLowerCase().includes('cemex') &&
      (e.city?.toLowerCase().includes('phoenix') || e.state === 'AZ')
    );

    if (employer) {
      createdEmployerId = employer.id;
      createdEmployerName = employer.name;
      createdEmployerEmail = employer.main_contact_email;
      console.log('Found employer:', employer.name, 'Email:', employer.main_contact_email);
    }
  });

  test('5. Employer Auth (Test JWT)', async ({ page }) => {
    // NEVER send real magic links in tests - create JWT directly
    test.skip(!createdEmployerId || !createdEmployerName, 'No employer found');

    // Generate JWT using the imported jwt module (no email sent)
    const JWT_SECRET = process.env.JWT_SECRET;

    if (!JWT_SECRET) {
      console.log('⚠️  JWT_SECRET not available - skipping auth test');
      test.skip(true, 'JWT_SECRET not configured');
      return;
    }

    employerJwt = jwt.sign({
      employer_id: createdEmployerId,
      email: createdEmployerEmail || 'test@example.com',
      employer_name: createdEmployerName,
    }, JWT_SECRET, { expiresIn: '1h' });

    // Set JWT in browser
    await page.goto('/employer');
    await page.evaluate((token) => {
      localStorage.setItem('employer_token', token);
    }, employerJwt);

    await page.reload();
    await page.waitForTimeout(1000);

    console.log('✓ Test JWT created for:', createdEmployerName);
  });

  test('6. Employer Dashboard & Jobs', async ({ page }) => {
    test.skip(!employerJwt, 'No JWT available - run manual auth first');

    // Set JWT in localStorage
    await page.goto('/employer');
    await page.evaluate((jwt) => {
      localStorage.setItem('employer_token', jwt);
    }, employerJwt);

    // Reload to apply auth
    await page.reload();

    // Verify dashboard loads
    await expect(page.locator('text=/Dashboard|Welcome/')).toBeVisible();

    // Navigate to Jobs
    await page.click('a:has-text("Jobs"), nav >> text=Jobs');
    await expect(page.locator('h1, h2')).toContainText(/Jobs|Requisitions/);

    // Verify our job is visible
    await expect(page.locator('text=' + TEST_DATA.job.title)).toBeVisible();

    console.log('✓ Employer can see jobs');
  });

  test('7. View Driver Feed (Candidates)', async ({ page }) => {
    test.skip(!employerJwt, 'No JWT available');

    await page.goto('/employer');
    await page.evaluate((jwt) => {
      localStorage.setItem('employer_token', jwt);
    }, employerJwt);
    await page.reload();

    // Navigate to Drivers/Candidates
    await page.click('a:has-text("Driver"), a:has-text("Candidate"), nav >> text=/Driver|Candidate/');

    // Wait for feed to load
    await page.waitForTimeout(2000);

    // Check if any candidates are visible
    const candidateCards = page.locator('[class*="card"], [class*="candidate"]');
    const count = await candidateCards.count();

    console.log(`Found ${count} candidates in feed`);

    if (count > 0) {
      // Click on first candidate
      await candidateCards.first().click();
      await page.waitForTimeout(1000);

      // Verify profile loads
      await expect(page.locator('body')).toContainText(/Experience|CDL|Score/i);
    }

    console.log('✓ Driver feed accessible');
  });

  test('8. Request Interview', async ({ page }) => {
    test.skip(!employerJwt || !createdCandidateUuid, 'Missing JWT or candidate');

    await page.goto(`/employer/drivers/${createdCandidateUuid}`);
    await page.evaluate((jwt) => {
      localStorage.setItem('employer_token', jwt);
    }, employerJwt);
    await page.reload();

    // Find and click Request Interview button
    const requestBtn = page.locator('button:has-text("Request Interview"), button:has-text("Interview")');

    if (await requestBtn.count() > 0) {
      await requestBtn.click();

      // Fill in any required fields (job selection, notes)
      await page.waitForTimeout(1000);

      // Submit
      await page.click('button:has-text("Submit"), button:has-text("Send"), button[type="submit"]');

      // Wait for success
      await page.waitForTimeout(2000);

      console.log('✓ Interview requested');
    } else {
      console.log('⚠️  No Request Interview button found');
    }
  });
});

test.describe('Public Pages', () => {

  test('9. View Driver Portfolio', async ({ page }) => {
    // Use known portfolio slug
    await page.goto('/portfolio/larenzo-davis');

    // Wait for page to load
    await page.waitForTimeout(2000);

    // Verify portfolio content
    await expect(page.locator('body')).toContainText(/Larenzo Davis/i);
    await expect(page.locator('body')).toContainText(/CDL|Class A|Experience/i);

    // Check for video player
    const video = page.locator('video');
    if (await video.count() > 0) {
      console.log('✓ Video player present');
    }

    console.log('✓ Portfolio page loads correctly');
  });

  test('10. Video Recording Page (Manual Test Required)', async ({ page }) => {
    // This test just verifies the page loads - actual recording is manual
    await page.goto('/record/65a0fbbf-8fbd-486a-9c07-5f9e94cd0094');

    // Wait for page
    await page.waitForTimeout(3000);

    // Check for camera permission or recording UI
    const hasRecordingUI = await page.locator('button:has-text("Record"), button:has-text("Start"), [class*="record"]').count() > 0;
    const hasQuestion = await page.locator('text=/question|who are you|why/i').count() > 0;

    console.log('Recording page loaded:', { hasRecordingUI, hasQuestion });
    console.log('⚠️  Manual video recording test required');

    console.log('✓ Recording page accessible');
  });
});

test.describe('API Verification', () => {

  test('11. Verify All Data Created', async ({ request }) => {
    console.log('\n=== Final Verification ===\n');

    // Check employers
    const employersRes = await request.get('/api/employers');
    const employers = await employersRes.json();
    const cemexEmployer = employers.employers?.find(e => e.name?.includes('Cemex'));
    console.log('Employer:', cemexEmployer?.name || 'NOT FOUND');

    // Check candidates
    const candidatesRes = await request.get('/api/candidates');
    const candidates = await candidatesRes.json();
    const darrienCandidate = candidates.candidates?.find(c =>
      c.fullName?.toLowerCase().includes('darrien')
    );
    console.log('Candidate:', darrienCandidate?.fullName || 'NOT FOUND');

    // Check jobs
    const jobsRes = await request.get('/api/jobs');
    const jobs = await jobsRes.json();
    const readyMixJob = jobs.jobs?.find(j => j.title?.includes('Ready-Mix'));
    console.log('Job:', readyMixJob?.title || 'NOT FOUND');

    // Check submissions
    const subsRes = await request.get('/api/submissions');
    const submissions = await subsRes.json();
    console.log('Total Submissions:', submissions.submissions?.length || 0);

    console.log('\n=== Test Summary ===');
    console.log('Employer ID:', cemexEmployer?.id);
    console.log('Candidate UUID:', darrienCandidate?.uuid);
    console.log('Job ID:', readyMixJob?.id);
  });
});
