import OpenAI from 'openai';

const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY;
const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID;
const CANDIDATES_TABLE_ID = process.env.AIRTABLE_CANDIDATES_TABLE_ID;

const SUBMISSIONS_TABLE = 'Job Submissions';
const REQUISITIONS_TABLE = 'Job Requisitions';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Equipment synonyms for matching
const EQUIPMENT_SYNONYMS = {
  'straight truck': ['box truck', 'straight truck', 'box van'],
  'box truck': ['straight truck', 'box truck', 'box van'],
  'tractor trailer': ['tractor-trailer', 'semi', 'tractor and semi-trailer', '18 wheeler'],
  'dry van': ['van', 'dry van', '53 van'],
  'reefer': ['refrigerated', 'reefer', 'temp controlled'],
  'flatbed': ['flatbed', 'flat bed'],
};

export default async function handler(req, res) {
  try {
    if (req.method === 'GET') {
      return await listSubmissions(req, res);
    } else if (req.method === 'POST') {
      return await createSubmission(req, res);
    } else {
      return res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('Submissions error:', error);
    res.status(500).json({ error: error.message });
  }
}

async function listSubmissions(req, res) {
  const { requisition_id } = req.query;

  let url = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${encodeURIComponent(SUBMISSIONS_TABLE)}`;

  if (requisition_id) {
    const formula = encodeURIComponent(`{requisition_id} = "${requisition_id}"`);
    url += `?filterByFormula=${formula}&sort[0][field]=submitted_date&sort[0][direction]=desc`;
  } else {
    url += `?sort[0][field]=submitted_date&sort[0][direction]=desc`;
  }

  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${AIRTABLE_API_KEY}` },
  });

  if (!response.ok) {
    throw new Error(`Airtable error: ${response.status}`);
  }

  const data = await response.json();

  const submissions = data.records.map(r => {
    const portfolioSlug = r.fields.portfolio_slug || '';
    return {
      id: r.id,
      ...r.fields,
      fit_dimensions: parseJSON(r.fields.fit_dimensions, []),
      driver_fit_link: portfolioSlug ? `/portfolio/${portfolioSlug}?submission=${r.id}` : null,
    };
  });

  res.status(200).json({ submissions });
}

async function createSubmission(req, res) {
  const { candidate_uuid, candidate_name, requisition_id, employer, job_title } = req.body;

  if (!candidate_uuid || !requisition_id) {
    return res.status(400).json({ error: 'candidate_uuid and requisition_id required' });
  }

  // Fetch candidate and job data for fit scoring
  const [candidate, job] = await Promise.all([
    getCandidateByUUID(candidate_uuid),
    getJob(requisition_id),
  ]);

  // Calculate fit scores
  let fitData = {};
  if (candidate && job) {
    const driverData = {
      ...candidate.fields,
      employment_history: parseJSON(candidate.fields.employment_history, []),
      equipment_experience: parseJSON(candidate.fields.equipment_experience, []),
    };

    const fitScores = calculateFitScores(driverData, job.fields);

    // Generate AI recommendation
    const recommendation = await generateRecommendation(driverData, job.fields, fitScores);

    fitData = {
      fit_score: fitScores.overallScore,
      fit_dimensions: JSON.stringify(fitScores.dimensions),
      fit_recommendation: recommendation,
    };
  }

  // Get portfolio slug for fit link
  const portfolioSlug = candidate?.fields?.portfolio_slug || '';

  const fields = {
    candidate_uuid,
    candidate_name: candidate_name || '',
    requisition_id,
    employer: employer || '',
    job_title: job_title || '',
    submitted_date: new Date().toISOString().split('T')[0],
    status: 'Submitted',
    portfolio_slug: portfolioSlug,
    ...fitData,
  };

  const url = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${encodeURIComponent(SUBMISSIONS_TABLE)}`;

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
    throw new Error(`Create failed: ${error}`);
  }

  const record = await response.json();

  // Generate driver fit link
  const driverFitLink = portfolioSlug
    ? `/portfolio/${portfolioSlug}?submission=${record.id}`
    : null;

  res.status(201).json({
    id: record.id,
    ...record.fields,
    fit_dimensions: parseJSON(record.fields.fit_dimensions, []),
    driver_fit_link: driverFitLink,
  });
}

// Helper functions
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

function parseJSON(field, defaultValue = []) {
  if (!field) return defaultValue;
  try {
    return typeof field === 'string' ? JSON.parse(field) : field;
  } catch {
    return defaultValue;
  }
}

// Fit scoring functions
function calculateFitScores(driver, req) {
  const dimensions = [];

  dimensions.push({ name: 'Route & Schedule', ...calculateRouteMatch(driver, req) });
  dimensions.push({ name: 'Equipment', ...calculateEquipmentMatch(driver, req) });
  dimensions.push({ name: 'Experience', ...calculateExperienceMatch(driver, req) });
  dimensions.push({ name: 'Compensation', ...calculateCompensationFit(driver, req) });
  dimensions.push({ name: 'Background', ...calculateBackgroundEligibility(driver, req) });
  dimensions.push({ name: 'Requirements', ...calculateJobRequirementsMatch(driver, req) });
  dimensions.push({ name: 'Commute', ...calculateCommuteMatch(driver, req) });

  const weights = {
    'Route & Schedule': 0.14,
    'Equipment': 0.16,
    'Experience': 0.18,
    'Compensation': 0.10,
    'Background': 0.16,
    'Requirements': 0.14,
    'Commute': 0.12,
  };

  const overallScore = Math.round(
    dimensions.reduce((sum, dim) => sum + dim.score * (weights[dim.name] || 0.14), 0)
  );

  return { overallScore, dimensions };
}

function calculateRouteMatch(driver, req) {
  const driverPref = (driver.home_time_preference || '').toLowerCase();
  const jobType = (req.route_type || '').toLowerCase();

  const prefMap = {
    'daily': ['local', 'home daily'],
    'weekly': ['regional', 'home weekly'],
    'otr': ['otr', 'regional'],
    'flexible': ['local', 'regional', 'otr'],
  };

  const acceptableTypes = prefMap[driverPref] || ['local', 'regional', 'otr'];
  const match = acceptableTypes.some(t => jobType.includes(t));

  if (match) {
    return { score: 94, note: `${driverPref || 'Flexible'} preference fits ${req.route_type}` };
  }
  return { score: 70, note: `Prefers ${driverPref || 'flexible'}; job is ${req.route_type}` };
}

function equipmentMatches(driverType, requiredType) {
  const d = driverType.toLowerCase();
  const r = requiredType.toLowerCase();

  if (d.includes(r) || r.includes(d)) return true;

  for (const [, synonyms] of Object.entries(EQUIPMENT_SYNONYMS)) {
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
    return { score: 85, note: 'No specific equipment requirements' };
  }

  let matchCount = 0;
  for (const reqEq of requiredEquipment) {
    const hasExp = driverEquipment.some(de => equipmentMatches(de.type || '', reqEq));
    if (hasExp) matchCount++;
  }

  const matchRatio = matchCount / requiredEquipment.length;

  if (matchRatio >= 0.8) {
    return { score: 92, note: `${matchCount}/${requiredEquipment.length} equipment types` };
  } else if (matchRatio >= 0.5) {
    return { score: 78, note: `Partial match (${matchCount}/${requiredEquipment.length})` };
  }
  return { score: 60, note: 'Limited equipment experience' };
}

function calculateExperienceMatch(driver, req) {
  const driverYears = driver.years_experience || 0;
  const requiredYears = req.min_experience_years || 0;

  if (driverYears >= requiredYears + 2) {
    return { score: 95, note: `${driverYears} yrs exceeds ${requiredYears} yr requirement` };
  } else if (driverYears >= requiredYears) {
    return { score: 88, note: `${driverYears} yrs meets requirement` };
  } else if (driverYears >= requiredYears - 1) {
    return { score: 72, note: `${driverYears} yrs slightly below requirement` };
  }
  return { score: 55, note: `${driverYears} yrs below ${requiredYears} yr requirement` };
}

function calculateCompensationFit(driver, req) {
  const driverMin = driver.min_weekly_pay || 0;
  const driverTarget = driver.target_weekly_pay || 0;
  const jobMin = req.pay_min || 0;
  const jobMax = req.pay_max || 0;

  if (!jobMax || !driverMin) {
    return { score: 80, note: 'Compensation not fully specified' };
  }

  if (jobMax >= driverTarget && jobMin >= driverMin * 0.9) {
    return { score: 92, note: `$${jobMin}-$${jobMax}/wk meets target` };
  } else if (jobMax >= driverMin) {
    return { score: 80, note: 'Meets minimum pay requirements' };
  }
  return { score: 60, note: `Pay below driver minimum ($${driverMin}/wk)` };
}

function calculateBackgroundEligibility(driver, req) {
  const issues = [];

  if (driver.mvr_status === 'Has Violations') {
    const violations = driver.mvr_violations_3yr || 0;
    const maxAllowed = req.max_mvr_violations || 2;
    if (violations > maxAllowed) {
      issues.push(`${violations} MVR violations`);
    }
  }

  const accidents = driver.mvr_accidents_3yr || 0;
  const maxAccidents = req.max_accidents || 1;
  if (accidents > maxAccidents) {
    issues.push(`${accidents} accidents`);
  }

  if (driver.clearinghouse_status === 'Prohibited') {
    issues.push('Clearinghouse prohibited');
  }

  if (issues.length === 0) {
    return { score: 95, note: 'Clean background' };
  } else if (issues.length === 1) {
    return { score: 75, note: issues[0] };
  }
  return { score: 55, note: issues.join('; ') };
}

function calculateJobRequirementsMatch(driver, req) {
  const issues = [];
  const matches = [];

  // Touch Freight (Very Light, Light, Medium, Heavy)
  const jobTouchFreight = (req.touch_freight || 'very light').toLowerCase();
  const driverWillingTouch = driver.willing_touch_freight;

  if (driverWillingTouch === true) {
    matches.push('touch freight OK');
  } else if (driverWillingTouch === false) {
    // Driver doesn't want touch freight
    if (jobTouchFreight === 'heavy') {
      issues.push('heavy touch freight required');
    } else if (jobTouchFreight === 'medium') {
      issues.push('medium touch freight required');
    } else if (jobTouchFreight === 'light') {
      // Light touch might be acceptable, minor concern
      matches.push('light touch only');
    }
    // Very Light is minimal, usually acceptable
  }

  // Endorsements
  const jobEndorsements = (req.endorsements_required || '').toLowerCase();
  const driverEndorsements = (driver.endorsements || '').toLowerCase();

  if (jobEndorsements) {
    const required = jobEndorsements.split(',').map(e => e.trim()).filter(Boolean);
    for (const endorsement of required) {
      if (!driverEndorsements.includes(endorsement.charAt(0))) {
        issues.push(`missing ${endorsement}`);
      }
    }
  }

  // CDL Class
  const jobCDL = (req.cdl_class || '').toUpperCase();
  const driverCDL = (driver.cdl_class || '').toUpperCase();

  if (jobCDL === 'A' && driverCDL === 'B') {
    issues.push('needs CDL-A');
  }

  if (issues.length === 0) {
    return { score: 95, note: matches.join(', ') || 'Meets all requirements' };
  } else if (issues.length === 1) {
    return { score: 70, note: issues[0] };
  }
  return { score: 50, note: issues.join('; ') };
}

function calculateCommuteMatch(driver, req) {
  const driverZip = String(driver.zipcode || driver.zipcodeFromApplication || '').slice(0, 5);
  const yardZip = String(req.yard_zip || '').slice(0, 5);

  if (!driverZip || !yardZip) {
    return { score: 80, note: 'Commute not calculable' };
  }

  const driverPrefix3 = driverZip.slice(0, 3);
  const yardPrefix3 = yardZip.slice(0, 3);

  if (driverZip === yardZip) {
    return { score: 98, note: 'Same zip code' };
  } else if (driverPrefix3 === yardPrefix3) {
    return { score: 92, note: 'Same metro area' };
  } else if (driverZip.slice(0, 2) === yardZip.slice(0, 2)) {
    return { score: 78, note: 'Same region' };
  }
  return { score: 50, note: 'Different regions' };
}

async function generateRecommendation(driverData, reqData, fitScores) {
  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: `You are a Career Agent making a hiring recommendation. Write 2-3 sentences: why this driver fits (or doesn't fit) this job, key points, and your recommendation (proceed/conditional/not recommended). Be direct.`,
        },
        {
          role: 'user',
          content: `Driver: ${driverData.fullName || 'Unknown'}, ${driverData.years_experience || 0} yrs exp, CDL-${driverData.cdl_class || '?'}, ${driverData.city || ''} ${driverData.state || ''}\n\nJob: ${reqData.title} at ${reqData.employer}, ${reqData.location}, $${reqData.pay_min}-$${reqData.pay_max}/wk, ${reqData.route_type}\n\nFit Score: ${fitScores.overallScore}/100`,
        },
      ],
      max_tokens: 150,
    });

    return response.choices[0].message.content;
  } catch (err) {
    console.error('Recommendation error:', err);
    return `Fit score: ${fitScores.overallScore}/100. Review details before proceeding.`;
  }
}
