/**
 * Job Fit Scoring System
 * Calculates match scores between drivers and job requisitions
 */

export function calculateFitScores(driver, requisition) {
  const dimensions = [];

  // 1. Route & Schedule Match
  const routeScore = calculateRouteMatch(driver, requisition);
  dimensions.push({
    name: 'Route & Schedule Match',
    score: routeScore.score,
    note: routeScore.note,
  });

  // 2. Equipment Match
  const equipmentScore = calculateEquipmentMatch(driver, requisition);
  dimensions.push({
    name: 'Equipment Match',
    score: equipmentScore.score,
    note: equipmentScore.note,
  });

  // 3. Experience Match
  const experienceScore = calculateExperienceMatch(driver, requisition);
  dimensions.push({
    name: 'Experience Match',
    score: experienceScore.score,
    note: experienceScore.note,
  });

  // 4. Compensation Fit
  const compScore = calculateCompensationFit(driver, requisition);
  dimensions.push({
    name: 'Compensation Fit',
    score: compScore.score,
    note: compScore.note,
  });

  // 5. Background Eligibility
  const backgroundScore = calculateBackgroundEligibility(driver, requisition);
  dimensions.push({
    name: 'Background Eligibility',
    score: backgroundScore.score,
    note: backgroundScore.note,
  });

  // 6. Job Requirements Match (touch freight, endorsements, etc.)
  const requirementsScore = calculateJobRequirementsMatch(driver, requisition);
  dimensions.push({
    name: 'Job Requirements',
    score: requirementsScore.score,
    note: requirementsScore.note,
  });

  // 7. Commute Match
  const commuteScore = calculateCommuteMatch(driver, requisition);
  dimensions.push({
    name: 'Commute',
    score: commuteScore.score,
    note: commuteScore.note,
  });

  // Calculate overall score (weighted average)
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

  return {
    overallScore,
    dimensions,
  };
}

function calculateRouteMatch(driver, req) {
  const driverPref = (driver.home_time_preference || '').toLowerCase();
  const jobType = (req.route_type || '').toLowerCase();

  // Simple matching logic
  const prefMap = {
    'daily': ['local', 'home daily'],
    'weekly': ['regional', 'home weekly'],
    'bi-weekly': ['otr', 'regional'],
    'flexible': ['local', 'regional', 'otr'],
  };

  const acceptableTypes = prefMap[driverPref] || ['local', 'regional'];
  const match = acceptableTypes.some(t => jobType.includes(t));

  if (match) {
    return {
      score: 94,
      note: `Driver's ${driverPref || 'flexible'} preference aligns with ${req.route_type} schedule`,
    };
  }

  return {
    score: 70,
    note: `Driver prefers ${driverPref || 'flexible'} home time; job is ${req.route_type}`,
  };
}

// Equipment synonyms - treat these as equivalent
const EQUIPMENT_SYNONYMS = {
  'straight truck': ['box truck', 'straight truck', 'box van'],
  'box truck': ['straight truck', 'box truck', 'box van'],
  'tractor trailer': ['tractor-trailer', 'semi', 'tractor and semi-trailer', '18 wheeler'],
  'dry van': ['van', 'dry van', '53 van'],
  'reefer': ['refrigerated', 'reefer', 'temp controlled'],
  'flatbed': ['flatbed', 'flat bed'],
};

function equipmentMatches(driverType, requiredType) {
  const d = driverType.toLowerCase();
  const r = requiredType.toLowerCase();

  // Direct match
  if (d.includes(r) || r.includes(d)) return true;

  // Check synonyms
  for (const [key, synonyms] of Object.entries(EQUIPMENT_SYNONYMS)) {
    const driverMatches = synonyms.some(s => d.includes(s));
    const reqMatches = synonyms.some(s => r.includes(s));
    if (driverMatches && reqMatches) return true;
  }

  return false;
}

function calculateEquipmentMatch(driver, req) {
  const driverEquipment = driver.equipment_experience || [];

  // Parse equipment_types - could be string or array
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
    return {
      score: 92,
      note: `Driver has experience with ${matchCount}/${requiredEquipment.length} required equipment types`,
    };
  } else if (matchRatio >= 0.5) {
    return {
      score: 78,
      note: `Partial equipment match (${matchCount}/${requiredEquipment.length} types)`,
    };
  }

  return {
    score: 60,
    note: `Limited equipment experience for this role`,
  };
}

function calculateExperienceMatch(driver, req) {
  const driverYears = driver.years_experience || 0;
  const requiredYears = req.min_experience_years || 0;

  if (driverYears >= requiredYears + 2) {
    return {
      score: 95,
      note: `${driverYears} years experience exceeds ${requiredYears} year requirement`,
    };
  } else if (driverYears >= requiredYears) {
    return {
      score: 88,
      note: `${driverYears} years experience meets ${requiredYears} year requirement`,
    };
  } else if (driverYears >= requiredYears - 1) {
    return {
      score: 72,
      note: `${driverYears} years experience slightly below ${requiredYears} year requirement`,
    };
  }

  return {
    score: 55,
    note: `${driverYears} years experience below ${requiredYears} year requirement`,
  };
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
    return {
      score: 92,
      note: `Pay range ($${jobMin}-$${jobMax}/wk) meets driver's target of $${driverTarget}/wk`,
    };
  } else if (jobMax >= driverMin) {
    return {
      score: 80,
      note: `Pay range meets minimum requirements`,
    };
  }

  return {
    score: 60,
    note: `Pay range ($${jobMin}-$${jobMax}/wk) below driver's minimum of $${driverMin}/wk`,
  };
}

function calculateBackgroundEligibility(driver, req) {
  const issues = [];

  // Check MVR
  if (driver.mvr_status === 'Has Violations') {
    const violations = driver.mvr_violations_3yr || 0;
    const maxAllowed = req.max_mvr_violations || 2;
    if (violations > maxAllowed) {
      issues.push(`${violations} MVR violations exceeds ${maxAllowed} max`);
    }
  }

  // Check accidents
  const accidents = driver.mvr_accidents_3yr || 0;
  const maxAccidents = req.max_accidents || 1;
  if (accidents > maxAccidents) {
    issues.push(`${accidents} accidents exceeds ${maxAccidents} max`);
  }

  // Check clearinghouse
  if (driver.clearinghouse_status === 'Prohibited') {
    issues.push('Prohibited in FMCSA Clearinghouse');
  }

  // Check experience
  const yearsExp = driver.years_experience || 0;
  const minExp = req.min_experience_years || 0;
  if (yearsExp < minExp) {
    issues.push(`${yearsExp} years experience below ${minExp} year minimum`);
  }

  if (issues.length === 0) {
    return {
      score: 95,
      note: 'Clean background meets all employer requirements',
    };
  } else if (issues.length === 1) {
    return {
      score: 75,
      note: issues[0],
    };
  }

  return {
    score: 55,
    note: `Multiple concerns: ${issues.join('; ')}`,
  };
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

    for (const endorsement of required) {
      // Check common endorsement codes
      const endorsementMap = {
        'hazmat': ['h', 'hazmat', 'haz-mat'],
        'tanker': ['n', 'tanker', 'tank'],
        'doubles': ['t', 'doubles', 'triples', 'doubles/triples'],
        'passenger': ['p', 'passenger'],
      };

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

      if (!found && required.length > 0) {
        issues.push(`missing ${endorsement} endorsement`);
      }
    }
  }

  // 3. CDL Class match (basic check)
  const jobCDL = (req.cdl_class || '').toUpperCase();
  const driverCDL = (driver.cdl_class || '').toUpperCase();

  if (jobCDL && driverCDL) {
    if (jobCDL === 'A' && driverCDL === 'B') {
      issues.push('job requires CDL-A, driver has CDL-B');
    } else {
      matches.push(`CDL-${driverCDL} meets requirement`);
    }
  }

  // Calculate score based on issues
  if (issues.length === 0) {
    return {
      score: 95,
      note: matches.length > 0 ? `Meets all requirements: ${matches.slice(0, 2).join(', ')}` : 'Meets all job requirements',
    };
  } else if (issues.length === 1) {
    return {
      score: 70,
      note: `Concern: ${issues[0]}`,
    };
  }

  return {
    score: 50,
    note: `Multiple issues: ${issues.join('; ')}`,
  };
}

function calculateCommuteMatch(driver, req) {
  const driverZip = String(driver.zipcode || driver.zipcodeFromApplication || '').slice(0, 5);
  const yardZip = String(req.yard_zip || '').slice(0, 5);

  if (!driverZip || !yardZip) {
    return { score: 80, note: 'Commute distance not calculable (missing zip code)' };
  }

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
    if (maxCommute >= 25) {
      return { score: 92, note: `Same metro area (${driverZip} → ${yardZip})` };
    }
    return { score: 75, note: `Same metro but driver prefers <${maxCommute} mile commute` };
  } else if (driverPrefix2 === yardPrefix2) {
    if (maxCommute >= 50) {
      return { score: 78, note: `Same region (${driverZip} → ${yardZip}), may be 30-60 miles` };
    }
    return { score: 60, note: `Regional commute may exceed ${maxCommute} mile preference` };
  }

  return { score: 50, note: `Different regions (${driverZip} → ${yardZip}) - may be too far` };
}

export function formatFitSummary(fitScores) {
  const { overallScore, dimensions } = fitScores;

  let recommendation;
  if (overallScore >= 85) {
    recommendation = 'Strong Match - Recommend interview';
  } else if (overallScore >= 70) {
    recommendation = 'Potential Match - Review details';
  } else {
    recommendation = 'Weak Match - May not meet requirements';
  }

  return {
    overallScore,
    recommendation,
    dimensions,
  };
}
