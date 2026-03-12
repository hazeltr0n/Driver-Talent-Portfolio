import { useState, useEffect } from 'react';
import AdminLayout, { useAdminAuth } from './AdminLayout';
import { listSubmissions, updateSubmission, createSubmission, searchCandidates, getCandidate, updateCandidate, lookupFitProfile, updateFitProfile } from '../lib/api';

const AIRTABLE_BASE_ID = 'appjZUryTUrvwToXE';
const AIRTABLE_SUBMISSIONS_TABLE = 'tblRy25nM6WGZBq0J';

const STATUSES = ['Submitted', 'Interviewing', 'Offer Extended', 'Hired', 'Rejected', 'Withdrawn'];
const REJECTION_REASONS = ['No Response', 'Failed Background', 'Client Rejected', 'Driver Declined', 'Position Filled'];

export default function Submissions() {
  const { admin } = useAdminAuth();
  const [submissions, setSubmissions] = useState([]);
  const [collaborators, setCollaborators] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedSub, setSelectedSub] = useState(null);
  const [showSubmitDriver, setShowSubmitDriver] = useState(false);

  // Filters
  const [filterStatus, setFilterStatus] = useState('');
  const [filterAgent, setFilterAgent] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('submitted_date');
  const [sortDir, setSortDir] = useState('desc');
  const [showOnlyMine, setShowOnlyMine] = useState(() => {
    const saved = localStorage.getItem('submissions_showOnlyMine');
    return saved !== null ? JSON.parse(saved) : true;
  });

  // Inline editing
  const [editingCell, setEditingCell] = useState(null);
  const [savingCell, setSavingCell] = useState(null);

  // Persist showOnlyMine preference
  useEffect(() => {
    localStorage.setItem('submissions_showOnlyMine', JSON.stringify(showOnlyMine));
  }, [showOnlyMine]);

  useEffect(() => {
    loadSubmissions();
    loadCollaborators();
    loadJobs();
  }, []);

  const handleInlineSave = async (id, field, value) => {
    setSavingCell({ id, field });
    try {
      await updateSubmission(id, { [field]: value });
      setSubmissions(prev => prev.map(s =>
        s.id === id ? { ...s, [field]: value } : s
      ));
    } catch (err) {
      console.error('Failed to save:', err);
    } finally {
      setSavingCell(null);
      setEditingCell(null);
    }
  };

  const loadCollaborators = async () => {
    try {
      const res = await fetch('/api/collaborators');
      const data = await res.json();
      setCollaborators(data.collaborators || []);
    } catch (err) {
      console.error('Failed to load collaborators:', err);
    }
  };

  const loadJobs = async () => {
    try {
      const res = await fetch('/api/jobs?status=Active');
      const data = await res.json();
      setJobs(data.jobs || []);
    } catch (err) {
      console.error('Failed to load jobs:', err);
    }
  };

  const loadSubmissions = async () => {
    try {
      setLoading(true);
      const data = await listSubmissions();
      setSubmissions(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Get unique values for filters
  const statuses = [...new Set(submissions.map(s => s.status).filter(Boolean))];
  const employers = [...new Set(submissions.map(s => s.employer).filter(Boolean))];

  // Filter submissions
  const filteredSubs = submissions.filter(sub => {
    // "My Submissions" filter
    if (showOnlyMine && admin?.email) {
      const agentEmail = sub.career_agent_email || sub.career_agent?.email;
      if (agentEmail !== admin.email) return false;
    }
    if (filterStatus && sub.status !== filterStatus) return false;
    if (filterAgent && (sub.career_agent?.id || sub.career_agent_name) !== filterAgent) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const matchName = (sub.candidate_name || '').toLowerCase().includes(q);
      const matchEmployer = (sub.employer || '').toLowerCase().includes(q);
      const matchTitle = (sub.job_title || '').toLowerCase().includes(q);
      if (!matchName && !matchEmployer && !matchTitle) return false;
    }
    return true;
  });

  // Sort submissions
  const sortedSubs = [...filteredSubs].sort((a, b) => {
    let aVal, bVal;
    switch (sortBy) {
      case 'candidate_name':
        aVal = (a.candidate_name || '').toLowerCase();
        bVal = (b.candidate_name || '').toLowerCase();
        break;
      case 'employer':
        aVal = (a.employer || '').toLowerCase();
        bVal = (b.employer || '').toLowerCase();
        break;
      case 'fit_score':
        aVal = a.fit_score || 0;
        bVal = b.fit_score || 0;
        break;
      case 'submitted_date':
      default:
        aVal = a.submitted_date || '';
        bVal = b.submitted_date || '';
        break;
    }
    if (aVal < bVal) return sortDir === 'asc' ? -1 : 1;
    if (aVal > bVal) return sortDir === 'asc' ? 1 : -1;
    return 0;
  });

  const handleSort = (field) => {
    if (sortBy === field) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortDir('asc');
    }
  };

  const SortHeader = ({ field, children }) => (
    <div
      style={{ ...styles.tableHeaderCell, cursor: 'pointer', userSelect: 'none' }}
      onClick={() => handleSort(field)}
    >
      {children} {sortBy === field && (sortDir === 'asc' ? '↑' : '↓')}
    </div>
  );

  const getStatusColor = (status) => {
    switch (status) {
      case 'Submitted': return { bg: '#DBEAFE', color: '#1D4ED8' };
      case 'Interviewing': return { bg: '#FEF3C7', color: '#D97706' };
      case 'Offer Extended': return { bg: '#E9D5FF', color: '#7C3AED' };
      case 'Hired': return { bg: '#D1FAE5', color: '#059669' };
      case 'Rejected': return { bg: '#FEE2E2', color: '#DC2626' };
      case 'Withdrawn': return { bg: '#F3F4F6', color: '#6B7280' };
      default: return { bg: '#F3F4F6', color: '#6B7280' };
    }
  };

  const getScoreColor = (score) => {
    if (score >= 85) return '#059669';
    if (score >= 70) return '#D97706';
    return '#DC2626';
  };

  if (loading) {
    return (
      <AdminLayout>
        <div style={styles.loading}>Loading submissions...</div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div style={styles.header}>
        <h1 style={styles.title}>Submissions</h1>
        <div style={styles.headerButtons}>
          <a
            href={`https://airtable.com/${AIRTABLE_BASE_ID}/${AIRTABLE_SUBMISSIONS_TABLE}`}
            target="_blank"
            rel="noopener noreferrer"
            style={styles.airtableLink}
          >
            View in Airtable
          </a>
          <button onClick={() => setShowSubmitDriver(true)} style={styles.addButton}>
            + Submit Driver
          </button>
        </div>
      </div>

      {/* Filters */}
      <div style={styles.filters}>
        <label style={styles.toggleLabel}>
          <input
            type="checkbox"
            checked={showOnlyMine}
            onChange={e => setShowOnlyMine(e.target.checked)}
            style={styles.toggleCheckbox}
          />
          My Submissions
        </label>
        <select
          value={filterStatus}
          onChange={e => setFilterStatus(e.target.value)}
          style={styles.filterSelect}
        >
          <option value="">All Statuses</option>
          {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <select
          value={filterAgent}
          onChange={e => setFilterAgent(e.target.value)}
          style={styles.filterSelect}
        >
          <option value="">All Agents</option>
          {collaborators.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <input
          type="text"
          placeholder="Search driver, employer, job..."
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          style={styles.searchInput}
        />
        <div style={styles.statsRow}>
          <span style={styles.statChip}>{sortedSubs.length} submissions</span>
        </div>
      </div>

      {error && <div style={styles.error}>{error}</div>}

      <div style={styles.table}>
        <div style={styles.tableHeader}>
          <SortHeader field="candidate_name">Driver</SortHeader>
          <SortHeader field="employer">Job</SortHeader>
          <SortHeader field="fit_score">Fit</SortHeader>
          <div style={styles.tableHeaderCell}>Status</div>
          <div style={styles.tableHeaderCell}>Agent</div>
          <SortHeader field="submitted_date">Date</SortHeader>
          <div style={styles.tableHeaderCell}>Actions</div>
        </div>

        {sortedSubs.map(sub => {
          const statusStyle = getStatusColor(sub.status);
          return (
            <div key={sub.id} style={styles.tableRow}>
              <div style={styles.tableCell}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={styles.primaryText}>{sub.candidate_name}</span>
                  {sub.admin_portal_url && (
                    <a
                      href={sub.admin_portal_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={styles.adminLink}
                      onClick={e => e.stopPropagation()}
                    >
                      Admin Portal
                    </a>
                  )}
                </div>
              </div>
              <div style={styles.tableCell}>
                <div style={styles.primaryText}>{sub.employer}</div>
                <div style={styles.secondaryText}>{sub.job_title}</div>
              </div>
              <div style={{ ...styles.tableCell, textAlign: 'center' }}>
                {sub.fit_score ? (
                  <span style={{ ...styles.fitBadge, color: getScoreColor(sub.fit_score) }}>
                    {sub.fit_score}
                  </span>
                ) : '-'}
              </div>
              <div
                style={{ ...styles.tableCell, cursor: 'pointer' }}
                onClick={() => setEditingCell({ id: sub.id, field: 'status' })}
              >
                {editingCell?.id === sub.id && editingCell?.field === 'status' ? (
                  <select
                    autoFocus
                    value={sub.status || ''}
                    onChange={(e) => handleInlineSave(sub.id, 'status', e.target.value)}
                    onBlur={() => setEditingCell(null)}
                    onClick={(e) => e.stopPropagation()}
                    style={styles.inlineSelect}
                    disabled={savingCell?.id === sub.id}
                  >
                    {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                ) : (
                  <span style={{ ...styles.statusBadge, background: statusStyle.bg, color: statusStyle.color }}>
                    {sub.status}
                  </span>
                )}
              </div>
              <div
                style={{ ...styles.tableCell, fontSize: 13, color: '#5A7A82', cursor: 'pointer' }}
                onClick={() => setEditingCell({ id: sub.id, field: 'career_agent' })}
              >
                {editingCell?.id === sub.id && editingCell?.field === 'career_agent' ? (
                  <select
                    autoFocus
                    value={sub.career_agent?.id || ''}
                    onChange={(e) => {
                      const selected = collaborators.find(c => c.id === e.target.value);
                      handleInlineSave(sub.id, 'career_agent', selected ? { id: selected.id, name: selected.name } : null);
                    }}
                    onBlur={() => setEditingCell(null)}
                    onClick={(e) => e.stopPropagation()}
                    style={styles.inlineSelect}
                    disabled={savingCell?.id === sub.id}
                  >
                    <option value="">Unassigned</option>
                    {collaborators.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                ) : (
                  <span style={styles.editableCell}>
                    {sub.career_agent?.name || sub.career_agent_name || '-'}
                  </span>
                )}
              </div>
              <div style={styles.tableCell}>
                {sub.submitted_date}
              </div>
              <div style={styles.tableCell}>
                <button onClick={() => setSelectedSub(sub)} style={styles.viewButton}>View</button>
              </div>
            </div>
          );
        })}

        {sortedSubs.length === 0 && (
          <div style={styles.empty}>No submissions found</div>
        )}
      </div>

      {selectedSub && (
        <SubmissionModal
          submission={selectedSub}
          collaborators={collaborators}
          onClose={() => setSelectedSub(null)}
          onRefresh={loadSubmissions}
        />
      )}

      {showSubmitDriver && (
        <SubmitDriverModal
          jobs={jobs}
          onClose={() => setShowSubmitDriver(false)}
          onSuccess={() => {
            setShowSubmitDriver(false);
            loadSubmissions();
          }}
        />
      )}
    </AdminLayout>
  );
}

function SubmissionModal({ submission, collaborators, onClose, onRefresh }) {
  const [editing, setEditing] = useState(false);
  const [formData, setFormData] = useState({ ...submission });
  const [candidateData, setCandidateData] = useState(null);
  const [candidateForm, setCandidateForm] = useState({});
  const [loadingCandidate, setLoadingCandidate] = useState(false);
  const [fitProfileData, setFitProfileData] = useState(null);
  const [fitProfileForm, setFitProfileForm] = useState({});
  const [loadingFitProfile, setLoadingFitProfile] = useState(false);
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [generatingPdf, setGeneratingPdf] = useState(false);
  const [localPdfUrl, setLocalPdfUrl] = useState(null);

  // Use local state if just generated, otherwise use submission prop
  const pdfUrl = localPdfUrl || submission.pdf_url;

  const handleGeneratePdf = async () => {
    if (!submission.candidate_uuid) return;
    setGeneratingPdf(true);
    try {
      const res = await fetch('/api/submissions/generate-pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ submissionId: submission.id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'PDF generation failed');
      setLocalPdfUrl(data.pdf_url);
      // Auto-open the PDF in new tab
      window.open(data.pdf_url, '_blank');
    } catch (err) {
      alert('Failed to generate PDF: ' + err.message);
    } finally {
      setGeneratingPdf(false);
    }
  };

  // Fetch candidate data on mount
  useEffect(() => {
    if (submission.candidate_uuid) {
      setLoadingCandidate(true);
      getCandidate(submission.candidate_uuid)
        .then(data => {
          setCandidateData(data);
          setCandidateForm({
            cdl_class: data.cdl_class || '',
            years_experience: data.years_experience || '',
            endorsements: data.endorsements || '',
            home_time_preference: data.home_time_preference || '',
            min_weekly_pay: data.min_weekly_pay || '',
            target_weekly_pay: data.target_weekly_pay || '',
            willing_touch_freight: data.willing_touch_freight || '',
            mvr_status: data.mvr_status || '',
            mvr_violations_3yr: data.mvr_violations_3yr || '',
            mvr_accidents_3yr: data.mvr_accidents_3yr || '',
            clearinghouse_status: data.clearinghouse_status || '',
            placement_status: data.placement_status || '',
            city: data.city || '',
            state: data.state || '',
            zipcode: data.zipcode || '',
          });
        })
        .catch(err => console.error('Failed to load candidate:', err))
        .finally(() => setLoadingCandidate(false));
    }

    // Fetch fit profile
    if (submission.candidate_uuid && submission.requisition_id) {
      setLoadingFitProfile(true);
      lookupFitProfile(submission.candidate_uuid, submission.requisition_id)
        .then(data => {
          if (data) {
            setFitProfileData(data);
            setFitProfileForm({
              fit_score: data.fit_score || '',
              fit_recommendation: data.fit_recommendation || '',
              fit_dimensions: data.fit_dimensions || [],
              status: data.status || '',
            });
          }
        })
        .catch(err => console.error('Failed to load fit profile:', err))
        .finally(() => setLoadingFitProfile(false));
    }
  }, [submission.candidate_uuid, submission.requisition_id]);

  const handleFieldChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleCandidateChange = (field, value) => {
    setCandidateForm(prev => ({ ...prev, [field]: value }));
  };

  const handleFitProfileChange = (field, value) => {
    setFitProfileForm(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // Save submission data
      await updateSubmission(submission.id, {
        status: formData.status,
        rejection_reason: formData.rejection_reason,
        hire_date: formData.hire_date,
        notes: formData.notes,
        career_agent: formData.career_agent,
        fit_score: formData.fit_score,
        fit_recommendation: formData.fit_recommendation,
        fit_dimensions: formData.fit_dimensions,
      });

      // Save candidate data if we have a uuid
      if (submission.candidate_uuid && candidateData) {
        const candidateUpdates = {};
        for (const [key, value] of Object.entries(candidateForm)) {
          // Only include fields that changed
          if (value !== '' && value !== candidateData[key]) {
            candidateUpdates[key] = value;
          }
        }
        if (Object.keys(candidateUpdates).length > 0) {
          await updateCandidate(submission.candidate_uuid, candidateUpdates);
        }
      }

      // Save fit profile data if we have one
      if (fitProfileData?.id) {
        await updateFitProfile(fitProfileData.id, {
          fit_score: fitProfileForm.fit_score,
          fit_recommendation: fitProfileForm.fit_recommendation,
          fit_dimensions: fitProfileForm.fit_dimensions,
          status: fitProfileForm.status,
        });
      }

      setEditing(false);
      onRefresh();
    } catch (err) {
      alert('Save failed: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleCopyLink = () => {
    if (submission.driver_fit_link) {
      const fullUrl = `${window.location.origin}${submission.driver_fit_link}`;
      navigator.clipboard.writeText(fullUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const getScoreColor = (score) => {
    if (score >= 85) return '#059669';
    if (score >= 70) return '#D97706';
    return '#DC2626';
  };

  const dimensions = submission.fit_dimensions || [];

  return (
    <div style={styles.modalOverlay} onClick={onClose}>
      <div style={styles.modal} onClick={e => e.stopPropagation()}>
        <div style={styles.modalHeader}>
          <div>
            <h2 style={styles.modalTitle}>{submission.candidate_name}</h2>
            <div style={styles.modalSubtitle}>{submission.employer} · {submission.job_title}</div>
          </div>
          <div style={styles.modalHeaderActions}>
            {!editing ? (
              <button onClick={() => setEditing(true)} style={styles.editButton}>Edit</button>
            ) : (
              <>
                <button onClick={() => { setEditing(false); setFormData({ ...submission }); }} style={styles.cancelButton}>Cancel</button>
                <button onClick={handleSave} disabled={saving} style={styles.saveButton}>
                  {saving ? '...' : 'Save'}
                </button>
              </>
            )}
            <button onClick={onClose} style={styles.closeButton}>×</button>
          </div>
        </div>

        <div style={styles.modalBody}>
          {/* Fit Score Banner */}
          {submission.fit_score && (
            <div style={styles.fitBanner}>
              <div style={styles.fitBannerLeft}>
                <div style={styles.fitLabel}>Fit Score</div>
                <div style={{ ...styles.fitScoreLarge, color: getScoreColor(submission.fit_score) }}>
                  {submission.fit_score}%
                </div>
              </div>
              <div style={styles.fitBannerRight}>
                {submission.driver_fit_link && (
                  <>
                    <button onClick={() => window.open(submission.driver_fit_link, '_blank')} style={styles.viewFitButton}>
                      View Fit Profile
                    </button>
                    <button onClick={handleCopyLink} style={styles.copyButton}>
                      {copied ? 'Copied!' : 'Copy Link'}
                    </button>
                  </>
                )}
                {submission.candidate_uuid && (
                  <>
                    {pdfUrl ? (
                      <a
                        href={pdfUrl}
                        download
                        style={{...styles.pdfButton, textDecoration: 'none', display: 'inline-block'}}
                        onClick={(e) => e.stopPropagation()}
                      >
                        📄 Download PDF
                      </a>
                    ) : (
                      <button
                        onClick={handleGeneratePdf}
                        disabled={generatingPdf}
                        style={{...styles.pdfButton, opacity: generatingPdf ? 0.7 : 1}}
                      >
                        {generatingPdf ? '⏳ Generating...' : '📄 Generate PDF'}
                      </button>
                    )}
                    <button
                      onClick={handleGeneratePdf}
                      disabled={generatingPdf}
                      style={{...styles.regenerateButton, opacity: generatingPdf ? 0.7 : 1}}
                      title="Regenerate PDF"
                    >
                      {generatingPdf ? '⏳' : '🔄'}
                    </button>
                    <button onClick={() => setShowEmailModal(true)} style={styles.emailButton}>
                      ✉️ Send Email
                    </button>
                  </>
                )}
              </div>
            </div>
          )}

          {editing ? (
            <div style={styles.editForm}>
              <div style={styles.formRow}>
                <label style={styles.formLabel}>Status</label>
                <select
                  value={formData.status || ''}
                  onChange={e => handleFieldChange('status', e.target.value)}
                  style={styles.formSelect}
                >
                  {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>

              {formData.status === 'Rejected' && (
                <div style={styles.formRow}>
                  <label style={styles.formLabel}>Rejection Reason</label>
                  <select
                    value={formData.rejection_reason || ''}
                    onChange={e => handleFieldChange('rejection_reason', e.target.value)}
                    style={styles.formSelect}
                  >
                    <option value="">Select reason...</option>
                    {REJECTION_REASONS.map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                </div>
              )}

              {formData.status === 'Hired' && (
                <div style={styles.formRow}>
                  <label style={styles.formLabel}>Hire Date</label>
                  <input
                    type="date"
                    value={formData.hire_date || ''}
                    onChange={e => handleFieldChange('hire_date', e.target.value)}
                    style={styles.formInput}
                  />
                </div>
              )}

              <div style={styles.formRow}>
                <label style={styles.formLabel}>Career Agent</label>
                <select
                  value={formData.career_agent?.id || formData.career_agent_name || ''}
                  onChange={e => handleFieldChange('career_agent', e.target.value ? { id: e.target.value } : null)}
                  style={styles.formSelect}
                >
                  <option value="">Unassigned</option>
                  {collaborators.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div style={styles.formRow}>
                <label style={styles.formLabel}>Notes</label>
                <textarea
                  value={formData.notes || ''}
                  onChange={e => handleFieldChange('notes', e.target.value)}
                  style={styles.formTextarea}
                  rows={3}
                  placeholder="Internal notes..."
                />
              </div>

              {/* Driver Profile Fields */}
              <div style={{ ...styles.formRow, marginTop: 20, paddingTop: 20, borderTop: '1px solid #E8ECEE' }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: '#004751', marginBottom: 12 }}>Driver Profile</div>
              </div>

              {loadingCandidate ? (
                <div style={{ color: '#5A7A82', fontSize: 13 }}>Loading driver data...</div>
              ) : (
                <>
                  <div style={styles.formRowGrid}>
                    <div style={styles.formRow}>
                      <label style={styles.formLabel}>CDL Class</label>
                      <select
                        value={candidateForm.cdl_class || ''}
                        onChange={e => handleCandidateChange('cdl_class', e.target.value)}
                        style={styles.formSelect}
                      >
                        <option value="">-</option>
                        <option value="A">A</option>
                        <option value="B">B</option>
                      </select>
                    </div>
                    <div style={styles.formRow}>
                      <label style={styles.formLabel}>Years Experience</label>
                      <input
                        type="number"
                        min="0"
                        value={candidateForm.years_experience || ''}
                        onChange={e => handleCandidateChange('years_experience', Number(e.target.value))}
                        style={styles.formInput}
                      />
                    </div>
                    <div style={styles.formRow}>
                      <label style={styles.formLabel}>Endorsements</label>
                      <input
                        type="text"
                        value={candidateForm.endorsements || ''}
                        onChange={e => handleCandidateChange('endorsements', e.target.value)}
                        style={styles.formInput}
                        placeholder="H, N, T, X..."
                      />
                    </div>
                  </div>

                  <div style={styles.formRowGrid}>
                    <div style={styles.formRow}>
                      <label style={styles.formLabel}>Home Time Preference</label>
                      <select
                        value={candidateForm.home_time_preference || ''}
                        onChange={e => handleCandidateChange('home_time_preference', e.target.value)}
                        style={styles.formSelect}
                      >
                        <option value="">-</option>
                        <option value="Daily">Daily</option>
                        <option value="Weekly">Weekly</option>
                        <option value="OTR">OTR</option>
                        <option value="Flexible">Flexible</option>
                      </select>
                    </div>
                    <div style={styles.formRow}>
                      <label style={styles.formLabel}>Min Weekly Pay</label>
                      <input
                        type="number"
                        min="0"
                        value={candidateForm.min_weekly_pay || ''}
                        onChange={e => handleCandidateChange('min_weekly_pay', Number(e.target.value))}
                        style={styles.formInput}
                      />
                    </div>
                    <div style={styles.formRow}>
                      <label style={styles.formLabel}>Target Weekly Pay</label>
                      <input
                        type="number"
                        min="0"
                        value={candidateForm.target_weekly_pay || ''}
                        onChange={e => handleCandidateChange('target_weekly_pay', Number(e.target.value))}
                        style={styles.formInput}
                      />
                    </div>
                  </div>

                  <div style={styles.formRowGrid}>
                    <div style={styles.formRow}>
                      <label style={styles.formLabel}>Touch Freight</label>
                      <select
                        value={candidateForm.willing_touch_freight || ''}
                        onChange={e => handleCandidateChange('willing_touch_freight', e.target.value)}
                        style={styles.formSelect}
                      >
                        <option value="">-</option>
                        <option value="Very Light (No-Touch Freight)">Very Light (No-Touch)</option>
                        <option value="Light (Pallet Jack)">Light (Pallet Jack)</option>
                        <option value="Medium (Dolly/Liftgate)">Medium (Dolly/Liftgate)</option>
                        <option value="Heavy (Very Physical Work)">Heavy (Physical)</option>
                      </select>
                    </div>
                    <div style={styles.formRow}>
                      <label style={styles.formLabel}>City</label>
                      <input
                        type="text"
                        value={candidateForm.city || ''}
                        onChange={e => handleCandidateChange('city', e.target.value)}
                        style={styles.formInput}
                      />
                    </div>
                    <div style={styles.formRow}>
                      <label style={styles.formLabel}>State</label>
                      <input
                        type="text"
                        value={candidateForm.state || ''}
                        onChange={e => handleCandidateChange('state', e.target.value)}
                        style={styles.formInput}
                        maxLength={2}
                      />
                    </div>
                  </div>

                  <div style={{ ...styles.formRow, marginTop: 16 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: '#5A7A82', marginBottom: 8 }}>Compliance</div>
                  </div>

                  <div style={styles.formRowGrid}>
                    <div style={styles.formRow}>
                      <label style={styles.formLabel}>MVR Status</label>
                      <select
                        value={candidateForm.mvr_status || ''}
                        onChange={e => handleCandidateChange('mvr_status', e.target.value)}
                        style={styles.formSelect}
                      >
                        <option value="">-</option>
                        <option value="Clear">Clear</option>
                        <option value="Has Violations">Has Violations</option>
                      </select>
                    </div>
                    <div style={styles.formRow}>
                      <label style={styles.formLabel}>MVR Violations (3yr)</label>
                      <input
                        type="number"
                        min="0"
                        value={candidateForm.mvr_violations_3yr || ''}
                        onChange={e => handleCandidateChange('mvr_violations_3yr', Number(e.target.value))}
                        style={styles.formInput}
                      />
                    </div>
                    <div style={styles.formRow}>
                      <label style={styles.formLabel}>MVR Accidents (3yr)</label>
                      <input
                        type="number"
                        min="0"
                        value={candidateForm.mvr_accidents_3yr || ''}
                        onChange={e => handleCandidateChange('mvr_accidents_3yr', Number(e.target.value))}
                        style={styles.formInput}
                      />
                    </div>
                  </div>

                  <div style={styles.formRowGrid}>
                    <div style={styles.formRow}>
                      <label style={styles.formLabel}>Clearinghouse</label>
                      <select
                        value={candidateForm.clearinghouse_status || ''}
                        onChange={e => handleCandidateChange('clearinghouse_status', e.target.value)}
                        style={styles.formSelect}
                      >
                        <option value="">-</option>
                        <option value="Clear">Clear</option>
                        <option value="Not Clear">Not Clear</option>
                      </select>
                    </div>
                    <div style={styles.formRow}>
                      <label style={styles.formLabel}>Placement Status</label>
                      <select
                        value={candidateForm.placement_status || ''}
                        onChange={e => handleCandidateChange('placement_status', e.target.value)}
                        style={styles.formSelect}
                      >
                        <option value="">-</option>
                        <option value="Unemployed and Looking">Unemployed and Looking</option>
                        <option value="Working and Looking">Working and Looking</option>
                        <option value="Active - Placed with Client">Active - Placed with Client</option>
                        <option value="Inactive - Happy with Job">Inactive - Happy with Job</option>
                        <option value="Inactive - Lost Contact">Inactive - Lost Contact</option>
                      </select>
                    </div>
                  </div>
                </>
              )}

              {/* Job Fit Fields */}
              <div style={{ ...styles.formRow, marginTop: 20, paddingTop: 20, borderTop: '1px solid #E8ECEE' }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: '#004751', marginBottom: 12 }}>
                  Fit Profile
                  {fitProfileData?.id && <span style={{ fontWeight: 400, fontSize: 12, color: '#5A7A82', marginLeft: 8 }}>(from Fit Profiles table)</span>}
                </div>
              </div>

              {loadingFitProfile ? (
                <div style={{ color: '#5A7A82', fontSize: 13 }}>Loading fit profile...</div>
              ) : !fitProfileData ? (
                <div style={{ color: '#9CA3AF', fontSize: 13 }}>No fit profile found for this candidate/job combination.</div>
              ) : (
                <>
                  <div style={styles.formRowGrid}>
                    <div style={styles.formRow}>
                      <label style={styles.formLabel}>Fit Score (0-100)</label>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={fitProfileForm.fit_score || ''}
                        onChange={e => handleFitProfileChange('fit_score', Number(e.target.value))}
                        style={styles.formInput}
                      />
                    </div>
                    <div style={styles.formRow}>
                      <label style={styles.formLabel}>Fit Profile Status</label>
                      <select
                        value={fitProfileForm.status || ''}
                        onChange={e => handleFitProfileChange('status', e.target.value)}
                        style={styles.formSelect}
                      >
                        <option value="">-</option>
                        <option value="Active">Active</option>
                        <option value="Archived">Archived</option>
                        <option value="Converted">Converted</option>
                      </select>
                    </div>
                  </div>

                  <div style={styles.formRow}>
                    <label style={styles.formLabel}>AI Recommendation</label>
                    <textarea
                      value={fitProfileForm.fit_recommendation || ''}
                      onChange={e => handleFitProfileChange('fit_recommendation', e.target.value)}
                      style={styles.formTextarea}
                      rows={4}
                      placeholder="AI-generated recommendation for this match..."
                    />
                  </div>

                  <div style={styles.formRow}>
                    <label style={styles.formLabel}>Fit Dimensions (JSON)</label>
                    <textarea
                      value={typeof fitProfileForm.fit_dimensions === 'string' ? fitProfileForm.fit_dimensions : JSON.stringify(fitProfileForm.fit_dimensions || [], null, 2)}
                      onChange={e => {
                        try {
                          const parsed = JSON.parse(e.target.value);
                          handleFitProfileChange('fit_dimensions', parsed);
                        } catch {
                          handleFitProfileChange('fit_dimensions', e.target.value);
                        }
                      }}
                      style={{ ...styles.formTextarea, fontFamily: 'monospace', fontSize: 12 }}
                      rows={8}
                      placeholder='[{"name": "Experience", "score": 85, "note": "..."}]'
                    />
                  </div>
                </>
              )}
            </div>
          ) : (
            <>
              {/* Details */}
              <div style={styles.detailsGrid}>
                <div style={styles.detailItem}>
                  <span style={styles.detailLabel}>Status</span>
                  <span style={styles.detailValue}>{submission.status}</span>
                </div>
                <div style={styles.detailItem}>
                  <span style={styles.detailLabel}>Submitted</span>
                  <span style={styles.detailValue}>{submission.submitted_date}</span>
                </div>
                {submission.hire_date && (
                  <div style={styles.detailItem}>
                    <span style={styles.detailLabel}>Hire Date</span>
                    <span style={styles.detailValue}>{submission.hire_date}</span>
                  </div>
                )}
                {submission.rejection_reason && (
                  <div style={styles.detailItem}>
                    <span style={styles.detailLabel}>Rejection Reason</span>
                    <span style={styles.detailValue}>{submission.rejection_reason}</span>
                  </div>
                )}
              </div>

              {/* Fit Dimensions */}
              {dimensions.length > 0 && (
                <div style={styles.dimensionsSection}>
                  <div style={styles.sectionTitle}>Fit Dimensions</div>
                  <div style={styles.dimensionsGrid}>
                    {dimensions.map((dim, i) => (
                      <div key={i} style={styles.dimensionCard}>
                        <div style={styles.dimensionHeader}>
                          <span style={styles.dimensionName}>{dim.name}</span>
                          <span style={{ ...styles.dimensionScore, color: getScoreColor(dim.score) }}>
                            {dim.score}
                          </span>
                        </div>
                        <div style={styles.dimensionNote}>{dim.note}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* AI Recommendation */}
              {submission.fit_recommendation && (
                <div style={styles.recommendationBox}>
                  <div style={styles.sectionTitle}>AI Recommendation</div>
                  <p style={styles.recommendationText}>{submission.fit_recommendation}</p>
                </div>
              )}

              {/* Notes */}
              {submission.notes && (
                <div style={styles.notesBox}>
                  <div style={styles.sectionTitle}>Notes</div>
                  <p style={styles.notesText}>{submission.notes}</p>
                </div>
              )}
            </>
          )}
        </div>

        {showEmailModal && (
          <EmailPreviewModal
            submission={submission}
            onClose={() => setShowEmailModal(false)}
          />
        )}
      </div>
    </div>
  );
}

function EmailPreviewModal({ submission, onClose }) {
  const [toEmail, setToEmail] = useState('');
  const [ccEmail, setCcEmail] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState(null);

  // Subject and message
  const candidateName = submission.candidate_name?.split(' ')[0] || 'Driver';
  const defaultSubject = `Driver Profile: ${candidateName} for ${submission.employer || 'Job'} - ${submission.job_title || 'Open Position'}`;
  const [subject, setSubject] = useState(defaultSubject);
  const [message, setMessage] = useState('');

  // HubSpot contact search
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [activeField, setActiveField] = useState(null); // 'to' or 'cc'

  const previewUrl = `/api/submissions/send-email?submissionId=${submission.id}`;

  const handleSearch = async (query) => {
    if (query.length < 2) {
      setSearchResults([]);
      return;
    }
    setSearching(true);
    try {
      const res = await fetch(`/api/hubspot/search-contacts?q=${encodeURIComponent(query)}`);
      const data = await res.json();
      setSearchResults(data.contacts || []);
    } catch (err) {
      console.error('HubSpot search error:', err);
    } finally {
      setSearching(false);
    }
  };

  const handleSelectContact = (contact) => {
    if (activeField === 'to') {
      const current = toEmail ? toEmail.split(',').map(e => e.trim()) : [];
      if (!current.includes(contact.email)) {
        setToEmail([...current, contact.email].filter(Boolean).join(', '));
      }
    } else if (activeField === 'cc') {
      const current = ccEmail ? ccEmail.split(',').map(e => e.trim()) : [];
      if (!current.includes(contact.email)) {
        setCcEmail([...current, contact.email].filter(Boolean).join(', '));
      }
    }
    setSearchQuery('');
    setSearchResults([]);
  };

  const handleSend = async () => {
    if (!toEmail) {
      setError('Please enter an email address');
      return;
    }

    setSending(true);
    setError(null);

    try {
      const res = await fetch('/api/submissions/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          submissionId: submission.id,
          toEmail,
          ccEmail: ccEmail || undefined,
          subject: subject !== defaultSubject ? subject : undefined,
          message: message || undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to send email');
      }

      setSent(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setSending(false);
    }
  };

  return (
    <div style={styles.emailModalOverlay} onClick={onClose}>
      <div style={styles.emailModal} onClick={e => e.stopPropagation()}>
        <div style={styles.emailModalHeader}>
          <h3 style={styles.emailModalTitle}>Send Driver Profile Email</h3>
          <button onClick={onClose} style={styles.closeButton}>×</button>
        </div>

        <div style={styles.emailModalBody}>
          {sent ? (
            <div style={styles.sentMessage}>
              <div style={styles.sentIcon}>✅</div>
              <div style={styles.sentText}>Email sent to {toEmail}{ccEmail ? ` (CC: ${ccEmail})` : ''}</div>
              <button onClick={onClose} style={styles.doneButton}>Done</button>
            </div>
          ) : (
            <>
              {/* HubSpot Search */}
              <div style={styles.contactSearchSection}>
                <label style={styles.emailLabel}>Search HubSpot:</label>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={e => {
                    setSearchQuery(e.target.value);
                    handleSearch(e.target.value);
                  }}
                  placeholder="Search contacts by name, email, or company..."
                  style={styles.emailInput}
                />
                {searching && <div style={styles.searchingText}>Searching...</div>}
                {searchResults.length > 0 && (
                  <div style={styles.contactResults}>
                    {searchResults.map(contact => (
                      <div
                        key={contact.id}
                        style={styles.contactResult}
                      >
                        <div style={styles.contactInfo}>
                          <div style={styles.contactName}>{contact.name}</div>
                          <div style={styles.contactMeta}>{contact.email} {contact.company ? `• ${contact.company}` : ''}</div>
                        </div>
                        <div style={styles.contactActions}>
                          <button
                            onClick={() => { setActiveField('to'); handleSelectContact(contact); }}
                            style={styles.addToButton}
                          >
                            + To
                          </button>
                          <button
                            onClick={() => { setActiveField('cc'); handleSelectContact(contact); }}
                            style={styles.addCcButton}
                          >
                            + CC
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div style={styles.emailInputRow}>
                <label style={styles.emailLabel}>To:</label>
                <input
                  type="text"
                  value={toEmail}
                  onChange={e => setToEmail(e.target.value)}
                  placeholder="email@company.com (comma-separate multiple)"
                  style={styles.emailInput}
                />
              </div>

              <div style={styles.emailInputRow}>
                <label style={styles.emailLabel}>CC:</label>
                <input
                  type="text"
                  value={ccEmail}
                  onChange={e => setCcEmail(e.target.value)}
                  placeholder="Optional CC recipients"
                  style={styles.emailInput}
                />
              </div>

              <div style={styles.emailInputRow}>
                <label style={styles.emailLabel}>Subject:</label>
                <input
                  type="text"
                  value={subject}
                  onChange={e => setSubject(e.target.value)}
                  style={styles.emailInput}
                />
              </div>

              <div style={styles.emailInputRow}>
                <label style={{...styles.emailLabel, alignSelf: 'flex-start', marginTop: 10}}>Message:</label>
                <textarea
                  value={message}
                  onChange={e => setMessage(e.target.value)}
                  placeholder="Optional personal message (appears at top of email)"
                  style={{...styles.emailInput, minHeight: 80, resize: 'vertical', fontFamily: 'inherit'}}
                  rows={3}
                />
              </div>

              {error && <div style={styles.emailError}>{error}</div>}

              <div style={styles.previewLabel}>Email Preview:</div>
              <iframe
                src={previewUrl}
                style={styles.previewFrame}
                title="Email Preview"
              />

              <div style={styles.emailActions}>
                <button onClick={onClose} style={styles.cancelButton}>Cancel</button>
                <button onClick={handleSend} disabled={sending} style={styles.sendButton}>
                  {sending ? 'Sending...' : 'Send Email'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function SubmitDriverModal({ jobs, onClose, onSuccess }) {
  const { getAuthHeaders } = useAdminAuth();
  const [selectedJob, setSelectedJob] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [fitScores, setFitScores] = useState({});
  const [loadingFit, setLoadingFit] = useState({});

  const fetchFitScore = async (candidateUuid) => {
    if (!selectedJob || !candidateUuid || fitScores[candidateUuid] !== undefined) return;
    setLoadingFit(prev => ({ ...prev, [candidateUuid]: true }));
    try {
      const res = await fetch('/api/fit-profiles/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ candidate_uuid: candidateUuid, requisition_id: selectedJob.id }),
      });
      if (res.ok) {
        const data = await res.json();
        setFitScores(prev => ({ ...prev, [candidateUuid]: data.fit_score }));
      } else {
        setFitScores(prev => ({ ...prev, [candidateUuid]: null }));
      }
    } catch (err) {
      setFitScores(prev => ({ ...prev, [candidateUuid]: null }));
    } finally {
      setLoadingFit(prev => ({ ...prev, [candidateUuid]: false }));
    }
  };

  const handleSearch = async () => {
    if (searchQuery.length < 2) return;
    setSearching(true);
    setFitScores({});
    try {
      const results = await searchCandidates(searchQuery);
      setSearchResults(results);
      // Auto-fetch fit scores
      if (selectedJob) {
        for (const c of results) {
          if (c.uuid) {
            fetchFitScore(c.uuid);
          }
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSearching(false);
    }
  };

  const handleSubmitDriver = async (candidate) => {
    if (!selectedJob) return;
    setSubmitting(true);
    try {
      await createSubmission({
        candidate_uuid: candidate.uuid,
        candidate_name: candidate.name || candidate.fullName,
        requisition_id: selectedJob.id,
        employer: selectedJob.employer,
        job_title: selectedJob.title,
      }, getAuthHeaders());
      onSuccess();
    } catch (err) {
      console.error(err);
      alert('Error: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={styles.modalOverlay} onClick={onClose}>
      <div style={styles.submitDriverModal} onClick={e => e.stopPropagation()}>
        <div style={styles.modalHeader}>
          <h2 style={styles.modalTitle}>Submit Driver to Job</h2>
          <button onClick={onClose} style={styles.closeButton}>×</button>
        </div>

        <div style={styles.modalBody}>
          {/* Step 1: Select Job */}
          <div style={styles.submitStep}>
            <div style={styles.submitStepLabel}>1. Select Job</div>
            <select
              value={selectedJob?.id || ''}
              onChange={e => {
                const job = jobs.find(j => j.id === e.target.value);
                setSelectedJob(job || null);
              }}
              style={styles.jobSelect}
            >
              <option value="">-- Select a job --</option>
              {jobs.map(job => (
                <option key={job.id} value={job.id}>
                  {job.employer} - {job.title} ({job.location})
                </option>
              ))}
            </select>
          </div>

          {/* Step 2: Find Driver (only shown after job selected) */}
          {selectedJob && (
            <div style={styles.submitStep}>
              <div style={styles.submitStepLabel}>2. Find Driver</div>
              <div style={styles.searchHint}>Search for existing drivers. Add new drivers from the Drivers page first.</div>

              <div style={styles.searchRow}>
                <input
                  type="text"
                  placeholder="Search existing drivers..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleSearch()}
                  style={styles.searchInputModal}
                />
                <button onClick={handleSearch} disabled={searching} style={styles.searchButton}>
                  {searching ? '...' : 'Search'}
                </button>
              </div>
              {searchResults.length > 0 && (
                <div style={styles.searchResults}>
                  {searchResults.map(c => {
                    const score = fitScores[c.uuid];
                    const isLoading = loadingFit[c.uuid];
                    return (
                      <div key={c.uuid} style={styles.searchResultItem}>
                        <div style={{ flex: 1 }}>
                          <div style={styles.candidateName}>{c.name || c.fullName}</div>
                          <div style={styles.candidateMeta}>{c.location || [c.city, c.state].filter(Boolean).join(', ')}</div>
                        </div>
                        {c.uuid && (
                          <div style={styles.fitPreview}>
                            {isLoading ? (
                              <span style={styles.fitLoading}>...</span>
                            ) : score !== undefined && score !== null ? (
                              <span style={{ ...styles.fitScorePreview, color: score >= 85 ? '#059669' : score >= 70 ? '#D97706' : '#DC2626' }}>
                                {score}%
                              </span>
                            ) : null}
                          </div>
                        )}
                        <button onClick={() => handleSubmitDriver(c)} disabled={submitting} style={styles.submitButton}>
                          {submitting ? '...' : 'Submit'}
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

const styles = {
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  toggleLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    fontSize: 14,
    fontWeight: 600,
    color: '#004751',
    cursor: 'pointer',
    padding: '8px 12px',
    background: '#E8ECEE',
    borderRadius: 6,
  },
  toggleCheckbox: {
    width: 16,
    height: 16,
    cursor: 'pointer',
  },
  title: {
    margin: 0,
    fontSize: 28,
    fontWeight: 700,
    color: '#004751',
    fontFamily: 'Georgia, serif',
  },
  headerButtons: {
    display: 'flex',
    gap: 12,
    alignItems: 'center',
  },
  airtableLink: {
    padding: '10px 16px',
    fontSize: 14,
    fontWeight: 600,
    background: '#FFFFFF',
    color: '#004751',
    border: '1px solid #D1D9DD',
    borderRadius: 6,
    textDecoration: 'none',
  },
  addButton: {
    padding: '10px 20px',
    fontSize: 14,
    fontWeight: 600,
    background: '#004751',
    color: '#FFFFFF',
    border: 'none',
    borderRadius: 6,
    cursor: 'pointer',
  },
  filters: {
    display: 'flex',
    gap: 12,
    marginBottom: 20,
    flexWrap: 'wrap',
    alignItems: 'center',
  },
  filterSelect: {
    padding: '8px 12px',
    fontSize: 14,
    border: '1px solid #D1D9DD',
    borderRadius: 6,
    background: '#FFFFFF',
  },
  searchInput: {
    padding: '8px 12px',
    fontSize: 14,
    border: '1px solid #D1D9DD',
    borderRadius: 6,
    width: 240,
  },
  statsRow: {
    marginLeft: 'auto',
  },
  statChip: {
    padding: '6px 12px',
    fontSize: 13,
    fontWeight: 600,
    background: '#E8ECEE',
    color: '#004751',
    borderRadius: 16,
  },
  loading: {
    padding: 48,
    textAlign: 'center',
    color: '#5A7A82',
  },
  error: {
    background: '#FEF2F2',
    color: '#DC2626',
    padding: '12px 16px',
    borderRadius: 8,
    marginBottom: 16,
    fontSize: 14,
  },
  table: {
    display: 'table',
    width: '100%',
    background: '#FFFFFF',
    borderRadius: 12,
    border: '1px solid #E8ECEE',
    borderCollapse: 'collapse',
    overflow: 'hidden',
  },
  tableHeader: {
    display: 'table-row',
    background: '#F8FAFB',
  },
  tableRow: {
    display: 'table-row',
  },
  tableCell: {
    display: 'table-cell',
    padding: '12px 16px',
    fontSize: 14,
    verticalAlign: 'middle',
    whiteSpace: 'nowrap',
    borderBottom: '1px solid #E8ECEE',
  },
  tableHeaderCell: {
    display: 'table-cell',
    padding: '12px 16px',
    fontSize: 11,
    fontWeight: 600,
    color: '#5A7A82',
    textTransform: 'uppercase',
    borderBottom: '1px solid #E8ECEE',
  },
  primaryText: {
    fontWeight: 600,
    color: '#004751',
    fontSize: 14,
  },
  secondaryText: {
    fontSize: 13,
    color: '#5A7A82',
    marginTop: 2,
  },
  fitBadge: {
    fontWeight: 700,
    fontSize: 15,
  },
  statusBadge: {
    display: 'inline-block',
    padding: '4px 10px',
    fontSize: 12,
    fontWeight: 600,
    borderRadius: 12,
  },
  viewButton: {
    padding: '6px 12px',
    fontSize: 13,
    fontWeight: 500,
    background: '#004751',
    color: '#FFFFFF',
    border: 'none',
    borderRadius: 6,
    cursor: 'pointer',
  },
  empty: {
    padding: 48,
    textAlign: 'center',
    color: '#5A7A82',
  },
  // Modal
  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(0,0,0,0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },
  modal: {
    background: '#FFFFFF',
    borderRadius: 12,
    width: '90%',
    maxWidth: 600,
    maxHeight: '90vh',
    overflow: 'auto',
  },
  modalHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: 24,
    borderBottom: '1px solid #E8ECEE',
    position: 'sticky',
    top: 0,
    background: '#FFFFFF',
  },
  modalTitle: {
    margin: 0,
    fontSize: 20,
    fontWeight: 700,
    color: '#004751',
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#5A7A82',
    marginTop: 4,
  },
  modalHeaderActions: {
    display: 'flex',
    gap: 8,
    alignItems: 'center',
  },
  editButton: {
    padding: '6px 14px',
    fontSize: 13,
    fontWeight: 600,
    background: '#004751',
    color: '#FFFFFF',
    border: 'none',
    borderRadius: 6,
    cursor: 'pointer',
  },
  cancelButton: {
    padding: '6px 12px',
    fontSize: 13,
    fontWeight: 500,
    background: '#FFFFFF',
    color: '#5A7A82',
    border: '1px solid #D1D9DD',
    borderRadius: 6,
    cursor: 'pointer',
  },
  saveButton: {
    padding: '6px 12px',
    fontSize: 13,
    fontWeight: 600,
    background: '#059669',
    color: '#FFFFFF',
    border: 'none',
    borderRadius: 6,
    cursor: 'pointer',
  },
  closeButton: {
    background: 'none',
    border: 'none',
    fontSize: 28,
    color: '#9CA3AF',
    cursor: 'pointer',
    lineHeight: 1,
  },
  modalBody: {
    padding: 24,
  },
  fitBanner: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    background: '#F8FAFB',
    borderRadius: 8,
    marginBottom: 20,
    flexWrap: 'wrap',
    gap: 12,
  },
  fitBannerLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
  },
  fitLabel: {
    fontSize: 13,
    fontWeight: 600,
    color: '#5A7A82',
  },
  fitScoreLarge: {
    fontSize: 28,
    fontWeight: 800,
  },
  fitBannerRight: {
    display: 'flex',
    gap: 8,
  },
  viewFitButton: {
    padding: '8px 14px',
    fontSize: 13,
    fontWeight: 600,
    background: '#004751',
    color: '#FFFFFF',
    border: 'none',
    borderRadius: 6,
    cursor: 'pointer',
  },
  copyButton: {
    padding: '8px 14px',
    fontSize: 13,
    fontWeight: 600,
    background: '#FFFFFF',
    color: '#004751',
    border: '1px solid #004751',
    borderRadius: 6,
    cursor: 'pointer',
  },
  pdfButton: {
    padding: '8px 14px',
    fontSize: 13,
    fontWeight: 600,
    background: '#FFFFFF',
    color: '#059669',
    border: '1px solid #059669',
    borderRadius: 6,
    cursor: 'pointer',
  },
  regenerateButton: {
    padding: '8px 10px',
    fontSize: 13,
    background: '#FFFFFF',
    color: '#5A7A82',
    border: '1px solid #D1D9DD',
    borderRadius: 6,
    cursor: 'pointer',
  },
  emailButton: {
    padding: '8px 14px',
    fontSize: 13,
    fontWeight: 600,
    background: '#059669',
    color: '#FFFFFF',
    border: 'none',
    borderRadius: 6,
    cursor: 'pointer',
  },
  editForm: {
    display: 'flex',
    flexDirection: 'column',
    gap: 16,
  },
  formRow: {
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
  },
  formRowGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: 12,
    marginBottom: 12,
  },
  formLabel: {
    fontSize: 13,
    fontWeight: 600,
    color: '#5A7A82',
  },
  formSelect: {
    padding: '10px 12px',
    fontSize: 14,
    border: '1px solid #D1D9DD',
    borderRadius: 6,
  },
  formInput: {
    padding: '10px 12px',
    fontSize: 14,
    border: '1px solid #D1D9DD',
    borderRadius: 6,
  },
  formTextarea: {
    padding: '10px 12px',
    fontSize: 14,
    border: '1px solid #D1D9DD',
    borderRadius: 6,
    fontFamily: 'inherit',
    resize: 'vertical',
  },
  detailsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: 12,
    marginBottom: 20,
    padding: 16,
    background: '#F8FAFB',
    borderRadius: 8,
  },
  detailItem: {
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
  },
  detailLabel: {
    fontSize: 12,
    color: '#5A7A82',
    fontWeight: 600,
  },
  detailValue: {
    fontSize: 14,
    color: '#1A2A30',
    fontWeight: 500,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: 600,
    color: '#004751',
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  dimensionsSection: {
    marginBottom: 20,
  },
  dimensionsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
    gap: 10,
  },
  dimensionCard: {
    background: '#F8FAFB',
    borderRadius: 8,
    padding: 12,
    border: '1px solid #E8ECEE',
  },
  dimensionHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  dimensionName: {
    fontSize: 12,
    fontWeight: 600,
    color: '#1A2A30',
  },
  dimensionScore: {
    fontSize: 15,
    fontWeight: 700,
  },
  dimensionNote: {
    fontSize: 11,
    color: '#5A7A82',
    lineHeight: 1.4,
  },
  recommendationBox: {
    background: '#F0FDF4',
    borderRadius: 8,
    padding: 16,
    marginBottom: 20,
    borderLeft: '4px solid #059669',
  },
  recommendationText: {
    margin: 0,
    fontSize: 14,
    lineHeight: 1.6,
    color: '#1A2A30',
  },
  notesBox: {
    background: '#F8FAFB',
    borderRadius: 8,
    padding: 16,
  },
  notesText: {
    margin: 0,
    fontSize: 14,
    lineHeight: 1.6,
    color: '#5A7A82',
  },
  adminLink: {
    fontSize: 11,
    fontWeight: 600,
    color: '#059669',
    textDecoration: 'none',
    padding: '2px 6px',
    background: '#ECFDF5',
    borderRadius: 4,
  },
  // Submit Driver Modal styles
  submitDriverModal: {
    background: '#FFFFFF',
    borderRadius: 12,
    width: '90%',
    maxWidth: 550,
    maxHeight: '90vh',
    overflow: 'auto',
  },
  submitStep: {
    marginBottom: 20,
  },
  submitStepLabel: {
    fontSize: 13,
    fontWeight: 600,
    color: '#004751',
    marginBottom: 6,
  },
  searchHint: {
    fontSize: 12,
    color: '#5A7A82',
    marginBottom: 10,
  },
  jobSelect: {
    width: '100%',
    padding: '10px 12px',
    fontSize: 14,
    border: '1px solid #D1D9DD',
    borderRadius: 6,
    background: '#FFFFFF',
  },
  searchModeRow: {
    display: 'flex',
    gap: 4,
    marginBottom: 10,
  },
  searchModeButton: {
    padding: '6px 12px',
    fontSize: 12,
    fontWeight: 500,
    background: '#FFFFFF',
    color: '#5A7A82',
    border: '1px solid #D1D9DD',
    borderRadius: 4,
    cursor: 'pointer',
  },
  searchModeActive: {
    padding: '6px 12px',
    fontSize: 12,
    fontWeight: 600,
    background: '#004751',
    color: '#FFFFFF',
    border: '1px solid #004751',
    borderRadius: 4,
    cursor: 'pointer',
  },
  searchRow: {
    display: 'flex',
    gap: 8,
  },
  searchInputModal: {
    flex: 1,
    padding: '8px 12px',
    fontSize: 14,
    border: '1px solid #D1D9DD',
    borderRadius: 6,
  },
  searchButton: {
    padding: '8px 14px',
    fontSize: 13,
    fontWeight: 500,
    background: '#004751',
    color: '#FFFFFF',
    border: 'none',
    borderRadius: 6,
    cursor: 'pointer',
  },
  newDriverButton: {
    padding: '8px 14px',
    fontSize: 13,
    fontWeight: 500,
    background: '#059669',
    color: '#FFFFFF',
    border: 'none',
    borderRadius: 6,
    cursor: 'pointer',
  },
  searchResults: {
    marginTop: 10,
    border: '1px solid #E8ECEE',
    borderRadius: 6,
    overflow: 'hidden',
    maxHeight: 200,
    overflowY: 'auto',
  },
  searchResultItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '10px 12px',
    borderBottom: '1px solid #E8ECEE',
    background: '#FFFFFF',
  },
  candidateName: {
    fontWeight: 500,
    color: '#1A2A30',
  },
  candidateMeta: {
    fontSize: 12,
    color: '#5A7A82',
  },
  submitButton: {
    padding: '6px 12px',
    fontSize: 12,
    fontWeight: 600,
    background: '#059669',
    color: '#FFFFFF',
    border: 'none',
    borderRadius: 4,
    cursor: 'pointer',
  },
  newDriverForm: {
    padding: 4,
  },
  newDriverGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
    gap: 8,
    marginBottom: 12,
  },
  newDriverInput: {
    padding: '8px 10px',
    fontSize: 14,
    border: '1px solid #D1D9DD',
    borderRadius: 4,
  },
  newDriverActions: {
    display: 'flex',
    gap: 8,
    justifyContent: 'flex-end',
  },
  fitPreview: {
    marginRight: 10,
    minWidth: 40,
    textAlign: 'center',
  },
  fitLoading: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  fitScorePreview: {
    fontSize: 14,
    fontWeight: 700,
  },
  inlineSelect: {
    padding: '4px 6px',
    fontSize: 12,
    border: '1px solid #004751',
    borderRadius: 4,
    background: '#FFFFFF',
    cursor: 'pointer',
    minWidth: 80,
  },
  editableCell: {
    cursor: 'pointer',
    padding: '4px 8px',
    borderRadius: 4,
    transition: 'background 0.15s',
    ':hover': {
      background: '#F0F4F5',
    },
  },
  // Email Modal styles
  emailModalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(0,0,0,0.6)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1100,
  },
  emailModal: {
    background: '#FFFFFF',
    borderRadius: 12,
    width: '90%',
    maxWidth: 700,
    maxHeight: '90vh',
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
  },
  emailModalHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '16px 20px',
    borderBottom: '1px solid #E8ECEE',
    background: '#F8FAFB',
  },
  emailModalTitle: {
    margin: 0,
    fontSize: 18,
    fontWeight: 700,
    color: '#004751',
  },
  emailModalBody: {
    padding: 20,
    flex: 1,
    overflow: 'auto',
    display: 'flex',
    flexDirection: 'column',
    gap: 16,
  },
  emailInputRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
  },
  emailLabel: {
    fontSize: 14,
    fontWeight: 600,
    color: '#004751',
    minWidth: 70,
  },
  emailInput: {
    flex: 1,
    padding: '10px 12px',
    fontSize: 14,
    border: '1px solid #D1D9DD',
    borderRadius: 6,
  },
  emailError: {
    background: '#FEF2F2',
    color: '#DC2626',
    padding: '8px 12px',
    borderRadius: 6,
    fontSize: 13,
  },
  previewLabel: {
    fontSize: 13,
    fontWeight: 600,
    color: '#5A7A82',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  previewFrame: {
    width: '100%',
    height: 400,
    border: '1px solid #E8ECEE',
    borderRadius: 8,
    background: '#F4F4F4',
  },
  emailActions: {
    display: 'flex',
    gap: 10,
    justifyContent: 'flex-end',
    marginTop: 8,
  },
  sendButton: {
    padding: '10px 20px',
    fontSize: 14,
    fontWeight: 600,
    background: '#059669',
    color: '#FFFFFF',
    border: 'none',
    borderRadius: 6,
    cursor: 'pointer',
  },
  sentMessage: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
    gap: 16,
  },
  sentIcon: {
    fontSize: 48,
  },
  sentText: {
    fontSize: 16,
    fontWeight: 600,
    color: '#004751',
  },
  doneButton: {
    padding: '10px 24px',
    fontSize: 14,
    fontWeight: 600,
    background: '#004751',
    color: '#FFFFFF',
    border: 'none',
    borderRadius: 6,
    cursor: 'pointer',
    marginTop: 8,
  },
  // HubSpot contact search
  contactSearchSection: {
    marginBottom: 16,
    position: 'relative',
  },
  searchingText: {
    fontSize: 12,
    color: '#5A7A82',
    marginTop: 4,
  },
  contactResults: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    background: '#FFFFFF',
    border: '1px solid #D1D9DD',
    borderRadius: 6,
    boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
    zIndex: 100,
    maxHeight: 200,
    overflowY: 'auto',
  },
  contactResult: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '10px 12px',
    borderBottom: '1px solid #E8ECEE',
    cursor: 'pointer',
  },
  contactInfo: {
    flex: 1,
  },
  contactName: {
    fontWeight: 600,
    color: '#004751',
    fontSize: 14,
  },
  contactMeta: {
    fontSize: 12,
    color: '#5A7A82',
  },
  contactActions: {
    display: 'flex',
    gap: 6,
  },
  addToButton: {
    padding: '4px 8px',
    fontSize: 11,
    fontWeight: 600,
    background: '#004751',
    color: '#FFFFFF',
    border: 'none',
    borderRadius: 4,
    cursor: 'pointer',
  },
  addCcButton: {
    padding: '4px 8px',
    fontSize: 11,
    fontWeight: 600,
    background: '#FFFFFF',
    color: '#5A7A82',
    border: '1px solid #D1D9DD',
    borderRadius: 4,
    cursor: 'pointer',
  },
};
