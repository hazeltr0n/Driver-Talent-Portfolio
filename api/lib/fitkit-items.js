/**
 * FitKit Assessment Items
 *
 * Stage 1: Career Compass (42 items)
 * - Mini-IP: 30 items (5 per RIASEC type)
 * - Work Values: 12 items (2 per value)
 *
 * Stage 2: Trucking Fit (32 items)
 * - Personality Facets: 24 items (4 per facet)
 * - Grit-S: 8 items
 *
 * Sources:
 * - Mini-IP: O*NET Interest Profiler (public domain)
 * - Work Values: O*NET Work Importance Locator (public domain)
 * - Facets: IPIP NEO-PI-R facets (public domain)
 * - Grit-S: Duckworth & Quinn 2009 (public domain for research/educational use)
 */

// Response scales
export const LIKERT_INTEREST = [
  { value: 1, label: 'Strongly Dislike' },
  { value: 2, label: 'Dislike' },
  { value: 3, label: 'Neutral' },
  { value: 4, label: 'Like' },
  { value: 5, label: 'Strongly Like' },
];

export const LIKERT_IMPORTANCE = [
  { value: 1, label: 'Not Important' },
  { value: 2, label: 'Slightly Important' },
  { value: 3, label: 'Moderately Important' },
  { value: 4, label: 'Very Important' },
  { value: 5, label: 'Extremely Important' },
];

export const LIKERT_ACCURACY = [
  { value: 1, label: 'Very Inaccurate' },
  { value: 2, label: 'Moderately Inaccurate' },
  { value: 3, label: 'Neither' },
  { value: 4, label: 'Moderately Accurate' },
  { value: 5, label: 'Very Accurate' },
];

export const LIKERT_GRIT = [
  { value: 1, label: 'Not at all like me' },
  { value: 2, label: 'A little like me' },
  { value: 3, label: 'Somewhat like me' },
  { value: 4, label: 'Mostly like me' },
  { value: 5, label: 'Very much like me' },
];

// ============================================================
// STAGE 1: CAREER COMPASS
// ============================================================

/**
 * Mini Interest Profiler (Mini-IP) - 30 items
 * 5 items per RIASEC type
 * Scale: 1-5 (Strongly Dislike to Strongly Like)
 */
export const MINI_IP_ITEMS = [
  // Realistic (R) - Working with things, tools, machines
  { code: 'MINI_IP_R_1', type: 'R', text: 'Build kitchen cabinets', section: 'miniip' },
  { code: 'MINI_IP_R_2', type: 'R', text: 'Lay brick or tile', section: 'miniip' },
  { code: 'MINI_IP_R_3', type: 'R', text: 'Repair household appliances', section: 'miniip' },
  { code: 'MINI_IP_R_4', type: 'R', text: 'Raise fish in a fish hatchery', section: 'miniip' },
  { code: 'MINI_IP_R_5', type: 'R', text: 'Assemble electronic parts', section: 'miniip' },

  // Investigative (I) - Researching, analyzing, problem-solving
  { code: 'MINI_IP_I_1', type: 'I', text: 'Develop a new medicine', section: 'miniip' },
  { code: 'MINI_IP_I_2', type: 'I', text: 'Study ways to reduce water pollution', section: 'miniip' },
  { code: 'MINI_IP_I_3', type: 'I', text: 'Conduct chemical experiments', section: 'miniip' },
  { code: 'MINI_IP_I_4', type: 'I', text: 'Study the movement of planets', section: 'miniip' },
  { code: 'MINI_IP_I_5', type: 'I', text: 'Examine blood samples using a microscope', section: 'miniip' },

  // Artistic (A) - Creating, expressing, designing
  { code: 'MINI_IP_A_1', type: 'A', text: 'Write books or plays', section: 'miniip' },
  { code: 'MINI_IP_A_2', type: 'A', text: 'Play a musical instrument', section: 'miniip' },
  { code: 'MINI_IP_A_3', type: 'A', text: 'Compose or arrange music', section: 'miniip' },
  { code: 'MINI_IP_A_4', type: 'A', text: 'Draw pictures', section: 'miniip' },
  { code: 'MINI_IP_A_5', type: 'A', text: 'Create special effects for movies', section: 'miniip' },

  // Social (S) - Helping, teaching, counseling
  { code: 'MINI_IP_S_1', type: 'S', text: 'Teach an individual an exercise routine', section: 'miniip' },
  { code: 'MINI_IP_S_2', type: 'S', text: 'Help people with personal or emotional problems', section: 'miniip' },
  { code: 'MINI_IP_S_3', type: 'S', text: 'Give career guidance to people', section: 'miniip' },
  { code: 'MINI_IP_S_4', type: 'S', text: 'Perform rehabilitation therapy', section: 'miniip' },
  { code: 'MINI_IP_S_5', type: 'S', text: 'Help conduct a group therapy session', section: 'miniip' },

  // Enterprising (E) - Leading, persuading, managing
  { code: 'MINI_IP_E_1', type: 'E', text: 'Buy and sell stocks and bonds', section: 'miniip' },
  { code: 'MINI_IP_E_2', type: 'E', text: 'Manage a retail store', section: 'miniip' },
  { code: 'MINI_IP_E_3', type: 'E', text: 'Operate a beauty salon or barber shop', section: 'miniip' },
  { code: 'MINI_IP_E_4', type: 'E', text: 'Manage a department within a large company', section: 'miniip' },
  { code: 'MINI_IP_E_5', type: 'E', text: 'Start your own business', section: 'miniip' },

  // Conventional (C) - Organizing, data, procedures
  { code: 'MINI_IP_C_1', type: 'C', text: 'Develop a spreadsheet using computer software', section: 'miniip' },
  { code: 'MINI_IP_C_2', type: 'C', text: 'Proofread records or forms', section: 'miniip' },
  { code: 'MINI_IP_C_3', type: 'C', text: 'Load computer software into a large computer network', section: 'miniip' },
  { code: 'MINI_IP_C_4', type: 'C', text: 'Operate a calculator', section: 'miniip' },
  { code: 'MINI_IP_C_5', type: 'C', text: 'Keep shipping and receiving records', section: 'miniip' },
];

/**
 * Work Values Assessment - 12 items
 * 2 items per value type
 * Scale: 1-5 (Not Important to Extremely Important)
 */
export const WORK_VALUES_ITEMS = [
  // Achievement - Using abilities, sense of accomplishment
  { code: 'WV_ACH_1', type: 'achievement', text: 'Having work where I could do something different every day', section: 'values' },
  { code: 'WV_ACH_2', type: 'achievement', text: 'Having work where I could see the results of my efforts', section: 'values' },

  // Independence - Working autonomously, making decisions
  { code: 'WV_IND_1', type: 'independence', text: 'Having work where I could make decisions on my own', section: 'values' },
  { code: 'WV_IND_2', type: 'independence', text: 'Having work where I could plan my work with little supervision', section: 'values' },

  // Recognition - Advancement, status, leadership
  { code: 'WV_REC_1', type: 'recognition', text: 'Having work where I could be "somebody" in the community', section: 'values' },
  { code: 'WV_REC_2', type: 'recognition', text: 'Having work where I could direct and instruct others', section: 'values' },

  // Relationships - Coworkers, teamwork, service
  { code: 'WV_REL_1', type: 'relationships', text: 'Having work where I could have co-workers who would be easy to get along with', section: 'values' },
  { code: 'WV_REL_2', type: 'relationships', text: 'Having work where I could be of service to others', section: 'values' },

  // Support - Company backing, fair treatment
  { code: 'WV_SUP_1', type: 'support', text: 'Having work where my employer would back me with fair policies', section: 'values' },
  { code: 'WV_SUP_2', type: 'support', text: 'Having work where I could have steady employment', section: 'values' },

  // Working Conditions - Pay, activity, variety
  { code: 'WV_WC_1', type: 'conditions', text: 'Having work where I could be paid well compared to other workers', section: 'values' },
  { code: 'WV_WC_2', type: 'conditions', text: 'Having work where I could have good working conditions', section: 'values' },
];

// ============================================================
// STAGE 2: TRUCKING FIT
// ============================================================

/**
 * Personality Facets - 24 items
 * 4 items per facet, some reverse-scored (R)
 * Scale: 1-5 (Very Inaccurate to Very Accurate)
 *
 * Based on IPIP representations of NEO-PI-R facets
 */
export const FACET_ITEMS = [
  // Empathy (A6 - Sympathy) - Higher = better for trucking
  { code: 'FACET_EMP_1', facet: 'empathy', text: 'I sympathize with others\' feelings', reverse: false, section: 'facets' },
  { code: 'FACET_EMP_2', facet: 'empathy', text: 'I feel others\' emotions', reverse: false, section: 'facets' },
  { code: 'FACET_EMP_3', facet: 'empathy', text: 'I am concerned about others', reverse: false, section: 'facets' },
  { code: 'FACET_EMP_4', facet: 'empathy', text: 'I take time to help others', reverse: false, section: 'facets' },

  // Anxiety (N1 - Anxiety) - Lower = better for trucking
  { code: 'FACET_ANX_1', facet: 'anxiety', text: 'I worry about things', reverse: false, section: 'facets' },
  { code: 'FACET_ANX_2', facet: 'anxiety', text: 'I am easily disturbed', reverse: false, section: 'facets' },
  { code: 'FACET_ANX_3', facet: 'anxiety', text: 'I get stressed out easily', reverse: false, section: 'facets' },
  { code: 'FACET_ANX_4', facet: 'anxiety', text: 'I am relaxed most of the time', reverse: true, section: 'facets' },

  // Excitement-Seeking (E5) - Lower = better for trucking
  { code: 'FACET_EXC_1', facet: 'excitement', text: 'I love excitement', reverse: false, section: 'facets' },
  { code: 'FACET_EXC_2', facet: 'excitement', text: 'I seek adventure', reverse: false, section: 'facets' },
  { code: 'FACET_EXC_3', facet: 'excitement', text: 'I enjoy being reckless', reverse: false, section: 'facets' },
  { code: 'FACET_EXC_4', facet: 'excitement', text: 'I act wild and crazy', reverse: false, section: 'facets' },

  // Self-Discipline (C5) - Higher = better for trucking
  { code: 'FACET_DIS_1', facet: 'discipline', text: 'I get chores done right away', reverse: false, section: 'facets' },
  { code: 'FACET_DIS_2', facet: 'discipline', text: 'I am always prepared', reverse: false, section: 'facets' },
  { code: 'FACET_DIS_3', facet: 'discipline', text: 'I carry out my plans', reverse: false, section: 'facets' },
  { code: 'FACET_DIS_4', facet: 'discipline', text: 'I waste my time', reverse: true, section: 'facets' },

  // Immoderation (N5) - Lower = better for trucking
  { code: 'FACET_IMM_1', facet: 'immoderation', text: 'I often eat too much', reverse: false, section: 'facets' },
  { code: 'FACET_IMM_2', facet: 'immoderation', text: 'I go on binges', reverse: false, section: 'facets' },
  { code: 'FACET_IMM_3', facet: 'immoderation', text: 'I rarely overindulge', reverse: true, section: 'facets' },
  { code: 'FACET_IMM_4', facet: 'immoderation', text: 'I easily resist temptations', reverse: true, section: 'facets' },

  // Dutifulness (C3) - Higher = better for trucking
  { code: 'FACET_DUT_1', facet: 'dutifulness', text: 'I keep my promises', reverse: false, section: 'facets' },
  { code: 'FACET_DUT_2', facet: 'dutifulness', text: 'I follow through on my commitments', reverse: false, section: 'facets' },
  { code: 'FACET_DUT_3', facet: 'dutifulness', text: 'I tell the truth', reverse: false, section: 'facets' },
  { code: 'FACET_DUT_4', facet: 'dutifulness', text: 'I break rules', reverse: true, section: 'facets' },
];

/**
 * Grit-S (Short Grit Scale) - 8 items
 * 4 items per subscale, some reverse-scored (R)
 * Scale: 1-5 (Not at all like me to Very much like me)
 *
 * Source: Duckworth & Quinn (2009)
 */
export const GRIT_ITEMS = [
  // Consistency of Interest
  { code: 'GRIT_CI_1', subscale: 'consistency', text: 'New ideas and projects sometimes distract me from previous ones', reverse: true, section: 'grit' },
  { code: 'GRIT_CI_2', subscale: 'consistency', text: 'Setbacks don\'t discourage me', reverse: false, section: 'grit' },
  { code: 'GRIT_CI_3', subscale: 'consistency', text: 'I have been obsessed with a certain idea or project for a short time but later lost interest', reverse: true, section: 'grit' },
  { code: 'GRIT_CI_4', subscale: 'consistency', text: 'I am a hard worker', reverse: false, section: 'grit' },

  // Perseverance of Effort
  { code: 'GRIT_PE_1', subscale: 'perseverance', text: 'I often set a goal but later choose to pursue a different one', reverse: true, section: 'grit' },
  { code: 'GRIT_PE_2', subscale: 'perseverance', text: 'I have difficulty maintaining my focus on projects that take more than a few months to complete', reverse: true, section: 'grit' },
  { code: 'GRIT_PE_3', subscale: 'perseverance', text: 'I finish whatever I begin', reverse: false, section: 'grit' },
  { code: 'GRIT_PE_4', subscale: 'perseverance', text: 'I am diligent', reverse: false, section: 'grit' },
];

// ============================================================
// COMBINED EXPORTS
// ============================================================

export const STAGE1_ITEMS = [...MINI_IP_ITEMS, ...WORK_VALUES_ITEMS];
export const STAGE2_ITEMS = [...FACET_ITEMS, ...GRIT_ITEMS];
export const ALL_ITEMS = [...STAGE1_ITEMS, ...STAGE2_ITEMS];

// Section definitions for UI
export const SECTIONS = {
  miniip: {
    id: 'miniip',
    title: 'Work Activities',
    subtitle: 'How much would you enjoy doing these activities?',
    instruction: 'Rate how much you would enjoy each activity, regardless of whether you have experience.',
    scale: LIKERT_INTEREST,
    itemCount: 30,
    estimatedMinutes: 5,
  },
  values: {
    id: 'values',
    title: 'Work Values',
    subtitle: 'What matters to you in a job?',
    instruction: 'Rate how important each work characteristic is to you.',
    scale: LIKERT_IMPORTANCE,
    itemCount: 12,
    estimatedMinutes: 3,
  },
  facets: {
    id: 'facets',
    title: 'About You',
    subtitle: 'How accurately do these statements describe you?',
    instruction: 'Rate how accurately each statement describes you as you are now, not as you wish to be.',
    scale: LIKERT_ACCURACY,
    itemCount: 24,
    estimatedMinutes: 4,
  },
  grit: {
    id: 'grit',
    title: 'Persistence',
    subtitle: 'How well do these statements describe you?',
    instruction: 'Rate how well each statement describes you.',
    scale: LIKERT_GRIT,
    itemCount: 8,
    estimatedMinutes: 2,
  },
};

// RIASEC type descriptions
export const RIASEC_TYPES = {
  R: {
    code: 'R',
    name: 'Realistic',
    shortDesc: 'Hands-on, practical',
    description: 'You enjoy working with your hands, tools, and machines. You prefer practical, concrete tasks over abstract problems.',
    careers: ['Truck Driver', 'Mechanic', 'Welder', 'Construction Worker', 'Equipment Operator'],
  },
  I: {
    code: 'I',
    name: 'Investigative',
    shortDesc: 'Analytical, curious',
    description: 'You enjoy researching, analyzing data, and solving complex problems. You\'re curious and like to understand how things work.',
    careers: ['Engineer', 'Scientist', 'Analyst', 'Technician', 'Medical Professional'],
  },
  A: {
    code: 'A',
    name: 'Artistic',
    shortDesc: 'Creative, expressive',
    description: 'You enjoy creating, expressing ideas, and working in unstructured environments. You value originality and imagination.',
    careers: ['Designer', 'Writer', 'Musician', 'Artist', 'Photographer'],
  },
  S: {
    code: 'S',
    name: 'Social',
    shortDesc: 'Helpful, supportive',
    description: 'You enjoy helping, teaching, and working closely with people. You\'re empathetic and value making a difference.',
    careers: ['Teacher', 'Counselor', 'Nurse', 'Social Worker', 'Coach'],
  },
  E: {
    code: 'E',
    name: 'Enterprising',
    shortDesc: 'Ambitious, persuasive',
    description: 'You enjoy leading, persuading, and taking risks. You\'re ambitious and like to influence others.',
    careers: ['Manager', 'Sales Representative', 'Entrepreneur', 'Recruiter', 'Real Estate Agent'],
  },
  C: {
    code: 'C',
    name: 'Conventional',
    shortDesc: 'Organized, detail-oriented',
    description: 'You enjoy organizing data, following procedures, and working with numbers. You value accuracy and efficiency.',
    careers: ['Accountant', 'Dispatcher', 'Administrator', 'Logistics Coordinator', 'Data Entry Specialist'],
  },
};

// Work value descriptions
export const WORK_VALUE_TYPES = {
  achievement: {
    name: 'Achievement',
    description: 'Using your abilities, seeing results, and feeling accomplished',
  },
  independence: {
    name: 'Independence',
    description: 'Making your own decisions and working without close supervision',
  },
  recognition: {
    name: 'Recognition',
    description: 'Advancing in your career, gaining status, and being respected',
  },
  relationships: {
    name: 'Relationships',
    description: 'Working with friendly coworkers and helping others',
  },
  support: {
    name: 'Support',
    description: 'Having fair policies, good supervision, and job security',
  },
  conditions: {
    name: 'Working Conditions',
    description: 'Good pay, comfortable environment, and variety in your work',
  },
};

// Trucking vertical profiles
export const TRUCKING_VERTICALS = {
  otr: {
    id: 'otr',
    name: 'Over-the-Road (OTR)',
    description: 'Long-haul routes across the country, weeks away from home',
    idealProfile: 'High independence, high grit, comfortable with solitude',
  },
  regional: {
    id: 'regional',
    name: 'Regional',
    description: 'Multi-state routes with weekly home time',
    idealProfile: 'Balance of independence and home time, adaptable',
  },
  local: {
    id: 'local',
    name: 'Local',
    description: 'Daily routes returning home each night',
    idealProfile: 'Values relationships, daily routine, customer interaction',
  },
  dedicated: {
    id: 'dedicated',
    name: 'Dedicated',
    description: 'Same route or customer, predictable schedule',
    idealProfile: 'High dutifulness, values routine, reliable',
  },
  tanker: {
    id: 'tanker',
    name: 'Tanker/Hazmat',
    description: 'Specialized cargo requiring extra certifications',
    idealProfile: 'Very high discipline, detail-oriented, safety-focused',
  },
};

export default {
  MINI_IP_ITEMS,
  WORK_VALUES_ITEMS,
  FACET_ITEMS,
  GRIT_ITEMS,
  STAGE1_ITEMS,
  STAGE2_ITEMS,
  ALL_ITEMS,
  SECTIONS,
  RIASEC_TYPES,
  WORK_VALUE_TYPES,
  TRUCKING_VERTICALS,
  LIKERT_INTEREST,
  LIKERT_IMPORTANCE,
  LIKERT_ACCURACY,
  LIKERT_GRIT,
};
