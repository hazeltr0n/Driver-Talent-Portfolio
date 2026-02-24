#!/usr/bin/env node

// Add FitKit assessment fields to Airtable Candidates table

import 'dotenv/config';

const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY;
const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID;
const CANDIDATES_TABLE_ID = process.env.AIRTABLE_CANDIDATES_TABLE_ID;

if (!AIRTABLE_API_KEY || !AIRTABLE_BASE_ID || !CANDIDATES_TABLE_ID) {
  console.error('Missing required environment variables. Check your .env file.');
  process.exit(1);
}

const FITKIT_FIELDS = [
  // Assessment Status
  { name: 'fitkit_started_at', type: 'dateTime', options: { timeZone: 'utc', dateFormat: { name: 'iso' }, timeFormat: { name: '24hour' } } },
  { name: 'fitkit_stage1_completed_at', type: 'dateTime', options: { timeZone: 'utc', dateFormat: { name: 'iso' }, timeFormat: { name: '24hour' } } },
  { name: 'fitkit_stage2_completed_at', type: 'dateTime', options: { timeZone: 'utc', dateFormat: { name: 'iso' }, timeFormat: { name: '24hour' } } },

  // Stage 1 RIASEC scores
  { name: 'fitkit_riasec_r', type: 'number', options: { precision: 0 } },
  { name: 'fitkit_riasec_i', type: 'number', options: { precision: 0 } },
  { name: 'fitkit_riasec_a', type: 'number', options: { precision: 0 } },
  { name: 'fitkit_riasec_s', type: 'number', options: { precision: 0 } },
  { name: 'fitkit_riasec_e', type: 'number', options: { precision: 0 } },
  { name: 'fitkit_riasec_c', type: 'number', options: { precision: 0 } },
  { name: 'fitkit_riasec_code', type: 'singleLineText' },

  // Stage 1 Results
  { name: 'fitkit_work_values', type: 'multilineText' },
  { name: 'fitkit_top_careers', type: 'multilineText' },
  { name: 'fitkit_trucking_gate_passed', type: 'checkbox', options: { icon: 'check', color: 'greenBright' } },

  // Stage 2 Facet scores
  { name: 'fitkit_facet_empathy', type: 'number', options: { precision: 0 } },
  { name: 'fitkit_facet_anxiety', type: 'number', options: { precision: 0 } },
  { name: 'fitkit_facet_excitement', type: 'number', options: { precision: 0 } },
  { name: 'fitkit_facet_discipline', type: 'number', options: { precision: 0 } },
  { name: 'fitkit_facet_immoderation', type: 'number', options: { precision: 0 } },
  { name: 'fitkit_facet_dutifulness', type: 'number', options: { precision: 0 } },
  { name: 'fitkit_grit_total', type: 'number', options: { precision: 0 } },

  // Stage 2 Results
  { name: 'fitkit_trucking_fit_score', type: 'number', options: { precision: 0 } },
  { name: 'fitkit_retention_risk', type: 'singleSelect', options: { choices: [
    { name: 'Low', color: 'greenLight2' },
    { name: 'Medium', color: 'yellowLight2' },
    { name: 'High', color: 'redLight2' },
  ]}},
  { name: 'fitkit_best_vertical', type: 'singleLineText' },
  { name: 'fitkit_coaching_notes', type: 'multilineText' },

  // Raw responses (for validation/debugging)
  { name: 'fitkit_stage1_responses', type: 'multilineText' },
  { name: 'fitkit_stage2_responses', type: 'multilineText' },
];

async function addField(field) {
  const url = `https://api.airtable.com/v0/meta/bases/${AIRTABLE_BASE_ID}/tables/${CANDIDATES_TABLE_ID}/fields`;

  const body = {
    name: field.name,
    type: field.type,
  };

  if (field.options && Object.keys(field.options).length > 0) {
    body.options = field.options;
  }

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${AIRTABLE_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  const data = await response.json();

  if (!response.ok) {
    if (data.error?.type === 'DUPLICATE_FIELD_NAME') {
      console.log(`  ✓ ${field.name} (already exists)`);
      return { success: true, exists: true };
    }
    console.error(`  ✗ ${field.name}: ${data.error?.message || JSON.stringify(data)}`);
    return { success: false, error: data.error };
  }

  console.log(`  ✓ ${field.name} (created)`);
  return { success: true, created: true };
}

async function main() {
  console.log('Adding FitKit fields to Candidates table...\n');

  let created = 0;
  let existed = 0;
  let failed = 0;

  for (const field of FITKIT_FIELDS) {
    const result = await addField(field);
    if (result.created) created++;
    else if (result.exists) existed++;
    else failed++;

    // Small delay to avoid rate limiting
    await new Promise(r => setTimeout(r, 200));
  }

  console.log(`\nDone! Created: ${created}, Already existed: ${existed}, Failed: ${failed}`);
}

main().catch(console.error);
