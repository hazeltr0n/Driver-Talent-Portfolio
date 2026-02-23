/**
 * FitKit API Client
 */

const API_BASE = '/api/fitkit';

/**
 * Start or resume a FitKit assessment
 * @param {string} uuid - Candidate UUID
 * @returns {Promise<Object>} Assessment state
 */
export async function startAssessment(uuid) {
  const res = await fetch(`${API_BASE}/start`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ uuid }),
  });

  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || 'Failed to start assessment');
  }

  return res.json();
}

/**
 * Save batch responses for a stage
 * @param {string} uuid - Candidate UUID
 * @param {number} stage - Stage number (1 or 2)
 * @param {Object} responses - Map of item code to response value
 * @returns {Promise<Object>} Response state
 */
export async function saveResponses(uuid, stage, responses) {
  const res = await fetch(`${API_BASE}/respond`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ uuid, stage, responses }),
  });

  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || 'Failed to save responses');
  }

  return res.json();
}

/**
 * Score Stage 1 and get results
 * @param {string} uuid - Candidate UUID
 * @returns {Promise<Object>} Stage 1 results
 */
export async function scoreStage1(uuid) {
  const res = await fetch(`${API_BASE}/score-stage1`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ uuid }),
  });

  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || 'Failed to score Stage 1');
  }

  return res.json();
}

/**
 * Score Stage 2 and get results
 * @param {string} uuid - Candidate UUID
 * @returns {Promise<Object>} Stage 2 results
 */
export async function scoreStage2(uuid) {
  const res = await fetch(`${API_BASE}/score-stage2`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ uuid }),
  });

  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || 'Failed to score Stage 2');
  }

  return res.json();
}

/**
 * Get complete assessment results
 * @param {string} uuid - Candidate UUID
 * @returns {Promise<Object>} Full results
 */
export async function getResults(uuid) {
  const res = await fetch(`${API_BASE}/results/${uuid}`);

  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || 'Failed to get results');
  }

  return res.json();
}

export default {
  startAssessment,
  saveResponses,
  scoreStage1,
  scoreStage2,
  getResults,
};
