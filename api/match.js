import OpenAI from 'openai';

const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY;
const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID;
const CANDIDATES_TABLE_ID = process.env.AIRTABLE_CANDIDATES_TABLE_ID;
const REQUISITIONS_TABLE = 'Job Requisitions';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Equipment synonyms
const EQUIPMENT_SYNONYMS = {
  'straight truck': ['box truck', 'straight truck', 'box van'],
  'box truck': ['straight truck', 'box truck', 'box van'],
  'tractor trailer': ['tractor-trailer', 'semi', 'tractor and semi-trailer', '18 wheeler'],
  'dry van': ['van', 'dry van', '53 van'],
  'reefer': ['refrigerated', 'reefer', 'temp controlled'],
  'flatbed': ['flatbed', 'flat bed'],
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { candidateUuid, jobId } = req.body;

  if (!candidateUuid || !jobId) {
    return res.status(400).json({ error: 'candidateUuid and jobId required' });
  }

  try {
    // Load candidate
    const candidate = await getCandidateByUUID(candidateUuid);
    if (!candidate) {
      return res.status(404).json({ error: 'Candidate not found' });
    }

    // Load job
    const job = await getJob(jobId);
    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }

    // Parse JSON fields
    const driverData = {
      ...candidate.fields,
      employment_history: parseJSON(candidate.fields.employment_history),
      equipment_experience: parseJSON(candidate.fields.equipment_experience),
    };

    // Calculate fit scores
    const fitScores = calculateFitScores(driverData, job.fields);

    // Generate AI recommendation
    const recommendation = await generateRecommendation(driverData, job.fields, fitScores);

    // Build job fit object
    const jobFit = {
      employer: job.fields.employer,
      role: job.fields.title,
      overallScore: fitScores.overallScore,
      dimensions: fitScores.dimensions,
      recommendation,
      requisitionId: job.id,
      matchedAt: new Date().toISOString(),
    };

    // Save to candidate record
    await updateCandidate(candidate.id, {
      job_fit_data: JSON.stringify(jobFit),
    });

    res.status(200).json({
      success: true,
      match: jobFit,
    });
  } catch (error) {
    console.error('Match error:', error);
    res.status(500).json({ error: error.message });
  }
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

async function getJob(jobId) {
  const url = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${encodeURIComponent(REQUISITIONS_TABLE)}/${jobId}`;

  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${AIRTABLE_API_KEY}` },
  });

  if (!response.ok) return null;
  return response.json();
}

async function updateCandidate(recordId, fields) {
  const url = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${CANDIDATES_TABLE_ID}/${recordId}`;

  await fetch(url, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${AIRTABLE_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ fields }),
  });
}

function parseJSON(field, defaultValue = []) {
  if (!field) return defaultValue;
  try {
    return typeof field === 'string' ? JSON.parse(field) : field;
  } catch {
    return defaultValue;
  }
}

function calculateFitScores(driver, req) {
  const dimensions = [];

  // Route & Schedule Match
  const routeScore = calculateRouteMatch(driver, req);
  dimensions.push({ name: 'Route & Schedule Match', ...routeScore });

  // Equipment Match
  const equipmentScore = calculateEquipmentMatch(driver, req);
  dimensions.push({ name: 'Equipment Match', ...equipmentScore });

  // Experience Match
  const experienceScore = calculateExperienceMatch(driver, req);
  dimensions.push({ name: 'Experience Match', ...experienceScore });

  // Compensation Fit
  const compScore = calculateCompensationFit(driver, req);
  dimensions.push({ name: 'Compensation Fit', ...compScore });

  // Background Eligibility
  const backgroundScore = calculateBackgroundEligibility(driver, req);
  dimensions.push({ name: 'Background Eligibility', ...backgroundScore });

  // Job Requirements (touch freight, endorsements, CDL class)
  const requirementsScore = calculateJobRequirementsMatch(driver, req);
  dimensions.push({ name: 'Job Requirements', ...requirementsScore });

  // Commute Match
  const commuteScore = calculateCommuteMatch(driver, req);
  dimensions.push({ name: 'Commute', ...commuteScore });

  // Weighted average
  const weights = {
    'Route & Schedule Match': 0.14,
    'Equipment Match': 0.16,
    'Experience Match': 0.18,
    'Compensation Fit': 0.10,
    'Background Eligibility': 0.16,
    'Job Requirements': 0.14,
    'Commute': 0.12,
  };

  const overallScore = Math.round(
    dimensions.reduce((sum, dim) => sum + dim.score * weights[dim.name], 0)
  );

  return { overallScore, dimensions };
}

function calculateRouteMatch(driver, req) {
  const driverPref = (driver.home_time_preference || '').toLowerCase();
  const jobType = (req.route_type || '').toLowerCase();

  const prefMap = {
    'daily': ['local', 'home daily'],
    'weekly': ['regional', 'home weekly'],
    'bi-weekly': ['otr', 'regional'],
    'flexible': ['local', 'regional', 'otr'],
  };

  const acceptableTypes = prefMap[driverPref] || ['local', 'regional', 'otr'];
  const match = acceptableTypes.some(t => jobType.includes(t));

  if (match) {
    return { score: 94, note: `Driver's ${driverPref || 'flexible'} preference aligns with ${req.route_type} schedule` };
  }
  return { score: 70, note: `Driver prefers ${driverPref || 'flexible'} home time; job is ${req.route_type}` };
}

function equipmentMatches(driverType, requiredType) {
  const d = driverType.toLowerCase();
  const r = requiredType.toLowerCase();

  if (d.includes(r) || r.includes(d)) return true;

  for (const [key, synonyms] of Object.entries(EQUIPMENT_SYNONYMS)) {
    const driverMatches = synonyms.some(s => d.includes(s));
    const reqMatches = synonyms.some(s => r.includes(s));
    if (driverMatches && reqMatches) return true;
  }

  return false;
}

function calculateEquipmentMatch(driver, req) {
  const driverEquipment = driver.equipment_experience || [];

  let requiredEquipment = req.equipment_types || [];
  if (typeof requiredEquipment === 'string') {
    requiredEquipment = requiredEquipment.split(',').map(s => s.trim()).filter(Boolean);
  }

  if (!requiredEquipment.length) {
    return { score: 85, note: 'No specific equipment requirements specified' };
  }

  let matchCount = 0;
  for (const reqEq of requiredEquipment) {
    const hasExp = driverEquipment.some(de => equipmentMatches(de.type || '', reqEq));
    if (hasExp) matchCount++;
  }

  const matchRatio = matchCount / requiredEquipment.length;

  if (matchRatio >= 0.8) {
    return { score: 92, note: `Driver has experience with ${matchCount}/${requiredEquipment.length} required equipment types` };
  } else if (matchRatio >= 0.5) {
    return { score: 78, note: `Partial equipment match (${matchCount}/${requiredEquipment.length} types)` };
  }
  return { score: 60, note: 'Limited equipment experience for this role' };
}

function calculateExperienceMatch(driver, req) {
  const driverYears = driver.years_experience || 0;
  const requiredYears = req.min_experience_years || 0;

  if (driverYears >= requiredYears + 2) {
    return { score: 95, note: `${driverYears} years experience exceeds ${requiredYears} year requirement` };
  } else if (driverYears >= requiredYears) {
    return { score: 88, note: `${driverYears} years experience meets ${requiredYears} year requirement` };
  } else if (driverYears >= requiredYears - 1) {
    return { score: 72, note: `${driverYears} years experience slightly below ${requiredYears} year requirement` };
  }
  return { score: 55, note: `${driverYears} years experience below ${requiredYears} year requirement` };
}

function calculateCompensationFit(driver, req) {
  const driverMin = driver.min_weekly_pay || 0;
  const driverTarget = driver.target_weekly_pay || 0;
  const jobMin = req.pay_min || 0;
  const jobMax = req.pay_max || 0;

  if (!jobMax || !driverMin) {
    return { score: 80, note: 'Compensation expectations not fully specified' };
  }

  if (jobMax >= driverTarget && jobMin >= driverMin * 0.9) {
    return { score: 92, note: `Pay range ($${jobMin}-$${jobMax}/wk) meets driver's target of $${driverTarget}/wk` };
  } else if (jobMax >= driverMin) {
    return { score: 80, note: 'Pay range meets minimum requirements' };
  }
  return { score: 60, note: `Pay range ($${jobMin}-$${jobMax}/wk) below driver's minimum of $${driverMin}/wk` };
}

function calculateBackgroundEligibility(driver, req) {
  const issues = [];

  if (driver.mvr_status === 'Has Violations') {
    const violations = driver.mvr_violations_3yr || 0;
    const maxAllowed = req.max_mvr_violations || 2;
    if (violations > maxAllowed) {
      issues.push(`${violations} MVR violations exceeds ${maxAllowed} max`);
    }
  }

  const accidents = driver.mvr_accidents_3yr || 0;
  const maxAccidents = req.max_accidents || 1;
  if (accidents > maxAccidents) {
    issues.push(`${accidents} accidents exceeds ${maxAccidents} max`);
  }

  if (driver.clearinghouse_status === 'Prohibited') {
    issues.push('Prohibited in FMCSA Clearinghouse');
  }

  if (issues.length === 0) {
    return { score: 95, note: 'Clean background meets all employer requirements' };
  } else if (issues.length === 1) {
    return { score: 75, note: issues[0] };
  }
  return { score: 55, note: `Multiple concerns: ${issues.join('; ')}` };
}

function calculateCommuteMatch(driver, req) {
  const driverZip = String(driver.zipcode || driver.zipcodeFromApplication || '').slice(0, 5);
  const yardZip = String(req.yard_zip || '').slice(0, 5);

  if (!driverZip || !yardZip) {
    return { score: 80, note: 'Commute distance not calculable (missing zip code)' };
  }

  // Compare zip code prefixes for rough distance
  // Same 3-digit prefix = same metro area (~0-30 miles)
  // Same 2-digit prefix = same region (~30-100 miles)
  // Different = likely far

  const driverPrefix3 = driverZip.slice(0, 3);
  const yardPrefix3 = yardZip.slice(0, 3);
  const driverPrefix2 = driverZip.slice(0, 2);
  const yardPrefix2 = yardZip.slice(0, 2);

  // Parse max_commute_miles - could be "50 miles" string or number
  let maxCommute = 50; // Default
  const rawCommute = driver.max_commute_miles;
  if (typeof rawCommute === 'number') {
    maxCommute = rawCommute;
  } else if (typeof rawCommute === 'string') {
    const parsed = parseInt(rawCommute.replace(/[^0-9]/g, ''));
    if (!isNaN(parsed)) maxCommute = parsed;
  }

  if (driverZip === yardZip) {
    return { score: 98, note: 'Same zip code - minimal commute' };
  } else if (driverPrefix3 === yardPrefix3) {
    // Same metro area, likely within 30 miles
    if (maxCommute >= 25) {
      return { score: 92, note: `Same metro area (${driverZip} → ${yardZip})` };
    }
    return { score: 75, note: `Same metro but driver prefers <${maxCommute} mile commute` };
  } else if (driverPrefix2 === yardPrefix2) {
    // Same region, likely 30-100 miles
    if (maxCommute >= 50) {
      return { score: 78, note: `Same region (${driverZip} → ${yardZip}), may be 30-60 miles` };
    }
    return { score: 60, note: `Regional commute may exceed ${maxCommute} mile preference` };
  }

  // Different regions
  return { score: 50, note: `Different regions (${driverZip} → ${yardZip}) - may be too far` };
}

function calculateJobRequirementsMatch(driver, req) {
  const issues = [];
  const matches = [];

  // 1. Touch Freight
  const jobTouchFreight = (req.touch_freight || '').toLowerCase();
  const driverWillingTouch = driver.willing_touch_freight;

  if (jobTouchFreight && jobTouchFreight !== 'no' && jobTouchFreight !== 'none') {
    if (driverWillingTouch === true) {
      matches.push('willing to handle touch freight');
    } else if (driverWillingTouch === false) {
      issues.push(`job requires ${jobTouchFreight} touch freight`);
    }
  } else {
    matches.push('no touch freight required');
  }

  // 2. Endorsements
  const jobEndorsements = (req.endorsements_required || '').toLowerCase();
  const driverEndorsements = (driver.endorsements || '').toLowerCase();

  if (jobEndorsements) {
    const required = jobEndorsements.split(',').map(e => e.trim()).filter(Boolean);
    const has = driverEndorsements.split(',').map(e => e.trim()).filter(Boolean);

    const endorsementMap = {
      'hazmat': ['h', 'hazmat', 'haz-mat'],
      'tanker': ['n', 'tanker', 'tank'],
      'doubles': ['t', 'doubles', 'triples', 'doubles/triples'],
      'passenger': ['p', 'passenger'],
    };

    for (const endorsement of required) {
      let found = false;
      for (const [name, variants] of Object.entries(endorsementMap)) {
        if (variants.some(v => endorsement.includes(v))) {
          if (has.some(h => variants.some(v => h.includes(v)))) {
            found = true;
            matches.push(`has ${name} endorsement`);
          }
          break;
        }
      }
      if (!found) {
        issues.push(`missing ${endorsement} endorsement`);
      }
    }
  }

  // 3. CDL Class match
  const jobCDL = (req.cdl_class || '').toUpperCase();
  const driverCDL = (driver.cdl_class || '').toUpperCase();

  if (jobCDL && driverCDL) {
    if (jobCDL === 'A' && driverCDL === 'B') {
      issues.push('job requires CDL-A, driver has CDL-B');
    } else {
      matches.push(`CDL-${driverCDL} meets requirement`);
    }
  }

  // Calculate score
  if (issues.length === 0) {
    return {
      score: 95,
      note: matches.length > 0 ? `Meets requirements: ${matches.slice(0, 2).join(', ')}` : 'Meets all job requirements',
    };
  } else if (issues.length === 1) {
    return { score: 70, note: `Concern: ${issues[0]}` };
  }
  return { score: 50, note: `Multiple issues: ${issues.join('; ')}` };
}

async function generateRecommendation(driverData, reqData, fitScores) {
  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      {
        role: 'system',
        content: `You are a Career Agent AI making a hiring recommendation. Write 2-3 sentences explaining why this driver is a good/poor fit for this specific job, key alignment points or concerns, and your recommendation (proceed to interview, conditional, not recommended). Be direct and actionable.`,
      },
      {
        role: 'user',
        content: `Driver: ${JSON.stringify(driverData)}\n\nJob: ${JSON.stringify(reqData)}\n\nFit Scores: ${JSON.stringify(fitScores)}`,
      },
    ],
    max_tokens: 200,
  });

  return response.choices[0].message.content;
}
