// Employer Portal API client
// All calls require employer JWT authentication

function getAuthHeaders() {
  const token = localStorage.getItem('employer_token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

// Authentication
export async function sendMagicLink(email) {
  const response = await fetch('/api/auth/magic-link', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }),
  });
  if (!response.ok) {
    const data = await response.json();
    throw new Error(data.error || 'Failed to send magic link');
  }
  return response.json();
}

export async function verifyMagicLink(token, email) {
  const response = await fetch(`/api/auth/verify?token=${token}&email=${encodeURIComponent(email)}`);
  if (!response.ok) {
    const data = await response.json();
    throw new Error(data.error || 'Verification failed');
  }
  return response.json();
}

export async function getCurrentSession() {
  const response = await fetch('/api/auth/me', {
    headers: getAuthHeaders(),
  });
  if (!response.ok) return null;
  return response.json();
}

// Jobs (Requisitions)
export async function listEmployerJobs(status = 'Active') {
  const response = await fetch(`/api/employer/jobs?status=${status}`, {
    headers: getAuthHeaders(),
  });
  if (!response.ok) {
    const data = await response.json();
    throw new Error(data.error || 'Failed to load jobs');
  }
  const data = await response.json();
  return data.jobs;
}

export async function createEmployerJob(fields) {
  const response = await fetch('/api/employer/jobs', {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(fields),
  });
  if (!response.ok) {
    const data = await response.json();
    throw new Error(data.error || 'Failed to create job');
  }
  return response.json();
}

export async function getEmployerJob(jobId) {
  const response = await fetch(`/api/employer/jobs/${jobId}`, {
    headers: getAuthHeaders(),
  });
  if (!response.ok) {
    const data = await response.json();
    throw new Error(data.error || 'Failed to load job');
  }
  return response.json();
}

export async function updateEmployerJob(jobId, updates) {
  const response = await fetch(`/api/employer/jobs/${jobId}`, {
    method: 'PATCH',
    headers: getAuthHeaders(),
    body: JSON.stringify(updates),
  });
  if (!response.ok) {
    const data = await response.json();
    throw new Error(data.error || 'Failed to update job');
  }
  return response.json();
}

// Candidates (Driver Feed)
export async function listQualifiedCandidates(filters = {}) {
  const params = new URLSearchParams();
  if (filters.minScore) params.set('minScore', filters.minScore);
  if (filters.jobId) params.set('jobId', filters.jobId);
  if (filters.sortBy) params.set('sortBy', filters.sortBy);

  const response = await fetch(`/api/employer/candidates?${params}`, {
    headers: getAuthHeaders(),
  });
  if (!response.ok) {
    const data = await response.json();
    throw new Error(data.error || 'Failed to load candidates');
  }
  const data = await response.json();
  return data.candidates;
}

export async function getCandidateProfile(uuid) {
  const response = await fetch(`/api/employer/candidates/${uuid}`, {
    headers: getAuthHeaders(),
  });
  if (!response.ok) {
    const data = await response.json();
    throw new Error(data.error || 'Failed to load candidate');
  }
  return response.json();
}

// Submissions
export async function listEmployerSubmissions(status = null) {
  const params = status ? `?status=${status}` : '';
  const response = await fetch(`/api/employer/submissions${params}`, {
    headers: getAuthHeaders(),
  });
  if (!response.ok) {
    const data = await response.json();
    throw new Error(data.error || 'Failed to load submissions');
  }
  const data = await response.json();
  return data.submissions;
}

export async function requestInterview(candidateUuid, jobId, notes = '') {
  const response = await fetch('/api/employer/submissions', {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ candidate_uuid: candidateUuid, requisition_id: jobId, notes }),
  });
  if (!response.ok) {
    const data = await response.json();
    throw new Error(data.error || 'Failed to request interview');
  }
  return response.json();
}

export async function getEmployerSubmission(submissionId) {
  const response = await fetch(`/api/employer/submissions/${submissionId}`, {
    headers: getAuthHeaders(),
  });
  if (!response.ok) {
    const data = await response.json();
    throw new Error(data.error || 'Failed to load submission');
  }
  return response.json();
}

export async function updateEmployerSubmission(submissionId, updates) {
  const response = await fetch(`/api/employer/submissions/${submissionId}`, {
    method: 'PATCH',
    headers: getAuthHeaders(),
    body: JSON.stringify(updates),
  });
  if (!response.ok) {
    const data = await response.json();
    throw new Error(data.error || 'Failed to update submission');
  }
  return response.json();
}
