import { useState, useEffect } from 'react';
import AdminLayout from './AdminLayout';
import { listSubmissions, updateSubmission } from '../lib/api';

const STATUSES = ['Submitted', 'Interviewing', 'Offer Extended', 'Hired', 'Rejected', 'Withdrawn'];
const REJECTION_REASONS = ['No Response', 'Failed Background', 'Client Rejected', 'Driver Declined', 'Position Filled'];

export default function Submissions() {
  const [submissions, setSubmissions] = useState([]);
  const [collaborators, setCollaborators] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedSub, setSelectedSub] = useState(null);

  // Filters
  const [filterStatus, setFilterStatus] = useState('');
  const [filterAgent, setFilterAgent] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('submitted_date');
  const [sortDir, setSortDir] = useState('desc');

  useEffect(() => {
    loadSubmissions();
    loadCollaborators();
  }, []);

  const loadCollaborators = async () => {
    try {
      const res = await fetch('/api/collaborators');
      const data = await res.json();
      setCollaborators(data.collaborators || []);
    } catch (err) {
      console.error('Failed to load collaborators:', err);
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

  const SortHeader = ({ field, children, style = {} }) => (
    <div
      style={{ ...styles.tableCell, ...style, cursor: 'pointer', userSelect: 'none' }}
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
      </div>

      {/* Filters */}
      <div style={styles.filters}>
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
          <SortHeader field="candidate_name" style={{ flex: 2 }}>Driver</SortHeader>
          <SortHeader field="employer" style={{ flex: 2 }}>Job</SortHeader>
          <SortHeader field="fit_score" style={{ width: 60, textAlign: 'center', flex: 'none' }}>Fit</SortHeader>
          <div style={{ ...styles.tableCell, width: 90, flex: 'none' }}>Status</div>
          <div style={{ ...styles.tableCell, width: 90, flex: 'none' }}>Agent</div>
          <SortHeader field="submitted_date" style={{ width: 90, flex: 'none' }}>Date</SortHeader>
          <div style={{ ...styles.tableCell, width: 70, flex: 'none' }}>Actions</div>
        </div>

        {sortedSubs.map(sub => {
          const statusStyle = getStatusColor(sub.status);
          return (
            <div key={sub.id} style={styles.tableRow}>
              <div style={{ ...styles.tableCell, flex: 2 }}>
                <div style={styles.primaryText}>{sub.candidate_name}</div>
              </div>
              <div style={{ ...styles.tableCell, flex: 2 }}>
                <div style={styles.primaryText}>{sub.employer}</div>
                <div style={styles.secondaryText}>{sub.job_title}</div>
              </div>
              <div style={{ ...styles.tableCell, width: 60, textAlign: 'center', flex: 'none' }}>
                {sub.fit_score ? (
                  <span style={{ ...styles.fitBadge, color: getScoreColor(sub.fit_score) }}>
                    {sub.fit_score}
                  </span>
                ) : '-'}
              </div>
              <div style={{ ...styles.tableCell, width: 90, flex: 'none' }}>
                <span style={{ ...styles.statusBadge, background: statusStyle.bg, color: statusStyle.color }}>
                  {sub.status}
                </span>
              </div>
              <div style={{ ...styles.tableCell, width: 90, flex: 'none', fontSize: 13, color: '#5A7A82' }}>
                {sub.career_agent?.name || sub.career_agent_name || '-'}
              </div>
              <div style={{ ...styles.tableCell, width: 90, flex: 'none' }}>
                {sub.submitted_date}
              </div>
              <div style={{ ...styles.tableCell, width: 70, flex: 'none' }}>
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
    </AdminLayout>
  );
}

function SubmissionModal({ submission, collaborators, onClose, onRefresh }) {
  const [editing, setEditing] = useState(false);
  const [formData, setFormData] = useState({ ...submission });
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleFieldChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateSubmission(submission.id, {
        status: formData.status,
        rejection_reason: formData.rejection_reason,
        hire_date: formData.hire_date,
        notes: formData.notes,
        career_agent: formData.career_agent,
      });
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
              {submission.driver_fit_link && (
                <div style={styles.fitBannerRight}>
                  <button onClick={() => window.open(submission.driver_fit_link, '_blank')} style={styles.viewFitButton}>
                    View Fit Profile
                  </button>
                  <button onClick={handleCopyLink} style={styles.copyButton}>
                    {copied ? 'Copied!' : 'Copy Link'}
                  </button>
                </div>
              )}
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
  title: {
    margin: 0,
    fontSize: 28,
    fontWeight: 700,
    color: '#004751',
    fontFamily: 'Georgia, serif',
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
    background: '#FFFFFF',
    borderRadius: 12,
    border: '1px solid #E8ECEE',
    overflow: 'hidden',
  },
  tableHeader: {
    display: 'flex',
    padding: '12px 16px',
    background: '#F8FAFB',
    borderBottom: '1px solid #E8ECEE',
    fontSize: 11,
    fontWeight: 600,
    color: '#5A7A82',
    textTransform: 'uppercase',
  },
  tableRow: {
    display: 'flex',
    padding: '14px 16px',
    borderBottom: '1px solid #E8ECEE',
    alignItems: 'center',
  },
  tableCell: {
    flex: 1,
    paddingRight: 12,
    fontSize: 14,
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
};
