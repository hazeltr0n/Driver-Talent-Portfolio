import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import EmployerLayout from './EmployerLayout';
import { getEmployerSubmission, updateEmployerSubmission } from '../lib/employer-api';

export default function SubmissionDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [submission, setSubmission] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);

  // Form state for feedback
  const [status, setStatus] = useState('');
  const [interviewNotes, setInterviewNotes] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [rejectionExplanation, setRejectionExplanation] = useState('');

  useEffect(() => {
    loadSubmission();
  }, [id]);

  const loadSubmission = async () => {
    try {
      setLoading(true);
      const data = await getEmployerSubmission(id);
      setSubmission(data);
      setStatus(data.status);
      setInterviewNotes(data.interview_notes || '');
      setRejectionReason(data.rejection_reason || '');
      setRejectionExplanation(data.rejection_explanation || '');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const updates = {
        status,
        interview_notes: interviewNotes,
      };

      if (status === 'Rejected') {
        updates.rejection_reason = rejectionReason;
        updates.rejection_explanation = rejectionExplanation;
      }

      await updateEmployerSubmission(id, updates);
      await loadSubmission();
    } catch (err) {
      alert('Failed to save: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const hasChanges = () => {
    if (!submission) return false;
    return (
      status !== submission.status ||
      interviewNotes !== (submission.interview_notes || '') ||
      rejectionReason !== (submission.rejection_reason || '') ||
      rejectionExplanation !== (submission.rejection_explanation || '')
    );
  };

  if (loading) {
    return (
      <EmployerLayout>
        <div style={styles.loading}>Loading submission...</div>
      </EmployerLayout>
    );
  }

  if (error || !submission) {
    return (
      <EmployerLayout>
        <div style={styles.error}>{error || 'Submission not found'}</div>
        <button onClick={() => navigate('/employer/submissions')} style={styles.backButton}>
          Back to Submissions
        </button>
      </EmployerLayout>
    );
  }

  const getScoreColor = (score) => {
    if (score >= 85) return { background: '#D1FAE5', color: '#059669' };
    if (score >= 70) return { background: '#FEF3C7', color: '#D97706' };
    return { background: '#FEE2E2', color: '#DC2626' };
  };

  return (
    <EmployerLayout>
      <div style={styles.header}>
        <button onClick={() => navigate('/employer/submissions')} style={styles.backLink}>
          ← Back to Submissions
        </button>
      </div>

      <div style={styles.grid}>
        <div style={styles.mainContent}>
          {/* Candidate Info */}
          <div style={styles.section}>
            <div style={styles.candidateHeader}>
              <div>
                <h1 style={styles.candidateName}>{submission.candidate_name}</h1>
                <div style={styles.jobInfo}>
                  Applied for <strong>{submission.job_title}</strong>
                </div>
              </div>
              <div style={{ ...styles.scoreBadge, ...getScoreColor(submission.fit_score) }}>
                {submission.fit_score}% Fit
              </div>
            </div>

            {submission.portfolio_slug && (
              <a
                href={`/portfolio/${submission.portfolio_slug}?submission=${submission.id}`}
                target="_blank"
                rel="noopener noreferrer"
                style={styles.portfolioLink}
              >
                View Full Portfolio →
              </a>
            )}
          </div>

          {/* Fit Details */}
          {submission.fit_recommendation && (
            <div style={styles.section}>
              <h2 style={styles.sectionTitle}>AI Fit Assessment</h2>
              <p style={styles.recommendation}>{submission.fit_recommendation}</p>

              {submission.fit_dimensions?.length > 0 && (
                <div style={styles.dimensionsGrid}>
                  {submission.fit_dimensions.map((dim, i) => (
                    <div key={i} style={styles.dimension}>
                      <div style={styles.dimHeader}>
                        <span style={styles.dimName}>{dim.name}</span>
                        <span style={{ ...styles.dimScore, color: getScoreColor(dim.score).color }}>
                          {dim.score}
                        </span>
                      </div>
                      <div style={styles.dimNote}>{dim.note}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Interview Notes */}
          <div style={styles.section}>
            <h2 style={styles.sectionTitle}>Interview Notes</h2>
            <textarea
              value={interviewNotes}
              onChange={e => setInterviewNotes(e.target.value)}
              placeholder="Add notes from interviews, phone screens, or other interactions..."
              style={styles.textarea}
              rows={6}
            />
          </div>

          {/* Rejection Feedback (only show if rejected) */}
          {status === 'Rejected' && (
            <div style={styles.section}>
              <h2 style={styles.sectionTitle}>Rejection Feedback</h2>
              <p style={styles.feedbackNote}>
                Providing feedback helps our career agents support candidates and improves future matches.
              </p>

              <div style={styles.field}>
                <label style={styles.label}>Rejection Reason</label>
                <select
                  value={rejectionReason}
                  onChange={e => setRejectionReason(e.target.value)}
                  style={styles.select}
                >
                  <option value="">Select reason...</option>
                  <option value="No Response">No Response</option>
                  <option value="Failed Background">Failed Background Check</option>
                  <option value="Client Rejected">Did Not Meet Requirements</option>
                  <option value="Driver Declined">Candidate Declined</option>
                  <option value="Position Filled">Position Already Filled</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div style={styles.field}>
                <label style={styles.label}>Additional Details</label>
                <textarea
                  value={rejectionExplanation}
                  onChange={e => setRejectionExplanation(e.target.value)}
                  placeholder="Provide more context to help our team..."
                  style={styles.textarea}
                  rows={3}
                />
              </div>
            </div>
          )}
        </div>

        <div style={styles.sidebar}>
          {/* Status & Actions */}
          <div style={styles.sidebarSection}>
            <h3 style={styles.sidebarTitle}>Status</h3>

            <div style={styles.field}>
              <select
                value={status}
                onChange={e => setStatus(e.target.value)}
                style={styles.statusSelect}
              >
                <option value="Submitted">Submitted</option>
                <option value="Interviewing">Interviewing</option>
                <option value="Offer Extended">Offer Extended</option>
                <option value="Hired">Hired</option>
                <option value="Rejected">Rejected</option>
                <option value="Withdrawn">Withdrawn</option>
              </select>
            </div>

            <button
              onClick={handleSave}
              disabled={saving || !hasChanges()}
              style={{
                ...styles.saveButton,
                ...((!hasChanges()) ? styles.saveButtonDisabled : {}),
              }}
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>

          {/* Submission Details */}
          <div style={styles.sidebarSection}>
            <h3 style={styles.sidebarTitle}>Details</h3>
            <div style={styles.detailsList}>
              <div style={styles.detailItem}>
                <span style={styles.detailLabel}>Submitted</span>
                <span style={styles.detailValue}>{submission.submitted_date}</span>
              </div>
              {submission.hire_date && (
                <div style={styles.detailItem}>
                  <span style={styles.detailLabel}>Hired</span>
                  <span style={styles.detailValue}>{submission.hire_date}</span>
                </div>
              )}
              <div style={styles.detailItem}>
                <span style={styles.detailLabel}>Requested By</span>
                <span style={styles.detailValue}>{submission.requested_by}</span>
              </div>
            </div>
          </div>

          {/* View Candidate Profile */}
          <button
            onClick={() => navigate(`/employer/drivers/${submission.candidate_uuid}`)}
            style={styles.viewProfileButton}
          >
            View Full Profile
          </button>
        </div>
      </div>
    </EmployerLayout>
  );
}

const styles = {
  header: {
    marginBottom: 16,
  },
  backLink: {
    background: 'none',
    border: 'none',
    color: '#004751',
    fontSize: 14,
    cursor: 'pointer',
    padding: 0,
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
  backButton: {
    padding: '10px 20px',
    fontSize: 14,
    fontWeight: 600,
    background: '#004751',
    color: '#FFFFFF',
    border: 'none',
    borderRadius: 6,
    cursor: 'pointer',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: '1fr 320px',
    gap: 24,
  },
  mainContent: {},
  sidebar: {},
  section: {
    background: '#FFFFFF',
    borderRadius: 12,
    border: '1px solid #E8ECEE',
    padding: 24,
    marginBottom: 20,
  },
  candidateHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  candidateName: {
    margin: 0,
    fontSize: 24,
    fontWeight: 700,
    color: '#004751',
    fontFamily: 'Georgia, serif',
  },
  jobInfo: {
    fontSize: 14,
    color: '#5A7A82',
    marginTop: 4,
  },
  scoreBadge: {
    padding: '8px 16px',
    fontSize: 16,
    fontWeight: 700,
    borderRadius: 20,
  },
  portfolioLink: {
    display: 'inline-block',
    color: '#004751',
    fontSize: 14,
    fontWeight: 600,
    textDecoration: 'none',
  },
  sectionTitle: {
    margin: '0 0 16px',
    fontSize: 16,
    fontWeight: 600,
    color: '#004751',
  },
  recommendation: {
    margin: '0 0 20px',
    fontSize: 14,
    color: '#1A2A30',
    lineHeight: 1.7,
  },
  dimensionsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: 12,
  },
  dimension: {
    background: '#F8FAFB',
    borderRadius: 8,
    padding: 12,
  },
  dimHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  dimName: {
    fontSize: 12,
    fontWeight: 600,
    color: '#1A2A30',
  },
  dimScore: {
    fontSize: 14,
    fontWeight: 700,
  },
  dimNote: {
    fontSize: 11,
    color: '#5A7A82',
    lineHeight: 1.4,
  },
  field: {
    marginBottom: 16,
  },
  label: {
    display: 'block',
    fontSize: 13,
    fontWeight: 600,
    color: '#1A2A30',
    marginBottom: 6,
  },
  select: {
    width: '100%',
    padding: '10px 12px',
    fontSize: 14,
    border: '1px solid #D1D9DD',
    borderRadius: 6,
    background: '#FFFFFF',
  },
  textarea: {
    width: '100%',
    padding: '12px',
    fontSize: 14,
    border: '1px solid #D1D9DD',
    borderRadius: 6,
    fontFamily: 'inherit',
    resize: 'vertical',
    boxSizing: 'border-box',
  },
  feedbackNote: {
    margin: '0 0 16px',
    fontSize: 13,
    color: '#5A7A82',
  },
  sidebarSection: {
    background: '#FFFFFF',
    borderRadius: 12,
    border: '1px solid #E8ECEE',
    padding: 20,
    marginBottom: 16,
  },
  sidebarTitle: {
    margin: '0 0 16px',
    fontSize: 14,
    fontWeight: 600,
    color: '#004751',
  },
  statusSelect: {
    width: '100%',
    padding: '12px',
    fontSize: 14,
    border: '1px solid #D1D9DD',
    borderRadius: 6,
    background: '#FFFFFF',
    marginBottom: 16,
  },
  saveButton: {
    width: '100%',
    padding: '12px',
    fontSize: 14,
    fontWeight: 600,
    background: '#004751',
    color: '#FFFFFF',
    border: 'none',
    borderRadius: 6,
    cursor: 'pointer',
  },
  saveButtonDisabled: {
    background: '#9CA3AF',
    cursor: 'not-allowed',
  },
  detailsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
  },
  detailItem: {
    display: 'flex',
    justifyContent: 'space-between',
  },
  detailLabel: {
    fontSize: 13,
    color: '#5A7A82',
  },
  detailValue: {
    fontSize: 13,
    fontWeight: 500,
    color: '#1A2A30',
  },
  viewProfileButton: {
    width: '100%',
    padding: '12px',
    fontSize: 14,
    fontWeight: 600,
    background: '#FFFFFF',
    color: '#004751',
    border: '1px solid #004751',
    borderRadius: 6,
    cursor: 'pointer',
  },
};
