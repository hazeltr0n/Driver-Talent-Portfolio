// API client for frontend - all calls go through /api routes

export async function searchCandidates(query) {
  const response = await fetch(`/api/candidates/search?q=${encodeURIComponent(query)}`);
  if (!response.ok) throw new Error('Search failed');
  const data = await response.json();
  return data.candidates;
}

export async function searchFreeAgents(query) {
  const response = await fetch(`/api/free-agents/search?q=${encodeURIComponent(query)}`);
  if (!response.ok) throw new Error('Search failed');
  const data = await response.json();
  return data.results.map(r => ({
    uuid: r.uuid,
    name: r.fullName,
    email: r.email,
    phone: r.phone,
    city: r.city,
    state: r.state,
    location: [r.city, r.state].filter(Boolean).join(', '),
  }));
}

export async function getCandidate(uuid) {
  const response = await fetch(`/api/candidates/${uuid}`);
  if (!response.ok) throw new Error('Candidate not found');
  return response.json();
}

export async function updateCandidate(uuid, fields) {
  const response = await fetch(`/api/candidates/${uuid}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(fields),
  });
  if (!response.ok) throw new Error('Update failed');
  return response.json();
}

export async function createCandidate(fields) {
  const response = await fetch('/api/candidates', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(fields),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Create failed');
  }
  return response.json();
}

export async function getPortfolio(slug, submissionId = null) {
  let url = `/api/portfolio/${slug}`;
  if (submissionId) {
    url += `?submission=${submissionId}`;
  }
  const response = await fetch(url);
  if (!response.ok) {
    if (response.status === 404) return null;
    throw new Error('Failed to load portfolio');
  }
  return response.json();
}

export async function parseDocuments(uuid, documents) {
  const response = await fetch('/api/parse-documents', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ uuid, ...documents }),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Parse failed');
  }
  return response.json();
}

export async function listJobs(status = 'Active') {
  const response = await fetch(`/api/jobs?status=${status}`);
  if (!response.ok) throw new Error('Failed to load jobs');
  const data = await response.json();
  return data.jobs;
}

export async function createJob(fields) {
  const response = await fetch('/api/jobs', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(fields),
  });
  if (!response.ok) throw new Error('Create failed');
  return response.json();
}

export async function parseJobDescription(description) {
  const response = await fetch('/api/parse-job', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ description }),
  });
  if (!response.ok) throw new Error('Parse failed');
  return response.json();
}

export async function matchDriverToJob(candidateUuid, jobId) {
  const response = await fetch('/api/match', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ candidateUuid, jobId }),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Match failed');
  }
  return response.json();
}

// Submissions API
export async function listSubmissions(requisitionId = null) {
  let url = '/api/submissions';
  if (requisitionId) {
    url += `?requisition_id=${requisitionId}`;
  }
  const response = await fetch(url);
  if (!response.ok) throw new Error('Failed to load submissions');
  const data = await response.json();
  return data.submissions;
}

export async function createSubmission(data) {
  const response = await fetch('/api/submissions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!response.ok) throw new Error('Create submission failed');
  return response.json();
}

export async function updateSubmission(id, updates) {
  const response = await fetch(`/api/submissions/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updates),
  });
  if (!response.ok) throw new Error('Update submission failed');
  return response.json();
}

export async function deleteSubmission(id) {
  const response = await fetch(`/api/submissions/${id}`, {
    method: 'DELETE',
  });
  if (!response.ok) throw new Error('Delete submission failed');
  return response.json();
}

// Video Recording API
export async function getVideoStatus(uuid) {
  const response = await fetch(`/api/videos/${uuid}`);
  if (!response.ok) throw new Error('Failed to get video status');
  return response.json();
}

export async function getUploadUrl(uuid, questionNumber) {
  const response = await fetch('/api/videos/upload', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ uuid, questionNumber }),
  });
  if (!response.ok) {
    const text = await response.text();
    console.error('Upload URL API error:', response.status, text);
    throw new Error(`Upload URL failed: ${response.status}`);
  }
  return response.json();
}

export async function uploadVideoClip(uuid, questionNumber, blob) {
  // Get presigned URL
  const { uploadUrl, clipKey } = await getUploadUrl(uuid, questionNumber);

  // Upload to storage
  const uploadResponse = await fetch(uploadUrl, {
    method: 'PUT',
    headers: { 'Content-Type': 'video/webm' },
    body: blob,
  });

  if (!uploadResponse.ok) throw new Error('Upload failed');

  // Return clip info for batch confirmation later
  return { questionNumber, clipKey };
}

// Confirm all clips at once to avoid race conditions
export async function confirmAllClips(uuid, clips) {
  const confirmResponse = await fetch('/api/videos/confirm', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ uuid, clips }),
  });

  if (!confirmResponse.ok) throw new Error('Failed to confirm uploads');
  return confirmResponse.json();
}

export async function triggerVideoAssembly(uuid) {
  const response = await fetch('/api/videos/assemble', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ uuid }),
  });
  if (!response.ok) throw new Error('Failed to start video assembly');
  return response.json();
}

export async function transcribeVideoClips(uuid) {
  const response = await fetch('/api/videos/transcribe', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ uuid }),
  });
  if (!response.ok) throw new Error('Failed to transcribe videos');
  return response.json();
}

export async function getClipFeedback(clipUrl, questionNumber) {
  const response = await fetch('/api/videos/feedback', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ clipUrl, questionNumber }),
  });
  if (!response.ok) {
    const text = await response.text();
    console.error('Feedback API error:', response.status, text);
    throw new Error(`Feedback failed: ${response.status} - ${text.slice(0, 100)}`);
  }
  return response.json();
}

// URL Shortener
export async function shortenUrl(url, title) {
  const response = await fetch('/api/shorten', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url, title }),
  });
  if (!response.ok) throw new Error('Failed to shorten URL');
  return response.json();
}

// Regenerate AI fields for a candidate or submission
export async function regenerateAI({ uuid, submissionId, fields }) {
  const response = await fetch('/api/candidates/regenerate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ uuid, submissionId, fields }),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Regeneration failed');
  }
  return response.json();
}

// Helper to convert File to base64
export function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      // Remove data URL prefix (e.g., "data:application/pdf;base64,")
      const base64 = reader.result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = reject;
  });
}
