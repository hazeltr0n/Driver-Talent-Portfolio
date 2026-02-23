/**
 * FitKit Scoring Algorithms
 *
 * Implements scoring for:
 * - RIASEC interest profile
 * - Work values ranking
 * - O*NET occupation matching
 * - Trucking gate decision
 * - Personality facets
 * - Grit score
 * - Trucking fit score
 * - Retention risk
 * - Vertical matching
 */

import {
  MINI_IP_ITEMS,
  WORK_VALUES_ITEMS,
  FACET_ITEMS,
  GRIT_ITEMS,
  RIASEC_TYPES,
  WORK_VALUE_TYPES,
} from './fitkit-items.js';

// ============================================================
// STAGE 1: CAREER COMPASS SCORING
// ============================================================

/**
 * Calculate RIASEC scores from Mini-IP responses
 * @param {Object} responses - Map of item code to response value (1-5)
 * @returns {Object} RIASEC scores and code
 */
export function calculateRIASEC(responses) {
  const typeScores = { R: 0, I: 0, A: 0, S: 0, E: 0, C: 0 };
  const typeCounts = { R: 0, I: 0, A: 0, S: 0, E: 0, C: 0 };

  for (const item of MINI_IP_ITEMS) {
    const response = responses[item.code];
    if (response !== undefined) {
      typeScores[item.type] += response;
      typeCounts[item.type]++;
    }
  }

  // Raw scores (range: 5-25 per type)
  const raw = {};
  for (const type of Object.keys(typeScores)) {
    raw[type] = typeScores[type];
  }

  // Standardized scores (approximate z-score)
  // Mean = 15, SD = 4 for 5 items at 1-5 scale
  const standardized = {};
  for (const type of Object.keys(typeScores)) {
    standardized[type] = (typeScores[type] - 15) / 4;
  }

  // Get top 3 types for Holland code
  const sortedTypes = Object.entries(raw)
    .sort((a, b) => b[1] - a[1])
    .map(([type]) => type);

  const code = sortedTypes.slice(0, 3).join('');
  const primaryType = sortedTypes[0];

  return {
    raw,
    standardized,
    code,
    primaryType,
    types: sortedTypes.map(type => ({
      code: type,
      ...RIASEC_TYPES[type],
      score: raw[type],
      zScore: standardized[type],
    })),
  };
}

/**
 * Calculate work value scores
 * @param {Object} responses - Map of item code to response value (1-5)
 * @returns {Object} Work value scores and ranking
 */
export function calculateWorkValues(responses) {
  const valueScores = {
    achievement: 0,
    independence: 0,
    recognition: 0,
    relationships: 0,
    support: 0,
    conditions: 0,
  };
  const valueCounts = { ...valueScores };

  for (const item of WORK_VALUES_ITEMS) {
    const response = responses[item.code];
    if (response !== undefined) {
      valueScores[item.type] += response;
      valueCounts[item.type]++;
    }
  }

  // Raw scores (range: 2-10 per value)
  const raw = { ...valueScores };

  // Normalized to 0-100 scale
  const normalized = {};
  for (const value of Object.keys(valueScores)) {
    // (raw - min) / (max - min) * 100
    normalized[value] = Math.round(((valueScores[value] - 2) / 8) * 100);
  }

  // Rank values
  const ranked = Object.entries(raw)
    .sort((a, b) => b[1] - a[1])
    .map(([value, score], index) => ({
      value,
      ...WORK_VALUE_TYPES[value],
      score,
      normalized: normalized[value],
      rank: index + 1,
    }));

  return {
    raw,
    normalized,
    ranked,
    top3: ranked.slice(0, 3),
  };
}

// RIASEC hexagon adjacency for congruence calculation
const RIASEC_ADJACENT = {
  R: ['I', 'C'],
  I: ['R', 'A'],
  A: ['I', 'S'],
  S: ['A', 'E'],
  E: ['S', 'C'],
  C: ['E', 'R'],
};

/**
 * Calculate congruence score between person's RIASEC and occupation's code
 * @param {string} personCode - 3-letter RIASEC code (e.g., "RCE")
 * @param {string} occupationCode - 2-3 letter occupation code (e.g., "RC")
 * @returns {number} Congruence score (0-6)
 */
export function calculateCongruence(personCode, occupationCode) {
  let score = 0;
  const personTypes = personCode.split('');
  const occTypes = occupationCode.split('');

  // First letter match: +3 points
  if (personTypes[0] === occTypes[0]) {
    score += 3;
  } else if (occTypes.includes(personTypes[0])) {
    score += 2; // Person's primary in occupation's code
  } else if (RIASEC_ADJACENT[personTypes[0]]?.includes(occTypes[0])) {
    score += 0.5; // Adjacent match
  }

  // Second letter match: +2 points
  if (personTypes[1] && occTypes[1] && personTypes[1] === occTypes[1]) {
    score += 2;
  } else if (occTypes.includes(personTypes[1])) {
    score += 1;
  }

  // Third letter match: +1 point
  if (personTypes[2] && occTypes.includes(personTypes[2])) {
    score += 1;
  }

  return score;
}

// Trucking-related O*NET occupation codes
const TRUCKING_OCCUPATIONS = [
  { code: '53-3032.00', title: 'Heavy and Tractor-Trailer Truck Drivers', riasec: 'RC' },
  { code: '53-3033.00', title: 'Light Truck Drivers', riasec: 'RC' },
  { code: '53-3052.00', title: 'Bus Drivers, Transit and Intercity', riasec: 'RS' },
  { code: '53-3031.00', title: 'Driver/Sales Workers', riasec: 'EC' },
  { code: '53-1031.00', title: 'First-Line Supervisors of Transportation Workers', riasec: 'EC' },
];

// Sample O*NET occupations for matching (top ~100 accessible occupations)
// This would ideally come from a full O*NET database or API
const SAMPLE_OCCUPATIONS = [
  // Transportation & Logistics
  { code: '53-3032.00', title: 'Heavy and Tractor-Trailer Truck Drivers', riasec: 'RC', cluster: 'Transportation' },
  { code: '53-3033.00', title: 'Light Truck Drivers', riasec: 'RC', cluster: 'Transportation' },
  { code: '53-3052.00', title: 'Bus Drivers, Transit and Intercity', riasec: 'RS', cluster: 'Transportation' },
  { code: '53-7062.00', title: 'Laborers and Freight Movers', riasec: 'RC', cluster: 'Transportation' },
  { code: '53-7051.00', title: 'Industrial Truck Operators', riasec: 'RC', cluster: 'Transportation' },
  { code: '43-5071.00', title: 'Shipping and Receiving Clerks', riasec: 'CR', cluster: 'Transportation' },
  { code: '43-5061.00', title: 'Production, Planning, and Expediting Clerks', riasec: 'CE', cluster: 'Transportation' },
  { code: '53-1031.00', title: 'First-Line Supervisors of Transportation Workers', riasec: 'EC', cluster: 'Transportation' },

  // Construction & Trades
  { code: '47-2061.00', title: 'Construction Laborers', riasec: 'RC', cluster: 'Construction' },
  { code: '47-2111.00', title: 'Electricians', riasec: 'RI', cluster: 'Construction' },
  { code: '47-2152.00', title: 'Plumbers', riasec: 'RC', cluster: 'Construction' },
  { code: '47-2031.00', title: 'Carpenters', riasec: 'RC', cluster: 'Construction' },
  { code: '47-2211.00', title: 'Sheet Metal Workers', riasec: 'RC', cluster: 'Construction' },
  { code: '47-2221.00', title: 'Structural Iron and Steel Workers', riasec: 'RC', cluster: 'Construction' },
  { code: '51-4121.00', title: 'Welders', riasec: 'RC', cluster: 'Manufacturing' },
  { code: '49-3023.00', title: 'Automotive Technicians', riasec: 'RI', cluster: 'Maintenance' },
  { code: '49-3031.00', title: 'Bus and Truck Mechanics', riasec: 'RC', cluster: 'Maintenance' },
  { code: '49-9071.00', title: 'Maintenance and Repair Workers', riasec: 'RC', cluster: 'Maintenance' },

  // Manufacturing & Production
  { code: '51-9061.00', title: 'Inspectors and Testers', riasec: 'RC', cluster: 'Manufacturing' },
  { code: '51-2092.00', title: 'Team Assemblers', riasec: 'RC', cluster: 'Manufacturing' },
  { code: '51-4041.00', title: 'Machinists', riasec: 'RI', cluster: 'Manufacturing' },
  { code: '51-9111.00', title: 'Packaging Machine Operators', riasec: 'RC', cluster: 'Manufacturing' },
  { code: '53-7063.00', title: 'Machine Feeders', riasec: 'RC', cluster: 'Manufacturing' },

  // Warehousing & Logistics
  { code: '43-5111.00', title: 'Weighers and Measurers', riasec: 'CR', cluster: 'Logistics' },
  { code: '43-5081.00', title: 'Stock Clerks', riasec: 'CR', cluster: 'Logistics' },
  { code: '53-7064.00', title: 'Packers and Packagers', riasec: 'RC', cluster: 'Logistics' },
  { code: '11-3071.00', title: 'Transportation and Logistics Managers', riasec: 'EC', cluster: 'Logistics' },

  // Office & Administrative
  { code: '43-6014.00', title: 'Secretaries and Administrative Assistants', riasec: 'CE', cluster: 'Office' },
  { code: '43-3031.00', title: 'Bookkeeping Clerks', riasec: 'CE', cluster: 'Office' },
  { code: '43-4051.00', title: 'Customer Service Representatives', riasec: 'SE', cluster: 'Office' },
  { code: '43-9061.00', title: 'Office Clerks', riasec: 'CE', cluster: 'Office' },
  { code: '43-4171.00', title: 'Receptionists', riasec: 'CS', cluster: 'Office' },

  // Sales & Service
  { code: '41-2031.00', title: 'Retail Salespersons', riasec: 'ES', cluster: 'Sales' },
  { code: '41-4012.00', title: 'Sales Representatives', riasec: 'ES', cluster: 'Sales' },
  { code: '35-3023.00', title: 'Fast Food Workers', riasec: 'RC', cluster: 'Food Service' },
  { code: '35-2014.00', title: 'Cooks', riasec: 'RC', cluster: 'Food Service' },
  { code: '37-2011.00', title: 'Janitors and Cleaners', riasec: 'RC', cluster: 'Service' },
  { code: '33-9032.00', title: 'Security Guards', riasec: 'SE', cluster: 'Service' },
  { code: '39-9011.00', title: 'Childcare Workers', riasec: 'SA', cluster: 'Service' },

  // Healthcare Support
  { code: '31-1120.00', title: 'Home Health Aides', riasec: 'SR', cluster: 'Healthcare' },
  { code: '31-1131.00', title: 'Nursing Assistants', riasec: 'SR', cluster: 'Healthcare' },
  { code: '31-9092.00', title: 'Medical Assistants', riasec: 'SC', cluster: 'Healthcare' },

  // Social Services
  { code: '21-1093.00', title: 'Social and Human Service Assistants', riasec: 'SE', cluster: 'Social Services' },
  { code: '21-1021.00', title: 'Child and Family Social Workers', riasec: 'SA', cluster: 'Social Services' },

  // Technology
  { code: '15-1232.00', title: 'Computer User Support Specialists', riasec: 'IC', cluster: 'Technology' },
  { code: '15-1244.00', title: 'Network Technicians', riasec: 'IR', cluster: 'Technology' },
  { code: '49-2022.00', title: 'Telecommunications Equipment Installers', riasec: 'RI', cluster: 'Technology' },

  // Agriculture & Outdoor
  { code: '45-2092.00', title: 'Farmworkers and Laborers', riasec: 'RC', cluster: 'Agriculture' },
  { code: '37-3011.00', title: 'Landscaping Workers', riasec: 'RC', cluster: 'Agriculture' },
  { code: '37-3012.00', title: 'Pesticide Handlers', riasec: 'RC', cluster: 'Agriculture' },
];

/**
 * Match RIASEC profile to O*NET occupations
 * @param {string} riasecCode - 3-letter RIASEC code
 * @param {Object} workValues - Work values scores
 * @returns {Object} Matched occupations and trucking gate result
 */
export function matchOccupations(riasecCode, workValues) {
  // Calculate congruence for each occupation
  const matches = SAMPLE_OCCUPATIONS.map(occ => ({
    ...occ,
    congruence: calculateCongruence(riasecCode, occ.riasec),
  }));

  // Sort by congruence score
  matches.sort((a, b) => b.congruence - a.congruence);

  // Get top 20 matches
  const topMatches = matches.slice(0, 20);

  // Check if trucking is in top 15
  const truckingCodes = TRUCKING_OCCUPATIONS.map(t => t.code);
  const truckingInTop15 = topMatches.slice(0, 15).some(m => truckingCodes.includes(m.code));

  // Find trucking occupations and their ranks
  const truckingMatches = [];
  matches.forEach((m, index) => {
    if (truckingCodes.includes(m.code)) {
      truckingMatches.push({ ...m, rank: index + 1 });
    }
  });

  // Group by cluster
  const clusters = {};
  for (const match of topMatches) {
    if (!clusters[match.cluster]) {
      clusters[match.cluster] = [];
    }
    clusters[match.cluster].push(match);
  }

  return {
    topMatches,
    clusters,
    truckingGatePassed: truckingInTop15,
    truckingMatches,
    bestTruckingMatch: truckingMatches[0] || null,
  };
}

/**
 * Complete Stage 1 scoring
 * @param {Object} responses - All Stage 1 responses
 * @returns {Object} Complete Stage 1 results
 */
export function scoreStage1(responses) {
  const riasec = calculateRIASEC(responses);
  const workValues = calculateWorkValues(responses);
  const occupations = matchOccupations(riasec.code, workValues);

  return {
    riasec,
    workValues,
    occupations,
    truckingGatePassed: occupations.truckingGatePassed,
  };
}

// ============================================================
// STAGE 2: TRUCKING FIT SCORING
// ============================================================

/**
 * Calculate personality facet scores
 * @param {Object} responses - Map of item code to response value (1-5)
 * @returns {Object} Facet scores
 */
export function calculateFacets(responses) {
  const facetScores = {
    empathy: 0,
    anxiety: 0,
    excitement: 0,
    discipline: 0,
    immoderation: 0,
    dutifulness: 0,
  };
  const facetCounts = { ...facetScores };

  for (const item of FACET_ITEMS) {
    let response = responses[item.code];
    if (response !== undefined) {
      // Reverse score if needed
      if (item.reverse) {
        response = 6 - response;
      }
      facetScores[item.facet] += response;
      facetCounts[item.facet]++;
    }
  }

  // Raw scores (range: 4-20 per facet)
  const raw = { ...facetScores };

  // Standardized scores (approximate z-score)
  // Mean = 12, SD = 3.2 for 4 items at 1-5 scale
  const standardized = {};
  for (const facet of Object.keys(facetScores)) {
    standardized[facet] = (facetScores[facet] - 12) / 3.2;
  }

  return { raw, standardized };
}

/**
 * Calculate Grit score
 * @param {Object} responses - Map of item code to response value (1-5)
 * @returns {Object} Grit scores
 */
export function calculateGrit(responses) {
  const subscaleScores = { consistency: 0, perseverance: 0 };
  const subscaleCounts = { consistency: 0, perseverance: 0 };

  for (const item of GRIT_ITEMS) {
    let response = responses[item.code];
    if (response !== undefined) {
      // Reverse score if needed
      if (item.reverse) {
        response = 6 - response;
      }
      subscaleScores[item.subscale] += response;
      subscaleCounts[item.subscale]++;
    }
  }

  // Raw scores (range: 4-20 per subscale)
  const raw = { ...subscaleScores };

  // Total grit (range: 8-40)
  const total = raw.consistency + raw.perseverance;

  // Average grit (1-5 scale, as in original Grit-S)
  const average = total / 8;

  // Standardized (mean=24, SD=5 for 8 items)
  const standardized = (total - 24) / 5;

  return {
    raw,
    total,
    average,
    standardized,
    subscales: {
      consistency: {
        raw: raw.consistency,
        standardized: (raw.consistency - 12) / 2.5,
      },
      perseverance: {
        raw: raw.perseverance,
        standardized: (raw.perseverance - 12) / 2.5,
      },
    },
  };
}

/**
 * Calculate Trucking Fit Score
 * Based on Wilmot et al. (2019) findings on facet-accident relationships
 *
 * @param {Object} facets - Standardized facet scores
 * @param {Object} grit - Grit scores
 * @returns {Object} Trucking fit score and components
 */
export function calculateTruckingFitScore(facets, grit) {
  const z = facets.standardized;
  const gritZ = grit.standardized;

  // Positive factors (higher = better)
  const positiveFactors = {
    empathy: 0.20 * z.empathy,
    discipline: 0.20 * z.discipline,
    dutifulness: 0.15 * z.dutifulness,
    grit: 0.15 * gritZ,
  };

  // Negative factors (lower = better, so we flip the sign)
  const negativeFactors = {
    anxiety: 0.10 * (-z.anxiety),
    excitement: 0.10 * (-z.excitement),
    immoderation: 0.10 * (-z.immoderation),
  };

  // Calculate weighted sum
  const weightedSum =
    positiveFactors.empathy +
    positiveFactors.discipline +
    positiveFactors.dutifulness +
    positiveFactors.grit +
    negativeFactors.anxiety +
    negativeFactors.excitement +
    negativeFactors.immoderation;

  // Transform to 0-100 scale (mean=50, SD~10)
  let score = 50 + 10 * weightedSum;

  // Clamp to 0-100
  score = Math.max(0, Math.min(100, Math.round(score)));

  return {
    score,
    components: {
      positive: positiveFactors,
      negative: negativeFactors,
    },
    weightedSum,
  };
}

/**
 * Classify retention risk based on fit score
 * @param {number} fitScore - Trucking fit score (0-100)
 * @returns {Object} Retention risk level and message
 */
export function classifyRetentionRisk(fitScore) {
  if (fitScore >= 60) {
    return {
      level: 'low',
      label: 'Low',
      color: '#22c55e', // green
      message: 'Strong predicted retention. This person\'s profile aligns well with trucking demands.',
    };
  } else if (fitScore >= 45) {
    return {
      level: 'medium',
      label: 'Medium',
      color: '#eab308', // yellow
      message: 'Moderate retention risk. Some facets may need coaching attention.',
    };
  } else {
    return {
      level: 'high',
      label: 'High',
      color: '#ef4444', // red
      message: 'Elevated retention risk. Consider whether trucking is the best fit, or provide enhanced support.',
    };
  }
}

/**
 * Calculate best-fit trucking vertical
 * @param {Object} facets - Standardized facet scores
 * @param {Object} grit - Grit scores
 * @param {Object} workValues - Work values scores (normalized)
 * @returns {Object} Vertical scores and recommendation
 */
export function calculateVerticalFit(facets, grit, workValues) {
  const z = facets.standardized;
  const gritZ = grit.standardized;

  // Normalize work values to z-scores (0-100 -> -2 to 2)
  const vNorm = {};
  for (const [key, value] of Object.entries(workValues.normalized)) {
    vNorm[key] = (value - 50) / 25;
  }

  // OTR fit: independence, grit, low excitement, discipline
  const otrFit =
    0.3 * vNorm.independence +
    0.3 * gritZ +
    0.2 * (-z.excitement) +
    0.2 * z.discipline;

  // Local fit: relationships, dutifulness, empathy, low anxiety
  const localFit =
    0.3 * vNorm.relationships +
    0.3 * z.dutifulness +
    0.2 * z.empathy +
    0.2 * (-z.anxiety);

  // Dedicated fit: dutifulness, discipline, low excitement, support values
  const dedicatedFit =
    0.4 * z.dutifulness +
    0.3 * z.discipline +
    0.2 * (-z.excitement) +
    0.1 * vNorm.support;

  // Tanker fit: discipline, dutifulness, low immoderation, low anxiety
  const tankerFit =
    0.4 * z.discipline +
    0.3 * z.dutifulness +
    0.2 * (-z.immoderation) +
    0.1 * (-z.anxiety);

  // Regional fit: balance of OTR and Local
  const regionalFit = (otrFit + localFit) / 2;

  const verticals = [
    { id: 'otr', name: 'Over-the-Road (OTR)', score: otrFit },
    { id: 'regional', name: 'Regional', score: regionalFit },
    { id: 'local', name: 'Local', score: localFit },
    { id: 'dedicated', name: 'Dedicated', score: dedicatedFit },
    { id: 'tanker', name: 'Tanker/Hazmat', score: tankerFit },
  ];

  // Normalize scores to 0-100 range for display
  const maxScore = Math.max(...verticals.map(v => v.score));
  const minScore = Math.min(...verticals.map(v => v.score));
  const range = maxScore - minScore || 1;

  const normalizedVerticals = verticals.map(v => ({
    ...v,
    rawScore: v.score,
    score: Math.round(50 + (v.score - (maxScore + minScore) / 2) * 25),
  }));

  // Sort by score
  normalizedVerticals.sort((a, b) => b.score - a.score);

  return {
    verticals: normalizedVerticals,
    best: normalizedVerticals[0],
    second: normalizedVerticals[1],
  };
}

/**
 * Generate coaching notes based on profile
 * @param {Object} facets - Facet scores
 * @param {Object} grit - Grit scores
 * @param {Object} verticalFit - Vertical fit results
 * @returns {Array} Coaching recommendations
 */
export function generateCoachingNotes(facets, grit, verticalFit) {
  const z = facets.standardized;
  const gritZ = grit.standardized;
  const notes = [];

  // High excitement + high grit
  if (z.excitement > 0.5 && gritZ > 0.5) {
    notes.push({
      type: 'info',
      title: 'Variety Seeker',
      text: 'You may get bored on long OTR runs. Consider dedicated routes with more variety, or set personal challenges to stay engaged.',
    });
  }

  // High anxiety + low discipline
  if (z.anxiety > 0.5 && z.discipline < -0.5) {
    notes.push({
      type: 'warning',
      title: 'Stress Management',
      text: 'Trucking\'s unpredictability may be stressful. Work on routines and coping strategies. Consider local routes with more predictability.',
    });
  }

  // Low empathy + high dutifulness
  if (z.empathy < -0.5 && z.dutifulness > 0.5) {
    notes.push({
      type: 'info',
      title: 'Customer Interaction',
      text: 'You\'ll follow rules well but may find customer service challenging. Practice patience with shippers/receivers.',
    });
  }

  // High grit + low excitement
  if (gritZ > 0.5 && z.excitement < -0.5) {
    notes.push({
      type: 'positive',
      title: 'Built for the Long Haul',
      text: 'You\'re well-suited for OTR work. Your persistence will serve you well through the tough first year.',
    });
  }

  // Low grit + high relationships value
  if (gritZ < -0.5) {
    notes.push({
      type: 'warning',
      title: 'Consider Home Time',
      text: 'Local routes with daily home time and regular customer relationships may suit you better than isolated OTR work.',
    });
  }

  // High discipline + high dutifulness
  if (z.discipline > 0.5 && z.dutifulness > 0.5) {
    notes.push({
      type: 'positive',
      title: 'Safety First',
      text: 'Your conscientiousness makes you an excellent candidate for safety-critical roles like tanker or hazmat.',
    });
  }

  // High immoderation
  if (z.immoderation > 0.5) {
    notes.push({
      type: 'warning',
      title: 'Self-Care Awareness',
      text: 'Be mindful of impulse control on the road. Develop routines for healthy eating and rest.',
    });
  }

  // Add vertical-specific note
  const best = verticalFit.best;
  notes.push({
    type: 'recommendation',
    title: `Best Fit: ${best.name}`,
    text: `Based on your profile, ${best.name} trucking aligns well with your strengths and values.`,
  });

  return notes;
}

/**
 * Complete Stage 2 scoring
 * @param {Object} responses - All Stage 2 responses
 * @param {Object} stage1Results - Results from Stage 1 (for work values)
 * @returns {Object} Complete Stage 2 results
 */
export function scoreStage2(responses, stage1Results) {
  const facets = calculateFacets(responses);
  const grit = calculateGrit(responses);
  const fitScore = calculateTruckingFitScore(facets, grit);
  const retentionRisk = classifyRetentionRisk(fitScore.score);
  const verticalFit = calculateVerticalFit(facets, grit, stage1Results.workValues);
  const coachingNotes = generateCoachingNotes(facets, grit, verticalFit);

  return {
    facets,
    grit,
    truckingFitScore: fitScore.score,
    fitScoreDetails: fitScore,
    retentionRisk,
    verticalFit,
    coachingNotes,
  };
}

// ============================================================
// EXPORTS
// ============================================================

export default {
  // Stage 1
  calculateRIASEC,
  calculateWorkValues,
  calculateCongruence,
  matchOccupations,
  scoreStage1,

  // Stage 2
  calculateFacets,
  calculateGrit,
  calculateTruckingFitScore,
  classifyRetentionRisk,
  calculateVerticalFit,
  generateCoachingNotes,
  scoreStage2,
};
