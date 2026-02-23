import OpenAI from 'openai';
import zipcodes from 'zipcodes';

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

export function parseJSON(field, defaultValue = []) {
  if (!field) return defaultValue;
  try {
    return typeof field === 'string' ? JSON.parse(field) : field;
  } catch {
    return defaultValue;
  }
}

export function calculateFitScores(driver, req) {
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
    if (jobTouchFreight === 'heavy') {
      issues.push('heavy touch freight required');
    } else if (jobTouchFreight === 'medium') {
      issues.push('medium touch freight required');
    } else if (jobTouchFreight === 'light') {
      matches.push('light touch only');
    }
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
  const driverZip = String(driver.zipcode || '').slice(0, 5);
  const yardZip = String(req.yard_zip || '').slice(0, 5);

  if (!driverZip || !yardZip) {
    return { score: 80, note: 'Commute not calculable' };
  }

  // Calculate actual distance between zip codes
  const distance = zipcodes.distance(driverZip, yardZip);

  if (distance === null) {
    return { score: 75, note: 'Zip code not found' };
  }

  // Parse driver's max commute preference (e.g., "25 miles", "50 miles", "75 miles", "100+ miles")
  const maxCommutePref = driver.max_commute_miles || '';
  let maxMiles = 100; // Default if not specified

  if (maxCommutePref.includes('25')) maxMiles = 25;
  else if (maxCommutePref.includes('50')) maxMiles = 50;
  else if (maxCommutePref.includes('75')) maxMiles = 75;
  else if (maxCommutePref.includes('100')) maxMiles = 100;

  const distanceRounded = Math.round(distance);

  if (distance <= maxMiles * 0.5) {
    // Well within preference (less than half max)
    return { score: 98, note: `${distanceRounded} mi commute (prefers up to ${maxMiles} mi)` };
  } else if (distance <= maxMiles) {
    // Within preference
    return { score: 90, note: `${distanceRounded} mi commute (within ${maxMiles} mi pref)` };
  } else if (distance <= maxMiles * 1.25) {
    // Slightly over preference
    return { score: 72, note: `${distanceRounded} mi slightly exceeds ${maxMiles} mi pref` };
  } else if (distance <= maxMiles * 1.5) {
    // Over preference but potentially negotiable
    return { score: 60, note: `${distanceRounded} mi exceeds ${maxMiles} mi pref` };
  }
  // Way over preference
  return { score: 40, note: `${distanceRounded} mi far exceeds ${maxMiles} mi pref` };
}

export async function generateRecommendation(driverData, reqData, fitScores) {
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
