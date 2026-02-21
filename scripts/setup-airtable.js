#!/usr/bin/env node
/**
 * Setup Airtable Schema
 * Creates required fields in Candidates table and creates Job Requisitions table
 */

import 'dotenv/config';

const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY;
const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID;
const CANDIDATES_TABLE_ID = process.env.AIRTABLE_CANDIDATES_TABLE_ID;

const META_API_URL = `https://api.airtable.com/v0/meta/bases/${AIRTABLE_BASE_ID}`;

async function airtableMeta(endpoint, options = {}) {
  const response = await fetch(`${META_API_URL}${endpoint}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${AIRTABLE_API_KEY}`,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  const data = await response.json();

  if (!response.ok) {
    console.error('API Error:', JSON.stringify(data, null, 2));
    throw new Error(`Airtable API error ${response.status}: ${data.error?.message || 'Unknown error'}`);
  }

  return data;
}

async function getExistingFields(tableId) {
  const data = await airtableMeta('/tables');
  const table = data.tables.find(t => t.id === tableId);
  if (!table) throw new Error(`Table ${tableId} not found`);
  return table.fields.map(f => f.name);
}

async function createField(tableId, fieldConfig) {
  return airtableMeta(`/tables/${tableId}/fields`, {
    method: 'POST',
    body: JSON.stringify(fieldConfig),
  });
}

async function createTable(tableConfig) {
  return airtableMeta('/tables', {
    method: 'POST',
    body: JSON.stringify(tableConfig),
  });
}

// Fields to add to Candidates table
const candidateFields = [
  // Core Info
  { name: 'cdl_class', type: 'singleSelect', options: { choices: [{ name: 'A' }, { name: 'B' }] } },
  { name: 'years_experience', type: 'number', options: { precision: 1 } },
  { name: 'phone', type: 'phoneNumber' },
  { name: 'endorsements', type: 'singleLineText' },

  // License
  { name: 'license_number', type: 'singleLineText' },
  { name: 'license_state', type: 'singleLineText' },
  { name: 'license_expiration', type: 'date', options: { dateFormat: { name: 'iso' } } },
  { name: 'medical_card_status', type: 'singleSelect', options: { choices: [{ name: 'Valid' }, { name: 'Expired' }, { name: 'Pending' }] } },
  { name: 'medical_card_expiration', type: 'date', options: { dateFormat: { name: 'iso' } } },

  // Training
  { name: 'training_school', type: 'singleLineText' },
  { name: 'training_graduated', type: 'singleLineText' },
  { name: 'training_hours', type: 'number', options: { precision: 0 } },

  // Employment & Equipment (JSON)
  { name: 'employment_history', type: 'multilineText' },
  { name: 'equipment_experience', type: 'multilineText' },

  // Safety Records - MVR
  { name: 'mvr_status', type: 'singleSelect', options: { choices: [{ name: 'Clear' }, { name: 'Has Violations' }] } },
  { name: 'mvr_violations_3yr', type: 'number', options: { precision: 0 } },
  { name: 'mvr_accidents_3yr', type: 'number', options: { precision: 0 } },

  // Safety Records - PSP
  { name: 'psp_crashes_5yr', type: 'number', options: { precision: 0 } },
  { name: 'psp_inspections_3yr', type: 'number', options: { precision: 0 } },
  { name: 'psp_driver_oos', type: 'number', options: { precision: 0 } },

  // Clearinghouse
  { name: 'clearinghouse_status', type: 'singleSelect', options: { choices: [{ name: 'Not Prohibited' }, { name: 'Prohibited' }] } },

  // Story responses
  { name: 'story_who_are_you', type: 'multilineText' },
  { name: 'story_what_is_your_why', type: 'multilineText' },
  { name: 'story_freeworld_journey', type: 'multilineText' },
  { name: 'story_why_trucking', type: 'multilineText' },
  { name: 'story_looking_for', type: 'multilineText' },
  { name: 'story_what_others_say', type: 'multilineText' },
  { name: 'video_url', type: 'url' },

  // Preferences
  { name: 'home_time_preference', type: 'singleSelect', options: { choices: [{ name: 'Daily' }, { name: 'Weekly' }, { name: 'Bi-weekly' }, { name: 'Flexible' }] } },
  { name: 'available_days', type: 'multipleSelects', options: { choices: [{ name: 'Mon' }, { name: 'Tue' }, { name: 'Wed' }, { name: 'Thu' }, { name: 'Fri' }, { name: 'Sat' }, { name: 'Sun' }] } },
  { name: 'shift_preference', type: 'singleSelect', options: { choices: [{ name: 'Days' }, { name: 'Nights' }, { name: 'No Preference' }] } },
  { name: 'willing_overtime', type: 'singleSelect', options: { choices: [{ name: 'Yes' }, { name: 'Sometimes' }, { name: 'No' }] } },
  { name: 'min_weekly_pay', type: 'number', options: { precision: 0 } },
  { name: 'target_weekly_pay', type: 'number', options: { precision: 0 } },

  // AI Generated
  { name: 'ai_recruiter_notes', type: 'multilineText' },
  { name: 'ai_narrative', type: 'multilineText' },
  { name: 'ai_pull_quote', type: 'multilineText' },

  // Portfolio
  { name: 'portfolio_slug', type: 'singleLineText' },
  { name: 'portfolio_published', type: 'checkbox' },

  // Job Fit (JSON)
  { name: 'job_fit_data', type: 'multilineText' },
];

// Job Requisitions table config
const requisitionsTable = {
  name: 'Job Requisitions',
  fields: [
    { name: 'employer', type: 'singleLineText' },
    { name: 'location', type: 'singleLineText' },
    { name: 'title', type: 'singleLineText' },
    { name: 'route_type', type: 'singleSelect', options: { choices: [{ name: 'Local' }, { name: 'Regional' }, { name: 'OTR' }] } },
    { name: 'cdl_class', type: 'singleSelect', options: { choices: [{ name: 'A' }, { name: 'B' }] } },
    { name: 'min_experience_years', type: 'number', options: { precision: 0 } },
    { name: 'pay_min', type: 'number', options: { precision: 0 } },
    { name: 'pay_max', type: 'number', options: { precision: 0 } },
    { name: 'equipment_types', type: 'singleLineText' },
    { name: 'home_time', type: 'singleSelect', options: { choices: [{ name: 'Home Daily' }, { name: 'Home Weekly' }, { name: 'Home Bi-weekly' }, { name: 'Out 2-3 weeks' }] } },
    { name: 'max_mvr_violations', type: 'number', options: { precision: 0 } },
    { name: 'max_accidents', type: 'number', options: { precision: 0 } },
    { name: 'notes', type: 'multilineText' },
    { name: 'status', type: 'singleSelect', options: { choices: [{ name: 'Active' }, { name: 'Filled' }, { name: 'Closed' }] } },
    { name: 'created_at', type: 'dateTime', options: { dateFormat: { name: 'iso' }, timeFormat: { name: '24hour' }, timeZone: 'America/Chicago' } },
  ],
};

async function setupCandidateFields() {
  console.log('Fetching existing fields from Candidates table...');
  const existingFields = await getExistingFields(CANDIDATES_TABLE_ID);
  console.log(`Found ${existingFields.length} existing fields`);

  let created = 0;
  let skipped = 0;

  for (const field of candidateFields) {
    if (existingFields.includes(field.name)) {
      console.log(`  Skipping "${field.name}" (already exists)`);
      skipped++;
      continue;
    }

    try {
      console.log(`  Creating "${field.name}" (${field.type})...`);
      await createField(CANDIDATES_TABLE_ID, field);
      created++;
      // Small delay to avoid rate limiting
      await new Promise(r => setTimeout(r, 200));
    } catch (err) {
      console.error(`  Failed to create "${field.name}": ${err.message}`);
    }
  }

  console.log(`\nCandidates table: ${created} fields created, ${skipped} skipped`);
}

async function setupRequisitionsTable() {
  console.log('\nChecking for Job Requisitions table...');

  const data = await airtableMeta('/tables');
  const existing = data.tables.find(t => t.name === 'Job Requisitions');

  if (existing) {
    console.log('Job Requisitions table already exists');
    return existing;
  }

  console.log('Creating Job Requisitions table...');
  const table = await createTable(requisitionsTable);
  console.log(`Created table: ${table.name} (${table.id})`);
  return table;
}

async function main() {
  console.log('='.repeat(60));
  console.log('Airtable Schema Setup');
  console.log('='.repeat(60));
  console.log(`Base ID: ${AIRTABLE_BASE_ID}`);
  console.log(`Candidates Table ID: ${CANDIDATES_TABLE_ID}\n`);

  await setupCandidateFields();
  const reqTable = await setupRequisitionsTable();

  console.log('\n' + '='.repeat(60));
  console.log('Setup Complete!');
  console.log('='.repeat(60));
  console.log('\nJob Requisitions Table ID:', reqTable?.id || '(already existed)');
  console.log('\nYou can now:');
  console.log('1. Create driver portfolios with: node scripts/create-driver.js');
  console.log('2. Create job requisitions with: node scripts/create-requisition.js');
  console.log('3. Match drivers to jobs with: node scripts/match-driver.js');
}

main().catch(err => {
  console.error('Setup failed:', err.message);
  process.exit(1);
});
