#!/usr/bin/env node
/**
 * Create Job Requisition
 *
 * Usage (via Claude Code):
 * "Create a job for ABC Freight, Dallas. Local CDL-A, home daily, 1 year exp, $1200-$1500/week"
 */

import 'dotenv/config';

const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY;
const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID;

// Job Requisitions table - will need to be created in Airtable
const REQUISITIONS_TABLE = 'Job Requisitions';

async function airtableFetch(endpoint, options = {}) {
  const response = await fetch(`https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${encodeURIComponent(REQUISITIONS_TABLE)}${endpoint}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${AIRTABLE_API_KEY}`,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Airtable API error ${response.status}: ${error}`);
  }

  return response.json();
}

export async function createRequisition({
  employer,
  location,
  title,
  route_type, // local, regional, OTR
  cdl_class, // A or B
  min_experience_years,
  pay_min,
  pay_max,
  equipment_types = [],
  home_time,
  max_mvr_violations = 2,
  max_accidents = 1,
  notes,
}) {
  const fields = {
    employer,
    location,
    title,
    route_type,
    cdl_class,
    min_experience_years,
    pay_min,
    pay_max,
    equipment_types: equipment_types.join(', '),
    home_time,
    max_mvr_violations,
    max_accidents,
    notes,
    status: 'Active',
    created_at: new Date().toISOString(),
  };

  console.log('Creating job requisition...');
  const record = await airtableFetch('', {
    method: 'POST',
    body: JSON.stringify({ fields }),
  });

  console.log('\n' + '='.repeat(60));
  console.log('Job Requisition Created!');
  console.log('='.repeat(60));
  console.log(`\nEmployer: ${employer}`);
  console.log(`Position: ${title}`);
  console.log(`Location: ${location}`);
  console.log(`Pay: $${pay_min}-$${pay_max}/week`);
  console.log(`\nRecord ID: ${record.id}`);

  return {
    recordId: record.id,
    ...fields,
  };
}

export async function getRequisition(recordId) {
  return airtableFetch(`/${recordId}`);
}

export async function listActiveRequisitions() {
  const formula = encodeURIComponent(`{status} = "Active"`);
  const data = await airtableFetch(`?filterByFormula=${formula}`);
  return data.records;
}

// Export for use as a module
export { createRequisition as default };
