#!/usr/bin/env node
import 'dotenv/config';

// Fix Airtable field options to match code expectations

const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY;
const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID;
const CANDIDATES_TABLE_ID = process.env.AIRTABLE_CANDIDATES_TABLE_ID;

if (!AIRTABLE_API_KEY || !AIRTABLE_BASE_ID || !CANDIDATES_TABLE_ID) {
  console.error('Missing required environment variables. Check your .env file.');
  process.exit(1);
}

async function updateField(fieldId, options) {
  const url = `https://api.airtable.com/v0/meta/bases/${AIRTABLE_BASE_ID}/tables/${CANDIDATES_TABLE_ID}/fields/${fieldId}`;

  const response = await fetch(url, {
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${AIRTABLE_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(options),
  });

  const data = await response.json();
  return { ok: response.ok, data };
}

async function getFields() {
  const url = `https://api.airtable.com/v0/meta/bases/${AIRTABLE_BASE_ID}/tables/${CANDIDATES_TABLE_ID}`;
  const response = await fetch(url, {
    headers: { 'Authorization': `Bearer ${AIRTABLE_API_KEY}` },
  });
  const data = await response.json();
  return data.fields;
}

async function main() {
  console.log('Fetching current fields...');
  const fields = await getFields();

  // Find fields that need updating
  const clearinghouseField = fields.find(f => f.name === 'clearinghouse_status');
  const placementField = fields.find(f => f.name === 'placement_status');
  const homeTimeField = fields.find(f => f.name === 'home_time_preference');

  // Update clearinghouse_status to use "Not Prohibited/Prohibited"
  if (clearinghouseField) {
    console.log('\nUpdating clearinghouse_status...');
    const result = await updateField(clearinghouseField.id, {
      options: {
        choices: [
          { name: 'Not Prohibited' },
          { name: 'Prohibited' },
        ],
      },
    });
    console.log(result.ok ? '  ✓ Updated' : `  ✗ Failed: ${JSON.stringify(result.data)}`);
  }

  // Update placement_status to match code
  if (placementField) {
    console.log('\nUpdating placement_status...');
    const result = await updateField(placementField.id, {
      options: {
        choices: [
          { name: 'Working and Looking' },
          { name: 'Unemployed and Looking' },
          { name: 'Inactive - Lost Contact' },
          { name: 'Inactive - Happy with Job' },
          { name: 'Active - Placed with Client' },
        ],
      },
    });
    console.log(result.ok ? '  ✓ Updated' : `  ✗ Failed: ${JSON.stringify(result.data)}`);
  }

  // Update home_time_preference to match code
  if (homeTimeField) {
    console.log('\nUpdating home_time_preference...');
    const result = await updateField(homeTimeField.id, {
      options: {
        choices: [
          { name: 'Daily' },
          { name: 'Weekly' },
          { name: 'Bi-weekly' },
          { name: 'Flexible' },
        ],
      },
    });
    console.log(result.ok ? '  ✓ Updated' : `  ✗ Failed: ${JSON.stringify(result.data)}`);
  }

  console.log('\nDone!');
}

main().catch(console.error);
