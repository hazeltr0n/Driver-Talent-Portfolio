const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY;
const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID;
const CANDIDATES_TABLE_ID = process.env.AIRTABLE_CANDIDATES_TABLE_ID;
const SUBMISSIONS_TABLE = 'Job Submissions';
const REQUISITIONS_TABLE = 'Job Requisitions';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { slug, submission } = req.query;

  if (!slug) {
    return res.status(400).json({ error: 'Slug required' });
  }

  try {
    const formula = encodeURIComponent(`{portfolio_slug} = "${slug}"`);
    const url = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${CANDIDATES_TABLE_ID}?filterByFormula=${formula}&maxRecords=1`;

    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${AIRTABLE_API_KEY}` },
    });

    if (!response.ok) {
      throw new Error(`Airtable error: ${response.status}`);
    }

    const data = await response.json();

    if (!data.records || data.records.length === 0) {
      return res.status(404).json({ error: 'Portfolio not found' });
    }

    const record = data.records[0];
    const f = record.fields;

    // Transform to frontend format
    const portfolio = transformToPortfolio(record.id, f);

    // If submission ID provided, fetch job fit data from submission
    if (submission) {
      const jobFit = await getSubmissionJobFit(submission);
      if (jobFit) {
        portfolio.jobFit = jobFit;
      }
    }

    res.status(200).json(portfolio);
  } catch (error) {
    console.error('Portfolio error:', error);
    res.status(500).json({ error: error.message });
  }
}

async function getSubmissionJobFit(submissionId) {
  try {
    // Fetch submission
    const subUrl = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${encodeURIComponent(SUBMISSIONS_TABLE)}/${submissionId}`;
    const subRes = await fetch(subUrl, {
      headers: { Authorization: `Bearer ${AIRTABLE_API_KEY}` },
    });

    if (!subRes.ok) return null;

    const sub = await subRes.json();
    const sf = sub.fields;

    if (!sf.fit_score) return null;

    // Fetch requisition for job details
    let jobTitle = sf.job_title || '';
    let employer = sf.employer || '';

    if (sf.requisition_id) {
      const reqUrl = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${encodeURIComponent(REQUISITIONS_TABLE)}/${sf.requisition_id}`;
      const reqRes = await fetch(reqUrl, {
        headers: { Authorization: `Bearer ${AIRTABLE_API_KEY}` },
      });

      if (reqRes.ok) {
        const req = await reqRes.json();
        jobTitle = req.fields.title || jobTitle;
        employer = req.fields.employer || employer;
      }
    }

    // Parse dimensions
    let dimensions = [];
    if (sf.fit_dimensions) {
      try {
        dimensions = typeof sf.fit_dimensions === 'string'
          ? JSON.parse(sf.fit_dimensions)
          : sf.fit_dimensions;
      } catch {}
    }

    return {
      role: jobTitle,
      employer: employer,
      overallScore: sf.fit_score,
      dimensions: dimensions,
      recommendation: sf.fit_recommendation || '',
    };
  } catch (err) {
    console.error('Error fetching submission job fit:', err);
    return null;
  }
}

function transformToPortfolio(id, f) {
  const parseJSON = (field, defaultValue = []) => {
    if (!field) return defaultValue;
    try {
      return typeof field === 'string' ? JSON.parse(field) : field;
    } catch {
      return defaultValue;
    }
  };

  const equipment = parseJSON(f.equipment_experience, []);
  const experience = parseJSON(f.employment_history, []);
  const endorsements = f.endorsements ? f.endorsements.split(',').map(e => e.trim()) : [];

  return {
    id,
    name: f.fullName || `${f.firstName || ''} ${f.lastName || ''}`.trim(),
    homeBase: f.city && f.state ? `${f.city}, ${f.state}` : (f.city || f.state || ''),
    cdlClass: f.cdl_class ? `Class ${f.cdl_class}` : 'Class A',
    endorsements,
    yearsExp: f.years_experience || 0,

    mvr: f.mvr_status || 'See Notes',
    psp: f.psp_crashes_5yr === 0 && f.psp_driver_oos === 0 ? 'Clear' : 'See Notes',
    clearinghouse: f.clearinghouse_status || 'Not Prohibited',

    experience: experience.map(exp => ({
      company: exp.company || '',
      role: exp.role || 'Company Driver',
      tenure: exp.tenure || '',
      verified: exp.verified !== false,
      regulated: exp.regulated !== false,
    })),

    equipment: equipment.map(eq => ({
      type: eq.type || '',
      level: eq.level || 'Yes',
    })),

    training: {
      school: f.training_school || f['Trucking School Name'] || '',
      location: f.training_location || '',
      graduated: f.training_graduated || f['CDL Month'] || '',
      hours: f.training_hours || 160,
    },

    videoUrl: f.video_url || '',
    aiNotes: f.ai_recruiter_notes || '',
    story: f.ai_narrative || '',
    whyTrucking: f.ai_pull_quote || '',

    storyResponses: {
      whoAreYou: f.story_who_are_you || '',
      whatIsYourWhy: f.story_what_is_your_why || '',
      freeworldJourney: f.story_freeworld_journey || '',
      whyTrucking: f.story_why_trucking || '',
      lookingFor: f.story_looking_for || '',
      whatOthersSay: f.story_what_others_say || '',
    },

    mvrDetails: {
      violations: f.mvr_violations_3yr || 0,
      accidents: f.mvr_accidents_3yr || 0,
      suspensions: f.mvr_suspensions_3yr || 0,
      lastPull: f.mvr_last_pull || 'On File',
      summary: f.mvr_summary || buildMVRSummary(f),
    },

    pspDetails: {
      crashes5yr: f.psp_crashes_5yr || 0,
      inspections3yr: f.psp_inspections_3yr || 0,
      driverOOS: f.psp_driver_oos || 0,
    },

    license: {
      medicalCardStatus: f.medical_card_status || 'Valid',
      medicalCardExpiry: f.medical_card_expiry || '',
    },

    jobFit: parseJSON(f.job_fit_data, null),

    slug: f.portfolio_slug || '',
    published: f.portfolio_published || false,
  };
}

function buildMVRSummary(f) {
  const violations = f.mvr_violations_3yr || 0;
  const accidents = f.mvr_accidents_3yr || 0;

  if (violations === 0 && accidents === 0) {
    return 'No moving violations and no at-fault accidents in the past 3 years.';
  }

  const parts = [];
  if (violations > 0) parts.push(`${violations} moving violation${violations > 1 ? 's' : ''}`);
  if (accidents > 0) parts.push(`${accidents} at-fault accident${accidents > 1 ? 's' : ''}`);

  return `${parts.join(' and ')} in the past 3 years.`;
}
