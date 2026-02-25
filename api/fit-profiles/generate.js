import { calculateFitScores, generateRecommendation, parseJSON } from '../lib/fit-scoring.js';
import zipcodes from 'zipcodes';

const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY;
const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID;
const CANDIDATES_TABLE_ID = process.env.AIRTABLE_CANDIDATES_TABLE_ID;
const FIT_PROFILES_TABLE = process.env.AIRTABLE_FIT_PROFILES_TABLE_ID || 'Fit Profiles';
const REQUISITIONS_TABLE = 'Job Requisitions';

const MIN_FIT_SCORE = 70; // Only generate profiles for scores >= 70
const DEFAULT_HIRING_RADIUS = 50; // Default 50 miles if not specified

// Calculate distance between two zip codes in miles
function getZipDistance(zip1, zip2) {
  if (!zip1 || !zip2) return null;

  // Clean zip codes (take first 5 digits)
  const cleanZip1 = String(zip1).slice(0, 5);
  const cleanZip2 = String(zip2).slice(0, 5);

  const distance = zipcodes.distance(cleanZip1, cleanZip2);
  return distance; // Returns distance in miles or null if invalid
}

// Check if candidate is within hiring radius
function isWithinHiringRadius(candidateZip, jobYardZip, hiringRadius) {
  if (!jobYardZip) return true; // No yard zip = no distance filter
  if (!candidateZip) return false; // No candidate zip = can't verify distance

  const radius = hiringRadius || DEFAULT_HIRING_RADIUS;
  const distance = getZipDistance(candidateZip, jobYardZip);

  if (distance === null) return true; // Can't calculate = don't filter

  return distance <= radius;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { requisition_id, candidate_uuid } = req.body;

    if (!requisition_id && !candidate_uuid) {
      return res.status(400).json({ error: 'requisition_id or candidate_uuid required' });
    }

    let generated = 0;
    let skipped = 0;

    if (requisition_id) {
      // Generate fit profiles for all active candidates against this job
      const result = await generateProfilesForJob(requisition_id);
      generated = result.generated;
      skipped = result.skipped;
    } else if (candidate_uuid) {
      // Generate fit profiles for this candidate against all active jobs
      const result = await generateProfilesForCandidate(candidate_uuid);
      generated = result.generated;
      skipped = result.skipped;
    }

    res.status(200).json({
      success: true,
      generated,
      skipped,
      message: `Generated ${generated} fit profiles, skipped ${skipped} (below ${MIN_FIT_SCORE} score threshold)`,
    });
  } catch (error) {
    console.error('Fit profile generation error:', error);
    res.status(500).json({ error: error.message });
  }
}

async function generateProfilesForJob(requisitionId) {
  // Fetch the job
  const job = await getJob(requisitionId);
  if (!job) {
    throw new Error('Job not found');
  }

  const yardZip = job.fields.yard_zip;
  const hiringRadius = job.fields.hiring_radius || DEFAULT_HIRING_RADIUS;

  // Fetch all active candidates
  const candidates = await getActiveCandidates();

  let generated = 0;
  let skipped = 0;
  let outOfRange = 0;

  for (const candidate of candidates) {
    // Check distance filter first
    const candidateZip = candidate.fields.zipcode;
    if (!isWithinHiringRadius(candidateZip, yardZip, hiringRadius)) {
      outOfRange++;
      continue;
    }

    const driverData = {
      ...candidate.fields,
      employment_history: parseJSON(candidate.fields.employment_history, []),
      equipment_experience: parseJSON(candidate.fields.equipment_experience, []),
    };

    const fitScores = calculateFitScores(driverData, job.fields);

    if (fitScores.overallScore >= MIN_FIT_SCORE) {
      // Check if profile already exists
      const existing = await findExistingProfile(candidate.fields.uuid, requisitionId);
      if (existing) {
        // Update existing profile
        await updateFitProfile(existing.id, fitScores, driverData, job.fields);
      } else {
        // Create new profile
        await createFitProfile(candidate, job, fitScores, driverData, job.fields);
      }
      generated++;
    } else {
      skipped++;
    }
  }

  console.log(`Job ${requisitionId}: ${generated} generated, ${skipped} low score, ${outOfRange} out of ${hiringRadius}mi radius`);
  return { generated, skipped, outOfRange };
}

async function generateProfilesForCandidate(candidateUuid) {
  // Fetch the candidate
  const candidate = await getCandidateByUUID(candidateUuid);
  if (!candidate) {
    throw new Error('Candidate not found');
  }

  const candidateZip = candidate.fields.zipcode;

  const driverData = {
    ...candidate.fields,
    employment_history: parseJSON(candidate.fields.employment_history, []),
    equipment_experience: parseJSON(candidate.fields.equipment_experience, []),
  };

  // Fetch all active jobs
  const jobs = await getActiveJobs();

  let generated = 0;
  let skipped = 0;
  let outOfRange = 0;

  for (const job of jobs) {
    // Check distance filter first
    const yardZip = job.fields.yard_zip;
    const hiringRadius = job.fields.hiring_radius || DEFAULT_HIRING_RADIUS;

    if (!isWithinHiringRadius(candidateZip, yardZip, hiringRadius)) {
      outOfRange++;
      continue;
    }

    const fitScores = calculateFitScores(driverData, job.fields);

    if (fitScores.overallScore >= MIN_FIT_SCORE) {
      const existing = await findExistingProfile(candidateUuid, job.id);
      if (existing) {
        await updateFitProfile(existing.id, fitScores, driverData, job.fields);
      } else {
        await createFitProfile(candidate, job, fitScores, driverData, job.fields);
      }
      generated++;
    } else {
      skipped++;
    }
  }

  console.log(`Candidate ${candidateUuid}: ${generated} generated, ${skipped} low score, ${outOfRange} out of range`);
  return { generated, skipped, outOfRange };
}

async function getJob(jobId) {
  const url = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${encodeURIComponent(REQUISITIONS_TABLE)}/${jobId}`;
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${AIRTABLE_API_KEY}` },
  });
  if (!response.ok) return null;
  return response.json();
}

async function getActiveJobs() {
  const formula = encodeURIComponent(`{status} = "Active"`);
  const url = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${encodeURIComponent(REQUISITIONS_TABLE)}?filterByFormula=${formula}`;

  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${AIRTABLE_API_KEY}` },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch jobs: ${response.status}`);
  }

  const data = await response.json();
  return data.records || [];
}

async function getCandidateByUUID(uuid) {
  const formula = encodeURIComponent(`{uuid} = "${uuid}"`);
  const url = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${CANDIDATES_TABLE_ID}?filterByFormula=${formula}&maxRecords=1`;

  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${AIRTABLE_API_KEY}` },
  });

  const data = await response.json();
  return data.records?.[0] || null;
}

async function getActiveCandidates() {
  // Fetch candidates that are available for placement
  const formula = encodeURIComponent(`OR({placement_status} = "Working and Looking", {placement_status} = "Unemployed and Looking")`);
  const url = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${CANDIDATES_TABLE_ID}?filterByFormula=${formula}`;

  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${AIRTABLE_API_KEY}` },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch candidates: ${response.status}`);
  }

  const data = await response.json();
  return data.records || [];
}

async function findExistingProfile(candidateUuid, requisitionId) {
  const formula = encodeURIComponent(
    `AND({candidate_uuid} = "${candidateUuid}", {requisition_id} = "${requisitionId}")`
  );
  const url = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${encodeURIComponent(FIT_PROFILES_TABLE)}?filterByFormula=${formula}&maxRecords=1`;

  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${AIRTABLE_API_KEY}` },
  });

  if (!response.ok) return null;

  const data = await response.json();
  return data.records?.[0] || null;
}

async function createFitProfile(candidate, job, fitScores, driverData, reqData) {
  // Generate recommendation
  const recommendation = await generateRecommendation(driverData, reqData, fitScores);

  const employerLink = job.fields.employer_link || [];

  const fields = {
    candidate_uuid: candidate.fields.uuid,
    Name: candidate.fields.fullName || '',
    requisition_id: job.id,
    fit_score: fitScores.overallScore,
    fit_dimensions: JSON.stringify(fitScores.dimensions),
    fit_recommendation: recommendation,
    generated_at: new Date().toISOString(),
    status: 'Active',
    // Linked records
    candidate_link: [candidate.id],
    requisition_link: [job.id],
  };

  if (employerLink.length > 0) {
    fields.employer_link = employerLink;
  }

  const url = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${encodeURIComponent(FIT_PROFILES_TABLE)}`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${AIRTABLE_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ fields }),
  });

  if (!response.ok) {
    const error = await response.text();
    console.error('Create fit profile failed:', error);
  }
}

async function updateFitProfile(profileId, fitScores, driverData, reqData) {
  // Regenerate recommendation
  const recommendation = await generateRecommendation(driverData, reqData, fitScores);

  const fields = {
    fit_score: fitScores.overallScore,
    fit_dimensions: JSON.stringify(fitScores.dimensions),
    fit_recommendation: recommendation,
    generated_at: new Date().toISOString(),
  };

  const url = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${encodeURIComponent(FIT_PROFILES_TABLE)}/${profileId}`;

  const response = await fetch(url, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${AIRTABLE_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ fields }),
  });

  if (!response.ok) {
    const error = await response.text();
    console.error('Update fit profile failed:', error);
  }
}
