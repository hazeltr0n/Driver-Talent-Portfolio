import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import EmployerLayout from './EmployerLayout';
import { getCandidateProfile, listEmployerJobs, requestInterview } from '../lib/employer-api';

export default function CandidateProfile() {
  const { uuid } = useParams();
  const navigate = useNavigate();
  const [candidate, setCandidate] = useState(null);
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showRequestModal, setShowRequestModal] = useState(false);

  useEffect(() => {
    loadData();
  }, [uuid]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [candidateData, jobsData] = await Promise.all([
        getCandidateProfile(uuid),
        listEmployerJobs('Active'),
      ]);
      setCandidate(candidateData);
      setJobs(jobsData || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <EmployerLayout>
        <div style={styles.loading}>Loading candidate profile...</div>
      </EmployerLayout>
    );
  }

  if (error) {
    return (
      <EmployerLayout>
        <div style={styles.error}>{error}</div>
        <button onClick={() => navigate('/employer/drivers')} style={styles.backButton}>
          Back to Driver Feed
        </button>
      </EmployerLayout>
    );
  }

  if (!candidate) {
    return (
      <EmployerLayout>
        <div style={styles.error}>Candidate not found</div>
      </EmployerLayout>
    );
  }

  const bestFit = candidate.fit_profiles?.[0];

  return (
    <EmployerLayout>
      <div style={styles.header}>
        <button onClick={() => navigate('/employer/drivers')} style={styles.backLink}>
          ← Back to Driver Feed
        </button>
      </div>

      <div style={styles.profileHeader}>
        <div style={styles.profileInfo}>
          <h1 style={styles.name}>{candidate.fullName}</h1>
          <div style={styles.meta}>
            {candidate.city}, {candidate.state} · CDL-{candidate.cdl_class} · {candidate.years_experience} years experience
          </div>
          {candidate.endorsements && (
            <div style={styles.endorsements}>
              Endorsements: {candidate.endorsements}
            </div>
          )}
        </div>
        <div style={styles.profileActions}>
          {bestFit && (
            <div style={styles.topScore}>
              <span style={styles.scoreLabel}>Top Fit Score</span>
              <span style={styles.scoreValue}>{bestFit.fit_score}%</span>
            </div>
          )}
          <button onClick={() => setShowRequestModal(true)} style={styles.requestButton}>
            Request Interview
          </button>
        </div>
      </div>

      <div style={styles.grid}>
        <div style={styles.mainContent}>
          {/* Narrative */}
          {candidate.ai_narrative && (
            <div style={styles.section}>
              <h2 style={styles.sectionTitle}>About This Driver</h2>
              <p style={styles.narrative}>{candidate.ai_narrative}</p>
            </div>
          )}

          {/* Pull Quote */}
          {candidate.ai_pull_quote && (
            <div style={styles.pullQuote}>
              "{candidate.ai_pull_quote}"
            </div>
          )}

          {/* Video */}
          {candidate.video_url && (
            <div style={styles.section}>
              <h2 style={styles.sectionTitle}>Driver Story Video</h2>
              <div style={styles.videoContainer}>
                <video
                  src={candidate.video_url}
                  controls
                  style={styles.video}
                  poster="/video-poster.png"
                />
              </div>
            </div>
          )}

          {/* Equipment Experience */}
          {candidate.equipment_experience?.length > 0 && (
            <div style={styles.section}>
              <h2 style={styles.sectionTitle}>Equipment Experience</h2>
              <div style={styles.equipmentGrid}>
                {candidate.equipment_experience.map((eq, i) => (
                  <div key={i} style={styles.equipmentItem}>
                    <div style={styles.equipmentType}>{eq.type}</div>
                    {eq.years && <div style={styles.equipmentYears}>{eq.years} years</div>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Employment History */}
          {candidate.employment_history?.length > 0 && (
            <div style={styles.section}>
              <h2 style={styles.sectionTitle}>Employment History</h2>
              <div style={styles.timeline}>
                {candidate.employment_history.map((job, i) => (
                  <div key={i} style={styles.timelineItem}>
                    <div style={styles.timelineDot} />
                    <div style={styles.timelineContent}>
                      <div style={styles.jobRole}>{job.role || job.title}</div>
                      <div style={styles.jobCompany}>{job.company}</div>
                      {job.dates && <div style={styles.jobDates}>{job.dates}</div>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div style={styles.sidebar}>
          {/* Fit Profiles */}
          {candidate.fit_profiles?.length > 0 && (
            <div style={styles.sidebarSection}>
              <h3 style={styles.sidebarTitle}>Job Fit Scores</h3>
              {candidate.fit_profiles.map((fp, i) => (
                <div key={i} style={styles.fitCard}>
                  <div style={styles.fitHeader}>
                    <span style={styles.fitJobTitle}>{fp.job_title}</span>
                    <span style={{ ...styles.fitScore, ...getScoreStyle(fp.fit_score) }}>
                      {fp.fit_score}%
                    </span>
                  </div>
                  {fp.fit_dimensions?.length > 0 && (
                    <div style={styles.fitDimensions}>
                      {fp.fit_dimensions.map((dim, j) => (
                        <div key={j} style={styles.fitDim}>
                          <span>{dim.name}</span>
                          <span style={{ color: getScoreStyle(dim.score).color }}>{dim.score}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  {fp.fit_recommendation && (
                    <p style={styles.fitRecommendation}>{fp.fit_recommendation}</p>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Quick Stats */}
          <div style={styles.sidebarSection}>
            <h3 style={styles.sidebarTitle}>Quick Stats</h3>
            <div style={styles.statsList}>
              <div style={styles.statItem}>
                <span style={styles.statLabel}>Home Time Preference</span>
                <span style={styles.statValue}>{candidate.home_time_preference || 'Flexible'}</span>
              </div>
              <div style={styles.statItem}>
                <span style={styles.statLabel}>CDL Class</span>
                <span style={styles.statValue}>{candidate.cdl_class || '-'}</span>
              </div>
              <div style={styles.statItem}>
                <span style={styles.statLabel}>Experience</span>
                <span style={styles.statValue}>{candidate.years_experience || 0} years</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {showRequestModal && (
        <RequestInterviewModal
          candidate={candidate}
          jobs={jobs}
          onClose={() => setShowRequestModal(false)}
          onSuccess={() => {
            setShowRequestModal(false);
            navigate('/employer/submissions');
          }}
        />
      )}
    </EmployerLayout>
  );
}

function RequestInterviewModal({ candidate, jobs, onClose, onSuccess }) {
  const [selectedJob, setSelectedJob] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedJob) {
      setError('Please select a job');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      await requestInterview(candidate.uuid, selectedJob, notes);
      onSuccess();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={modalStyles.overlay} onClick={onClose}>
      <div style={modalStyles.modal} onClick={e => e.stopPropagation()}>
        <div style={modalStyles.header}>
          <h2 style={modalStyles.title}>Request Interview</h2>
          <button onClick={onClose} style={modalStyles.closeButton}>×</button>
        </div>

        <form onSubmit={handleSubmit} style={modalStyles.body}>
          <p style={modalStyles.description}>
            Request an interview with <strong>{candidate.fullName}</strong>.
            Our career agent team will facilitate the connection.
          </p>

          {error && <div style={modalStyles.error}>{error}</div>}

          <div style={modalStyles.field}>
            <label style={modalStyles.label}>Select Position</label>
            <select
              value={selectedJob}
              onChange={e => setSelectedJob(e.target.value)}
              style={modalStyles.select}
              required
            >
              <option value="">Choose a job...</option>
              {jobs.map(job => (
                <option key={job.id} value={job.id}>{job.title}</option>
              ))}
            </select>
          </div>

          <div style={modalStyles.field}>
            <label style={modalStyles.label}>Notes (optional)</label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Any additional notes for the career agent..."
              style={modalStyles.textarea}
              rows={3}
            />
          </div>

          <div style={modalStyles.actions}>
            <button type="button" onClick={onClose} style={modalStyles.cancelButton}>
              Cancel
            </button>
            <button type="submit" disabled={submitting} style={modalStyles.submitButton}>
              {submitting ? 'Requesting...' : 'Request Interview'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function getScoreStyle(score) {
  if (score >= 85) return { background: '#D1FAE5', color: '#059669' };
  if (score >= 70) return { background: '#FEF3C7', color: '#D97706' };
  return { background: '#FEE2E2', color: '#DC2626' };
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
  profileHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    background: '#FFFFFF',
    borderRadius: 12,
    border: '1px solid #E8ECEE',
    padding: 24,
    marginBottom: 24,
    flexWrap: 'wrap',
    gap: 20,
  },
  profileInfo: {},
  name: {
    margin: 0,
    fontSize: 28,
    fontWeight: 700,
    color: '#004751',
    fontFamily: 'Georgia, serif',
  },
  meta: {
    fontSize: 14,
    color: '#5A7A82',
    marginTop: 8,
  },
  endorsements: {
    fontSize: 13,
    color: '#004751',
    marginTop: 8,
    fontWeight: 500,
  },
  profileActions: {
    display: 'flex',
    alignItems: 'center',
    gap: 20,
  },
  topScore: {
    textAlign: 'center',
  },
  scoreLabel: {
    display: 'block',
    fontSize: 11,
    color: '#5A7A82',
    marginBottom: 4,
  },
  scoreValue: {
    fontSize: 28,
    fontWeight: 700,
    color: '#059669',
  },
  requestButton: {
    padding: '12px 24px',
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
    gridTemplateColumns: '1fr 360px',
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
  sectionTitle: {
    margin: '0 0 16px',
    fontSize: 16,
    fontWeight: 600,
    color: '#004751',
  },
  narrative: {
    margin: 0,
    fontSize: 14,
    color: '#1A2A30',
    lineHeight: 1.7,
  },
  pullQuote: {
    background: '#F0F9FF',
    borderLeft: '4px solid #004751',
    padding: 20,
    margin: '0 0 20px',
    fontSize: 16,
    fontStyle: 'italic',
    color: '#004751',
    lineHeight: 1.6,
    borderRadius: '0 8px 8px 0',
  },
  videoContainer: {
    borderRadius: 8,
    overflow: 'hidden',
  },
  video: {
    width: '100%',
    background: '#000',
  },
  equipmentGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
    gap: 12,
  },
  equipmentItem: {
    background: '#F8FAFB',
    borderRadius: 8,
    padding: 12,
  },
  equipmentType: {
    fontSize: 13,
    fontWeight: 600,
    color: '#1A2A30',
  },
  equipmentYears: {
    fontSize: 12,
    color: '#5A7A82',
    marginTop: 4,
  },
  timeline: {
    borderLeft: '2px solid #E8ECEE',
    paddingLeft: 20,
  },
  timelineItem: {
    position: 'relative',
    marginBottom: 20,
  },
  timelineDot: {
    position: 'absolute',
    left: -26,
    top: 4,
    width: 12,
    height: 12,
    background: '#004751',
    borderRadius: '50%',
  },
  timelineContent: {},
  jobRole: {
    fontSize: 14,
    fontWeight: 600,
    color: '#1A2A30',
  },
  jobCompany: {
    fontSize: 13,
    color: '#5A7A82',
    marginTop: 2,
  },
  jobDates: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 2,
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
  fitCard: {
    background: '#F8FAFB',
    borderRadius: 8,
    padding: 14,
    marginBottom: 12,
  },
  fitHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  fitJobTitle: {
    fontSize: 13,
    fontWeight: 600,
    color: '#1A2A30',
  },
  fitScore: {
    padding: '4px 10px',
    fontSize: 13,
    fontWeight: 700,
    borderRadius: 12,
  },
  fitDimensions: {
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
    marginBottom: 10,
  },
  fitDim: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: 12,
    color: '#5A7A82',
  },
  fitRecommendation: {
    margin: 0,
    fontSize: 12,
    color: '#5A7A82',
    lineHeight: 1.5,
    borderTop: '1px solid #E8ECEE',
    paddingTop: 10,
  },
  statsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
  },
  statItem: {
    display: 'flex',
    justifyContent: 'space-between',
  },
  statLabel: {
    fontSize: 13,
    color: '#5A7A82',
  },
  statValue: {
    fontSize: 13,
    fontWeight: 600,
    color: '#1A2A30',
  },
};

const modalStyles = {
  overlay: {
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
    maxWidth: 480,
    maxHeight: '90vh',
    overflow: 'auto',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '20px 24px',
    borderBottom: '1px solid #E8ECEE',
  },
  title: {
    margin: 0,
    fontSize: 18,
    fontWeight: 600,
    color: '#004751',
  },
  closeButton: {
    background: 'none',
    border: 'none',
    fontSize: 24,
    color: '#9CA3AF',
    cursor: 'pointer',
  },
  body: {
    padding: 24,
  },
  description: {
    margin: '0 0 20px',
    fontSize: 14,
    color: '#5A7A82',
  },
  error: {
    background: '#FEF2F2',
    color: '#DC2626',
    padding: '10px 14px',
    borderRadius: 6,
    fontSize: 13,
    marginBottom: 16,
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
    padding: '10px 12px',
    fontSize: 14,
    border: '1px solid #D1D9DD',
    borderRadius: 6,
    fontFamily: 'inherit',
    resize: 'vertical',
    boxSizing: 'border-box',
  },
  actions: {
    display: 'flex',
    gap: 12,
    justifyContent: 'flex-end',
    marginTop: 24,
  },
  cancelButton: {
    padding: '10px 20px',
    fontSize: 14,
    fontWeight: 600,
    background: '#FFFFFF',
    color: '#5A7A82',
    border: '1px solid #D1D9DD',
    borderRadius: 6,
    cursor: 'pointer',
  },
  submitButton: {
    padding: '10px 20px',
    fontSize: 14,
    fontWeight: 600,
    background: '#004751',
    color: '#FFFFFF',
    border: 'none',
    borderRadius: 6,
    cursor: 'pointer',
  },
};
