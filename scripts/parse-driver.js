#!/usr/bin/env node
/**
 * Parse Driver Documents
 *
 * Fetches PDF attachments from Airtable, parses with OpenAI, updates the record.
 *
 * Usage:
 *   node scripts/parse-driver.js "Tykwan Stutges"
 *   node scripts/parse-driver.js --uuid 40fcbac0-3f20-4cb5-8923-79bf7f1475ae
 */

import 'dotenv/config';
import pdfParse from 'pdf-parse';
import OpenAI from 'openai';
import { findCandidateByName, findCandidateBySlug, updateCandidate, generateSlug } from './lib/airtable.js';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

async function extractTextFromPDF(url) {
  console.log('  Downloading PDF...');
  const response = await fetch(url);
  const buffer = Buffer.from(await response.arrayBuffer());
  console.log('  Extracting text...');
  const data = await pdfParse(buffer);
  return data.text;
}

async function parseTenstreet(pdfText) {
  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      {
        role: 'system',
        content: `Extract structured info from this Tenstreet driver application. Return JSON:
{
  "cdl_class": "A or B",
  "endorsements": "comma-separated string (e.g. Tanker, Hazmat, Doubles)",
  "license_number": "string",
  "license_state": "string",
  "license_expiration": "YYYY-MM-DD or null",
  "years_experience": number,
  "employment_history": [{"company": "", "role": "Company Driver", "tenure": "X months", "verified": true, "regulated": true}],
  "equipment_experience": [{"type": "equipment name", "level": "experience level"}]
}

For equipment_experience, extract ALL equipment types mentioned with their experience levels. Look for:
- Tractor and Semi-Trailer, Tractor-Trailer
- Box Truck, Straight Truck
- Dry Van, Flatbed, Refrigerated/Reefer
- Tanker, End Dump
- Any trailer types mentioned (53' Van, Flatbed, etc.)

Use the exact experience levels from the document (e.g. "2-3 years", "Less than 1 year", "None").
Only include equipment where they have actual experience (not "None").

Only return valid JSON.`,
      },
      { role: 'user', content: pdfText },
    ],
    response_format: { type: 'json_object' },
    max_tokens: 2000,
  });
  return JSON.parse(response.choices[0].message.content);
}

async function parseMVR(pdfText) {
  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      {
        role: 'system',
        content: `Extract MVR info. Return JSON:
{
  "mvr_status": "Clear" or "Has Violations",
  "mvr_violations_3yr": number,
  "mvr_accidents_3yr": number
}
Only return valid JSON.`,
      },
      { role: 'user', content: pdfText },
    ],
    response_format: { type: 'json_object' },
    max_tokens: 500,
  });
  return JSON.parse(response.choices[0].message.content);
}

async function parsePSP(pdfText) {
  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      {
        role: 'system',
        content: `Extract PSP info. Return JSON:
{
  "psp_crashes_5yr": number,
  "psp_inspections_3yr": number,
  "psp_driver_oos": number
}
Only return valid JSON.`,
      },
      { role: 'user', content: pdfText },
    ],
    response_format: { type: 'json_object' },
    max_tokens: 500,
  });
  return JSON.parse(response.choices[0].message.content);
}

async function parseClearinghouse(pdfText) {
  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      {
        role: 'system',
        content: `Extract Clearinghouse status. Return JSON:
{
  "clearinghouse_status": "Not Prohibited" or "Prohibited"
}
Only return valid JSON.`,
      },
      { role: 'user', content: pdfText },
    ],
    response_format: { type: 'json_object' },
    max_tokens: 200,
  });
  return JSON.parse(response.choices[0].message.content);
}

async function generateRecruiterNotes(driverData) {
  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      {
        role: 'system',
        content: `You're a trucking recruiter writing notes about a candidate. Write 3-4 sentences covering: safety record, experience level, work stability, key selling points. Be factual and concise. No bullet points.`,
      },
      { role: 'user', content: JSON.stringify(driverData, null, 2) },
    ],
    max_tokens: 300,
  });
  return response.choices[0].message.content;
}

async function generateNarrative(driverData, storyResponses) {
  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      {
        role: 'system',
        content: `Write a 4-5 sentence narrative about this driver for recruiters. Cover: background, why trucking, what they want in an employer, what makes them stand out. Third person, warm but professional. Use their story responses if available.`,
      },
      { role: 'user', content: `Driver: ${JSON.stringify(driverData)}\n\nStory: ${JSON.stringify(storyResponses || {})}` },
    ],
    max_tokens: 400,
  });
  return response.choices[0].message.content;
}

async function generatePullQuote(storyResponses) {
  if (!storyResponses || !Object.values(storyResponses).some(v => v)) return null;

  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      {
        role: 'system',
        content: `Extract a compelling 1-2 sentence quote from the driver's story responses. Return just the quote text, no quotation marks.`,
      },
      { role: 'user', content: JSON.stringify(storyResponses) },
    ],
    max_tokens: 100,
  });
  return response.choices[0].message.content;
}

async function parseDriver(identifier) {
  console.log('Finding driver:', identifier);

  // Find by name or UUID
  let record;
  if (identifier.includes('-')) {
    // Looks like UUID
    const formula = encodeURIComponent(`{uuid} = "${identifier}"`);
    const url = `https://api.airtable.com/v0/${process.env.AIRTABLE_BASE_ID}/${process.env.AIRTABLE_CANDIDATES_TABLE_ID}?filterByFormula=${formula}`;
    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${process.env.AIRTABLE_API_KEY}` },
    });
    const data = await response.json();
    record = data.records?.[0];
  } else {
    record = await findCandidateByName(identifier);
  }

  if (!record) {
    throw new Error(`Driver not found: ${identifier}`);
  }

  const fields = record.fields;
  console.log(`Found: ${fields.fullName} (${record.id})`);

  const updates = {};

  // Parse Tenstreet
  if (fields.attachment_tenstreet?.[0]?.url) {
    console.log('Parsing Tenstreet application...');
    const text = await extractTextFromPDF(fields.attachment_tenstreet[0].url);
    const data = await parseTenstreet(text);
    Object.assign(updates, {
      cdl_class: data.cdl_class,
      endorsements: data.endorsements,
      license_number: data.license_number,
      license_state: data.license_state,
      license_expiration: data.license_expiration,
      years_experience: data.years_experience,
      employment_history: JSON.stringify(data.employment_history || []),
      equipment_experience: JSON.stringify(data.equipment_experience || []),
    });
    console.log(`  CDL: ${data.cdl_class}, Experience: ${data.years_experience} years`);
  }

  // Parse MVR
  if (fields.attachment_mvr?.[0]?.url) {
    console.log('Parsing MVR...');
    const text = await extractTextFromPDF(fields.attachment_mvr[0].url);
    const data = await parseMVR(text);
    Object.assign(updates, data);
    console.log(`  Status: ${data.mvr_status}, Violations: ${data.mvr_violations_3yr}`);
  }

  // Parse PSP
  if (fields.attachment_psp?.[0]?.url) {
    console.log('Parsing PSP...');
    const text = await extractTextFromPDF(fields.attachment_psp[0].url);
    const data = await parsePSP(text);
    Object.assign(updates, data);
    console.log(`  Crashes: ${data.psp_crashes_5yr}, Driver OOS: ${data.psp_driver_oos}`);
  }

  // Parse Clearinghouse
  if (fields.attachment_clearinghouse?.[0]?.url) {
    console.log('Parsing Clearinghouse...');
    const text = await extractTextFromPDF(fields.attachment_clearinghouse[0].url);
    const data = await parseClearinghouse(text);
    Object.assign(updates, data);
    console.log(`  Status: ${data.clearinghouse_status}`);
  }

  // Generate AI content
  const storyResponses = {
    whoAreYou: fields.story_who_are_you,
    whatIsYourWhy: fields.story_what_is_your_why,
    freeworldJourney: fields.story_freeworld_journey,
    whyTrucking: fields.story_why_trucking,
    lookingFor: fields.story_looking_for,
    whatOthersSay: fields.story_what_others_say,
  };

  const combinedData = { ...fields, ...updates };

  console.log('Generating AI recruiter notes...');
  updates.ai_recruiter_notes = await generateRecruiterNotes(combinedData);

  console.log('Generating narrative...');
  updates.ai_narrative = await generateNarrative(combinedData, storyResponses);

  const pullQuote = await generatePullQuote(storyResponses);
  if (pullQuote) {
    updates.ai_pull_quote = pullQuote;
  }

  // Set portfolio slug if not set
  if (!fields.portfolio_slug && fields.fullName) {
    updates.portfolio_slug = generateSlug(fields.fullName);
  }
  updates.portfolio_published = true;

  // Save to Airtable
  console.log('Saving to Airtable...');
  await updateCandidate(record.id, updates);

  const slug = updates.portfolio_slug || fields.portfolio_slug;
  const baseUrl = process.env.VERCEL_URL || 'http://localhost:5173';

  console.log('\n' + '='.repeat(60));
  console.log('Driver Parsed Successfully!');
  console.log('='.repeat(60));
  console.log(`\nDriver: ${fields.fullName}`);
  console.log(`Portfolio: ${baseUrl}/portfolio/${slug}`);
  console.log(`Form: ${baseUrl}/form/${fields.uuid}`);

  return { slug, uuid: fields.uuid };
}

// CLI
const identifier = process.argv[2];
if (!identifier) {
  console.log('Usage: node scripts/parse-driver.js "Driver Name"');
  console.log('       node scripts/parse-driver.js <uuid>');
  process.exit(1);
}

parseDriver(identifier.replace('--uuid', '').trim()).catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
