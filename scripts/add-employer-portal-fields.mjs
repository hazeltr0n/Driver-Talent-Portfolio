#!/usr/bin/env node

// Add fields needed for Employer Portal to Airtable tables

import 'dotenv/config';

const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY;
const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID;
const EMPLOYERS_TABLE_ID = process.env.AIRTABLE_EMPLOYERS_TABLE_ID || 'tbl9bxGlAKtQfnPhY';
const SUBMISSIONS_TABLE = 'Job Submissions';

if (!AIRTABLE_API_KEY || !AIRTABLE_BASE_ID) {
  console.error('Missing required environment variables. Check your .env file.');
  process.exit(1);
}

// Fields to add to Employers table
const EMPLOYER_FIELDS = [
  { name: 'auth_token_hash', type: 'singleLineText' },
  { name: 'auth_token_expires', type: 'dateTime', options: { dateFormat: { name: 'iso' }, timeFormat: { name: '24hour' }, timeZone: 'utc' } },
  { name: 'last_login', type: 'dateTime', options: { dateFormat: { name: 'iso' }, timeFormat: { name: '24hour' }, timeZone: 'utc' } },
];

// Fields to add to Job Submissions table
const SUBMISSION_FIELDS = [
  { name: 'interview_notes', type: 'multilineText' },
  { name: 'rejection_explanation', type: 'multilineText' },
  { name: 'requested_by', type: 'singleSelect', options: { choices: [
    { name: 'Career Agent', color: 'blueLight2' },
    { name: 'Employer', color: 'greenLight2' },
  ]}},
  { name: 'employer_requested_at', type: 'dateTime', options: { dateFormat: { name: 'iso' }, timeFormat: { name: '24hour' }, timeZone: 'utc' } },
];

// Fit Profiles table schema (for creating the table)
const FIT_PROFILES_FIELDS = [
  { name: 'candidate_uuid', type: 'singleLineText' },
  { name: 'requisition_id', type: 'singleLineText' },
  { name: 'fit_score', type: 'number', options: { precision: 0 } },
  { name: 'fit_dimensions', type: 'multilineText' },
  { name: 'fit_recommendation', type: 'multilineText' },
  { name: 'generated_at', type: 'dateTime', options: { dateFormat: { name: 'iso' }, timeFormat: { name: '24hour' }, timeZone: 'utc' } },
  { name: 'status', type: 'singleSelect', options: { choices: [
    { name: 'Active', color: 'greenLight2' },
    { name: 'Archived', color: 'grayLight2' },
    { name: 'Converted', color: 'blueLight2' },
  ]}},
];

async function getTableIdByName(tableName) {
  const url = `https://api.airtable.com/v0/meta/bases/${AIRTABLE_BASE_ID}/tables`;

  const response = await fetch(url, {
    headers: { 'Authorization': `Bearer ${AIRTABLE_API_KEY}` },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch tables: ${response.status}`);
  }

  const data = await response.json();
  const table = data.tables.find(t => t.name === tableName);
  return table?.id || null;
}

async function addField(tableId, field) {
  const url = `https://api.airtable.com/v0/meta/bases/${AIRTABLE_BASE_ID}/tables/${tableId}/fields`;

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
    if (data.error?.type === 'DUPLICATE_FIELD_NAME' || data.error?.type === 'DUPLICATE_OR_EMPTY_FIELD_NAME') {
      return { success: true, exists: true, name: field.name };
    }
    return { success: false, error: data.error?.message || JSON.stringify(data), name: field.name };
  }

  return { success: true, created: true, name: field.name };
}

async function createTable(tableName, fields) {
  const url = `https://api.airtable.com/v0/meta/bases/${AIRTABLE_BASE_ID}/tables`;

  // Start with a primary field (required)
  const body = {
    name: tableName,
    fields: [
      { name: 'Name', type: 'singleLineText' }, // Primary field
      ...fields,
    ],
  };

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
    if (data.error?.message?.includes('already exists')) {
      return { success: true, exists: true, id: null };
    }
    return { success: false, error: data.error?.message || JSON.stringify(data) };
  }

  return { success: true, created: true, id: data.id };
}

async function addFieldsToTable(tableName, tableId, fields) {
  console.log(`\n📋 ${tableName} (${tableId})`);

  let created = 0;
  let existed = 0;
  let failed = 0;

  for (const field of fields) {
    const result = await addField(tableId, field);

    if (result.created) {
      console.log(`  ✓ ${field.name} (created)`);
      created++;
    } else if (result.exists) {
      console.log(`  ○ ${field.name} (already exists)`);
      existed++;
    } else {
      console.log(`  ✗ ${field.name}: ${result.error}`);
      failed++;
    }

    // Small delay to avoid rate limiting
    await new Promise(r => setTimeout(r, 200));
  }

  return { created, existed, failed };
}

async function main() {
  console.log('🚀 Adding Employer Portal fields to Airtable...');

  let totalCreated = 0;
  let totalExisted = 0;
  let totalFailed = 0;

  // 1. Add fields to Employers table
  const employerResult = await addFieldsToTable('Employers', EMPLOYERS_TABLE_ID, EMPLOYER_FIELDS);
  totalCreated += employerResult.created;
  totalExisted += employerResult.existed;
  totalFailed += employerResult.failed;

  // 2. Get Job Submissions table ID and add fields
  const submissionsTableId = await getTableIdByName(SUBMISSIONS_TABLE);
  if (submissionsTableId) {
    const submissionsResult = await addFieldsToTable('Job Submissions', submissionsTableId, SUBMISSION_FIELDS);
    totalCreated += submissionsResult.created;
    totalExisted += submissionsResult.existed;
    totalFailed += submissionsResult.failed;
  } else {
    console.log(`\n⚠️  Could not find "${SUBMISSIONS_TABLE}" table`);
  }

  // 3. Create Fit Profiles table (or add fields if exists)
  console.log('\n📋 Fit Profiles');
  const fitProfilesTableId = await getTableIdByName('Fit Profiles');

  if (fitProfilesTableId) {
    console.log('  Table already exists, adding any missing fields...');
    const fitResult = await addFieldsToTable('Fit Profiles (fields)', fitProfilesTableId, FIT_PROFILES_FIELDS);
    totalCreated += fitResult.created;
    totalExisted += fitResult.existed;
    totalFailed += fitResult.failed;
  } else {
    console.log('  Creating new table...');
    const createResult = await createTable('Fit Profiles', FIT_PROFILES_FIELDS);

    if (createResult.created) {
      console.log(`  ✓ Table created (ID: ${createResult.id})`);
      console.log(`\n  ⚠️  Add this to your .env file:`);
      console.log(`  AIRTABLE_FIT_PROFILES_TABLE_ID=${createResult.id}`);
      totalCreated += FIT_PROFILES_FIELDS.length + 1;
    } else if (createResult.exists) {
      console.log('  ○ Table already exists');
    } else {
      console.log(`  ✗ Failed to create table: ${createResult.error}`);
      totalFailed++;
    }
  }

  // 4. Add linked record fields (these need the table to exist first)
  if (!fitProfilesTableId) {
    const newFitProfilesTableId = await getTableIdByName('Fit Profiles');
    if (newFitProfilesTableId) {
      console.log('\n📋 Adding linked record fields to Fit Profiles...');

      // Get table IDs for linking
      const candidatesTableId = process.env.AIRTABLE_CANDIDATES_TABLE_ID;
      const requisitionsTableId = await getTableIdByName('Job Requisitions');

      const linkedFields = [];

      if (candidatesTableId) {
        linkedFields.push({
          name: 'candidate_link',
          type: 'multipleRecordLinks',
          options: { linkedTableId: candidatesTableId }
        });
      }

      if (requisitionsTableId) {
        linkedFields.push({
          name: 'requisition_link',
          type: 'multipleRecordLinks',
          options: { linkedTableId: requisitionsTableId }
        });
      }

      if (EMPLOYERS_TABLE_ID) {
        linkedFields.push({
          name: 'employer_link',
          type: 'multipleRecordLinks',
          options: { linkedTableId: EMPLOYERS_TABLE_ID }
        });
      }

      for (const field of linkedFields) {
        const result = await addField(newFitProfilesTableId, field);
        if (result.created) {
          console.log(`  ✓ ${field.name} (created)`);
          totalCreated++;
        } else if (result.exists) {
          console.log(`  ○ ${field.name} (already exists)`);
          totalExisted++;
        } else {
          console.log(`  ✗ ${field.name}: ${result.error}`);
          totalFailed++;
        }
        await new Promise(r => setTimeout(r, 200));
      }
    }
  }

  console.log(`\n✨ Done!`);
  console.log(`   Created: ${totalCreated}`);
  console.log(`   Already existed: ${totalExisted}`);
  console.log(`   Failed: ${totalFailed}`);

  if (totalFailed === 0) {
    console.log('\n✅ All fields added successfully!');
  }
}

main().catch(err => {
  console.error('\n❌ Error:', err.message);
  process.exit(1);
});
