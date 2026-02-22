#!/usr/bin/env node

// Add missing fields to Airtable Candidates table

import 'dotenv/config';

const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY;
const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID;
const CANDIDATES_TABLE_ID = process.env.AIRTABLE_CANDIDATES_TABLE_ID;

if (!AIRTABLE_API_KEY || !AIRTABLE_BASE_ID || !CANDIDATES_TABLE_ID) {
  console.error('Missing required environment variables. Check your .env file.');
  process.exit(1);
}

const FIELDS_TO_ADD = [
  // Preferences
  { name: 'shift_preference', type: 'singleSelect', options: { choices: [
    { name: 'Days' }, { name: 'Nights' }, { name: 'No Preference' }
  ]}},
  { name: 'willing_overtime', type: 'singleSelect', options: { choices: [
    { name: 'Yes' }, { name: 'Sometimes' }, { name: 'No' }
  ]}},
  { name: 'max_commute_miles', type: 'singleSelect', options: { choices: [
    { name: '25 miles' }, { name: '50 miles' }, { name: '75 miles' }, { name: '100+ miles' }
  ]}},
  { name: 'willing_touch_freight', type: 'singleSelect', options: { choices: [
    { name: 'Very Light (No-Touch Freight)' }, { name: 'Light (Pallet Jack)' },
    { name: 'Medium (Dolly/Liftgate)' }, { name: 'Heavy (Very Physical Work)' }
  ]}},
  { name: 'home_time_preference', type: 'singleSelect', options: { choices: [
    { name: 'Daily' }, { name: 'Weekly' }, { name: 'OTR' }, { name: 'Flexible' }
  ]}},
  { name: 'min_weekly_pay', type: 'number', options: { precision: 0 } },
  { name: 'target_weekly_pay', type: 'number', options: { precision: 0 } },

  // Compliance/Safety
  { name: 'mvr_status', type: 'singleSelect', options: { choices: [
    { name: 'Clear' }, { name: 'Has Violations' }
  ]}},
  { name: 'mvr_violations_3yr', type: 'number', options: { precision: 0 } },
  { name: 'mvr_accidents_3yr', type: 'number', options: { precision: 0 } },
  { name: 'clearinghouse_status', type: 'singleSelect', options: { choices: [
    { name: 'Not Prohibited' }, { name: 'Prohibited' }
  ]}},
  { name: 'psp_crashes_5yr', type: 'number', options: { precision: 0 } },
  { name: 'psp_inspections_3yr', type: 'number', options: { precision: 0 } },
  { name: 'psp_driver_oos', type: 'number', options: { precision: 0 } },

  // JSON data fields (stored as long text)
  { name: 'employment_history', type: 'multilineText' },
  { name: 'equipment_experience', type: 'multilineText' },

  // AI Generated
  { name: 'ai_recruiter_notes', type: 'multilineText' },
  { name: 'ai_narrative', type: 'multilineText' },
  { name: 'ai_pull_quote', type: 'multilineText' },

  // Status
  { name: 'placement_status', type: 'singleSelect', options: { choices: [
    { name: 'Working and Looking' },
    { name: 'Unemployed and Looking' },
    { name: 'Inactive - Lost Contact' },
    { name: 'Inactive - Happy with Job' },
    { name: 'Active - Placed with Client' },
  ]}},

  // Video
  { name: 'video_status', type: 'singleLineText' },
  { name: 'video_url', type: 'url' },
  { name: 'video_clips', type: 'multilineText' },

  // Story fields
  { name: 'story_who_are_you', type: 'multilineText' },
  { name: 'story_what_is_your_why', type: 'multilineText' },
  { name: 'story_freeworld_journey', type: 'multilineText' },
  { name: 'story_why_trucking', type: 'multilineText' },
  { name: 'story_looking_for', type: 'multilineText' },
  { name: 'story_what_others_say', type: 'multilineText' },
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
  console.log('Adding fields to Candidates table...\n');

  let created = 0;
  let existed = 0;
  let failed = 0;

  for (const field of FIELDS_TO_ADD) {
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
