import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import EmployerLayout from './EmployerLayout';
import { getCandidateProfile, listEmployerJobs, requestInterview } from '../lib/employer-api';

// Format name as "First L." for privacy
function formatDisplayName(fullName) {
  if (!fullName) return 'Driver';
  const parts = fullName.trim().split(/\s+/);
  if (parts.length === 1) return parts[0];
  const firstName = parts[0];
  const lastInitial = parts[parts.length - 1][0];
  return `${firstName} ${lastInitial}.`;
}

export default function CandidateProfile() {
  const { uuid } = useParams();
  const navigate = useNavigate();
  const [candidate, setCandidate] = useState(null);
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [isVideoPlaying, setIsVideoPlaying] = useState(false);
  const videoRef = useRef(null);

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

  const handlePlayVideo = () => {
    if (videoRef.current) {
      videoRef.current.play();
      setIsVideoPlaying(true);
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
  const displayName = formatDisplayName(candidate.fullName);

  return (
    <EmployerLayout>
      {/* Back Navigation */}
      <div style={styles.nav}>
        <button onClick={() => navigate('/employer/drivers')} style={styles.backLink}>
          ← Back to Driver Feed
        </button>
      </div>

      {/* Video Hero Section */}
      {candidate.video_url ? (
        <div style={styles.videoHero}>
          <div style={styles.videoWrapper}>
            <video
              ref={videoRef}
              src={candidate.video_url}
              style={styles.video}
              controls={isVideoPlaying}
              onPlay={() => setIsVideoPlaying(true)}
              onPause={() => setIsVideoPlaying(false)}
              playsInline
            />
            {!isVideoPlaying && (
              <div style={styles.videoOverlayMinimal} onClick={handlePlayVideo}>
                <div style={styles.playButtonLarge}>
                  <svg width="40" height="40" viewBox="0 0 24 24" fill="#004751">
                    <path d="M8 5v14l11-7z"/>
                  </svg>
                </div>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* No Video - Text Hero */
        <div style={styles.textHero}>
          <div style={styles.heroName}>{displayName}</div>
          <div style={styles.heroMeta}>
            {candidate.city}, {candidate.state} · CDL-{candidate.cdl_class} · {candidate.years_experience} years experience
          </div>
        </div>
      )}

      {/* Quick Action Bar */}
      <div style={styles.actionBar}>
        <div style={styles.actionBarLeft}>
          {bestFit && (
            <div style={styles.fitScoreDisplay}>
              <span style={styles.fitScoreNumber}>{bestFit.fit_score}%</span>
              <span style={styles.fitScoreLabel}>Fit Score</span>
            </div>
          )}
          <div style={styles.badges}>
            <span style={styles.badge}>CDL-{candidate.cdl_class}</span>
            {candidate.endorsements && (
              <span style={styles.badge}>{candidate.endorsements}</span>
            )}
            <span style={styles.badge}>{candidate.years_experience} yrs exp</span>
            {candidate.home_time_preference && (
              <span style={styles.badge}>{candidate.home_time_preference}</span>
            )}
          </div>
        </div>
        <button onClick={() => setShowRequestModal(true)} style={styles.requestButton}>
          Request Interview
        </button>
      </div>

      {/* Main Content */}
      <div style={styles.content}>
        {/* Pull Quote - Prominent */}
        {candidate.ai_pull_quote && (
          <div style={styles.pullQuoteSection}>
            <div style={styles.quoteIcon}>"</div>
            <p style={styles.pullQuote}>{candidate.ai_pull_quote}</p>
          </div>
        )}

        <div style={styles.grid}>
          {/* Left Column - Main Info */}
          <div style={styles.mainColumn}>
            {/* About */}
            {candidate.ai_narrative && (
              <div style={styles.card}>
                <h2 style={styles.cardTitle}>About {displayName}</h2>
                <p style={styles.narrative}>{candidate.ai_narrative}</p>
              </div>
            )}

            {/* Employment History */}
            {candidate.employment_history?.length > 0 && (
              <div style={styles.card}>
                <h2 style={styles.cardTitle}>Employment History</h2>
                <div style={styles.employmentTable}>
                  <div style={styles.employmentHeader}>
                    <span style={styles.employmentHeaderCell}>Company</span>
                    <span style={styles.employmentHeaderCell}>Role</span>
                    <span style={styles.employmentHeaderCell}>Tenure</span>
                    <span style={styles.employmentHeaderCell}>Verified</span>
                  </div>
                  {candidate.employment_history.map((job, i) => (
                    <div key={i} style={styles.employmentRow}>
                      <span style={styles.employmentCompany}>{job.company}</span>
                      <span style={styles.employmentRole}>{job.role || job.title}</span>
                      <span style={styles.employmentTenure}>{job.tenure || '-'}</span>
                      <span style={styles.employmentVerified}>
                        {job.regulated && (
                          <span style={styles.dotRegulatedBadge}>DOT-Regulated</span>
                        )}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Safety & Compliance */}
            <div style={styles.card}>
              <h2 style={styles.cardTitle}>Safety & Compliance</h2>

              {/* MVR Stats */}
              <div style={styles.statsGrid}>
                <div style={{...styles.statBox, ...(candidate.mvr_violations_3yr === 0 ? styles.statBoxGreen : styles.statBoxYellow)}}>
                  <div style={styles.statNumber}>{candidate.mvr_violations_3yr || 0}</div>
                  <div style={styles.statLabel}>MVR Violations (3yr)</div>
                </div>
                <div style={{...styles.statBox, ...(candidate.mvr_accidents_3yr === 0 ? styles.statBoxGreen : styles.statBoxYellow)}}>
                  <div style={styles.statNumber}>{candidate.mvr_accidents_3yr || 0}</div>
                  <div style={styles.statLabel}>At-Fault Accidents</div>
                </div>
                <div style={{...styles.statBox, ...(candidate.psp_crashes_5yr === 0 ? styles.statBoxGreen : styles.statBoxYellow)}}>
                  <div style={styles.statNumber}>{candidate.psp_crashes_5yr || 0}</div>
                  <div style={styles.statLabel}>PSP Crashes (5yr)</div>
                </div>
                <div style={styles.statBox}>
                  <div style={styles.statNumber}>{candidate.psp_inspections_3yr || 0}</div>
                  <div style={styles.statLabel}>Inspections (3yr)</div>
                </div>
              </div>

              {/* Compliance Status */}
              <div style={styles.complianceList}>
                <div style={{...styles.complianceItem, ...(candidate.mvr_status === 'Clear' ? styles.complianceGreen : styles.complianceYellow)}}>
                  <span style={styles.complianceLabel}>MVR Status</span>
                  <span style={styles.complianceBadge}>{candidate.mvr_status || 'Pending'}</span>
                </div>
                <div style={{...styles.complianceItem, ...(candidate.clearinghouse_status === 'Not Prohibited' ? styles.complianceGreen : styles.complianceYellow)}}>
                  <span style={styles.complianceLabel}>Clearinghouse</span>
                  <span style={styles.complianceBadge}>{candidate.clearinghouse_status || 'Pending'}</span>
                </div>
                <div style={{...styles.complianceItem, ...(candidate.medical_card_status === 'Valid' ? styles.complianceGreen : styles.complianceYellow)}}>
                  <span style={styles.complianceLabel}>Medical Card</span>
                  <span style={styles.complianceBadge}>{candidate.medical_card_status || 'Pending'}</span>
                </div>
              </div>

              {/* MVR Summary */}
              {candidate.mvr_summary && (
                <div style={styles.summaryBox}>
                  <p style={styles.summaryText}>{candidate.mvr_summary}</p>
                </div>
              )}
            </div>

            {/* Training */}
            {candidate.training_school && (
              <div style={styles.card}>
                <h2 style={styles.cardTitle}>CDL Training</h2>
                <div style={styles.trainingList}>
                  <div style={styles.trainingRow}>
                    <span style={styles.trainingLabel}>School</span>
                    <span style={styles.trainingValue}>{candidate.training_school}</span>
                  </div>
                  {candidate.training_location && (
                    <div style={styles.trainingRow}>
                      <span style={styles.trainingLabel}>Location</span>
                      <span style={styles.trainingValue}>{candidate.training_location}</span>
                    </div>
                  )}
                  {candidate.training_graduated && (
                    <div style={styles.trainingRow}>
                      <span style={styles.trainingLabel}>Graduated</span>
                      <span style={styles.trainingValue}>{candidate.training_graduated}</span>
                    </div>
                  )}
                  {candidate.training_hours > 0 && (
                    <div style={styles.trainingRow}>
                      <span style={styles.trainingLabel}>Instruction Hours</span>
                      <span style={styles.trainingValue}>{candidate.training_hours} hours</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* AI Recruiter Notes */}
            {candidate.ai_recruiter_notes && (
              <div style={styles.notesCard}>
                <div style={styles.notesIcon}>AI</div>
                <div>
                  <div style={styles.notesTitle}>Recruiter Notes</div>
                  <p style={styles.notesText}>{candidate.ai_recruiter_notes}</p>
                </div>
              </div>
            )}
          </div>

          {/* Right Column - Fit Scores */}
          <div style={styles.sidebar}>
            {/* Job Fit Cards */}
            {candidate.fit_profiles?.length > 0 && (
              <div style={styles.card}>
                <h2 style={styles.cardTitle}>Job Fit Analysis</h2>
                {candidate.fit_profiles.map((fp, i) => (
                  <div key={i} style={styles.fitCard}>
                    <div style={styles.fitCardHeader}>
                      <span style={styles.fitJobTitle}>{fp.job_title}</span>
                      <span style={{ ...styles.fitScoreBadge, ...getScoreStyle(fp.fit_score) }}>
                        {fp.fit_score}%
                      </span>
                    </div>

                    {/* Dimension Bars */}
                    {fp.fit_dimensions?.length > 0 && (
                      <div style={styles.dimensionsList}>
                        {fp.fit_dimensions.map((dim, j) => (
                          <div key={j} style={styles.dimensionRow}>
                            <div style={styles.dimensionLabel}>
                              <span>{dim.name}</span>
                              <span style={{ color: getScoreColor(dim.score) }}>{dim.score}</span>
                            </div>
                            <div style={styles.dimensionBar}>
                              <div
                                style={{
                                  ...styles.dimensionFill,
                                  width: `${dim.score}%`,
                                  background: getScoreColor(dim.score)
                                }}
                              />
                            </div>
                            {dim.note && <div style={styles.dimensionNote}>{dim.note}</div>}
                          </div>
                        ))}
                      </div>
                    )}

                    {/* AI Recommendation */}
                    {fp.fit_recommendation && (
                      <div style={styles.fitRecommendation}>
                        <div style={styles.recommendationIcon}>AI</div>
                        <p style={styles.recommendationText}>{fp.fit_recommendation}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Equipment Experience */}
            {candidate.equipment_experience?.length > 0 && (
              <div style={styles.card}>
                <h2 style={styles.cardTitle}>Equipment Experience</h2>
                <div style={styles.equipmentList}>
                  {candidate.equipment_experience.map((eq, i) => (
                    <div key={i} style={styles.equipmentRow}>
                      <span style={styles.equipmentType}>{eq.type}</span>
                      <span style={styles.equipmentLevel}>{eq.level || eq.years || '-'}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Request Interview CTA */}
            <div style={styles.ctaCard}>
              <h3 style={styles.ctaTitle}>Interested in this driver?</h3>
              <p style={styles.ctaText}>
                Our career agents will facilitate the connection and schedule an interview.
              </p>
              <button onClick={() => setShowRequestModal(true)} style={styles.ctaButton}>
                Request Interview
              </button>
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
            Request an interview with <strong>{formatDisplayName(candidate.fullName)}</strong>.
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

function getScoreColor(score) {
  if (score >= 85) return '#059669';
  if (score >= 70) return '#D97706';
  return '#DC2626';
}

const styles = {
  nav: {
    marginBottom: 16,
  },
  backLink: {
    background: 'none',
    border: 'none',
    color: '#004751',
    fontSize: 14,
    fontWeight: 500,
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

  // Video Hero
  videoHero: {
    marginBottom: 0,
  },
  videoWrapper: {
    position: 'relative',
    borderRadius: 16,
    overflow: 'hidden',
    background: '#004751',
    maxHeight: '70vh',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
  },
  video: {
    maxWidth: '100%',
    maxHeight: '70vh',
    objectFit: 'contain',
    display: 'block',
  },
  videoOverlayMinimal: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    background: 'transparent',
  },
  playButtonLarge: {
    width: 100,
    height: 100,
    borderRadius: '50%',
    background: 'rgba(205, 249, 92, 0.95)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
    transition: 'transform 0.2s, box-shadow 0.2s',
  },
  heroName: {
    fontSize: 'clamp(28px, 5vw, 42px)',
    fontWeight: 700,
    color: '#FFFFFF',
    fontFamily: 'Georgia, serif',
    marginBottom: 8,
  },
  heroMeta: {
    fontSize: 'clamp(14px, 2.5vw, 18px)',
    color: 'rgba(255,255,255,0.85)',
    marginBottom: 16,
  },

  // Text Hero (no video)
  textHero: {
    background: 'linear-gradient(135deg, #004751 0%, #006575 100%)',
    borderRadius: 16,
    padding: '48px 32px',
    textAlign: 'center',
    marginBottom: 0,
  },

  // Action Bar
  actionBar: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    background: '#FFFFFF',
    borderRadius: '0 0 16px 16px',
    padding: '16px 24px',
    marginBottom: 24,
    flexWrap: 'wrap',
    gap: 16,
    boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
  },
  actionBarLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: 20,
    flexWrap: 'wrap',
  },
  fitScoreDisplay: {
    display: 'flex',
    alignItems: 'baseline',
    gap: 8,
  },
  fitScoreNumber: {
    fontSize: 32,
    fontWeight: 800,
    color: '#059669',
  },
  fitScoreLabel: {
    fontSize: 13,
    color: '#5A7A82',
    fontWeight: 500,
  },
  badges: {
    display: 'flex',
    gap: 8,
    flexWrap: 'wrap',
  },
  badge: {
    padding: '6px 12px',
    fontSize: 12,
    fontWeight: 600,
    background: '#F0F9FF',
    color: '#004751',
    borderRadius: 20,
  },
  requestButton: {
    padding: '14px 28px',
    fontSize: 15,
    fontWeight: 600,
    background: '#004751',
    color: '#FFFFFF',
    border: 'none',
    borderRadius: 8,
    cursor: 'pointer',
    transition: 'background 0.2s',
  },

  // Content
  content: {
    maxWidth: 1200,
    margin: '0 auto',
  },

  // Pull Quote
  pullQuoteSection: {
    position: 'relative',
    background: 'linear-gradient(135deg, #F0F9FF 0%, #E8F5E9 100%)',
    borderRadius: 16,
    padding: '32px 40px',
    marginBottom: 24,
    borderLeft: '4px solid #004751',
  },
  quoteIcon: {
    position: 'absolute',
    top: 12,
    left: 20,
    fontSize: 64,
    fontFamily: 'Georgia, serif',
    color: '#004751',
    opacity: 0.15,
    lineHeight: 1,
  },
  pullQuote: {
    margin: 0,
    fontSize: 'clamp(18px, 3vw, 22px)',
    fontStyle: 'italic',
    color: '#004751',
    lineHeight: 1.6,
    position: 'relative',
    zIndex: 1,
  },

  // Grid
  grid: {
    display: 'grid',
    gridTemplateColumns: '1fr 400px',
    gap: 24,
  },
  mainColumn: {},
  sidebar: {},

  // Cards
  card: {
    background: '#FFFFFF',
    borderRadius: 12,
    padding: 24,
    marginBottom: 20,
    border: '1px solid #E8ECEE',
  },
  cardTitle: {
    margin: '0 0 16px',
    fontSize: 18,
    fontWeight: 600,
    color: '#004751',
  },
  narrative: {
    margin: 0,
    fontSize: 15,
    color: '#1A2A30',
    lineHeight: 1.7,
  },

  // Equipment Experience
  equipmentList: {
    display: 'flex',
    flexDirection: 'column',
  },
  equipmentRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '12px 0',
    borderBottom: '1px solid #F0F2F4',
  },
  equipmentType: {
    fontSize: 14,
    fontWeight: 600,
    color: '#1A2A30',
  },
  equipmentLevel: {
    fontSize: 14,
    color: '#5A7A82',
    fontStyle: 'italic',
  },

  // Employment History Table
  employmentTable: {
    display: 'flex',
    flexDirection: 'column',
  },
  employmentHeader: {
    display: 'grid',
    gridTemplateColumns: '2fr 1.5fr 1fr 1fr',
    gap: 16,
    paddingBottom: 12,
    borderBottom: '1px solid #E8ECEE',
    marginBottom: 8,
  },
  employmentHeaderCell: {
    fontSize: 11,
    fontWeight: 700,
    color: '#5A7A82',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  employmentRow: {
    display: 'grid',
    gridTemplateColumns: '2fr 1.5fr 1fr 1fr',
    gap: 16,
    padding: '14px 0',
    borderBottom: '1px solid #F0F2F4',
    alignItems: 'center',
  },
  employmentCompany: {
    fontSize: 14,
    fontWeight: 600,
    color: '#1A2A30',
  },
  employmentRole: {
    fontSize: 14,
    color: '#5A7A82',
  },
  employmentTenure: {
    fontSize: 14,
    color: '#1A2A30',
  },
  employmentVerified: {
    display: 'flex',
    alignItems: 'center',
  },
  dotRegulatedBadge: {
    fontSize: 11,
    fontWeight: 600,
    color: '#059669',
    background: '#D1FAE5',
    padding: '4px 10px',
    borderRadius: 12,
    border: '1px solid #A7F3D0',
  },

  // Fit Cards
  fitCard: {
    background: '#F8FAFB',
    borderRadius: 10,
    padding: 16,
    marginBottom: 16,
  },
  fitCardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  fitJobTitle: {
    fontSize: 14,
    fontWeight: 600,
    color: '#1A2A30',
  },
  fitScoreBadge: {
    padding: '6px 12px',
    fontSize: 14,
    fontWeight: 700,
    borderRadius: 16,
  },
  dimensionsList: {
    marginBottom: 16,
  },
  dimensionRow: {
    marginBottom: 12,
  },
  dimensionLabel: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: 12,
    fontWeight: 500,
    color: '#5A7A82',
    marginBottom: 4,
  },
  dimensionBar: {
    height: 6,
    background: '#E8ECEE',
    borderRadius: 3,
    overflow: 'hidden',
  },
  dimensionFill: {
    height: '100%',
    borderRadius: 3,
    transition: 'width 0.5s ease',
  },
  dimensionNote: {
    fontSize: 11,
    color: '#9CA3AF',
    marginTop: 3,
    fontStyle: 'italic',
  },
  fitRecommendation: {
    display: 'flex',
    gap: 10,
    padding: 12,
    background: '#FFFFFF',
    borderRadius: 8,
    border: '1px solid #E8ECEE',
  },
  recommendationIcon: {
    width: 28,
    height: 28,
    background: 'linear-gradient(135deg, #004751, #006575)',
    borderRadius: 6,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 10,
    fontWeight: 700,
    color: '#CDF95C',
    flexShrink: 0,
  },
  recommendationText: {
    margin: 0,
    fontSize: 13,
    color: '#5A7A82',
    lineHeight: 1.5,
  },

  // Safety & Compliance
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
    gap: 12,
    marginBottom: 16,
  },
  statBox: {
    background: '#F8FAFB',
    borderRadius: 10,
    padding: 16,
    textAlign: 'center',
  },
  statBoxGreen: {
    background: '#F0FAF0',
    border: '1px solid #C8E6C9',
  },
  statBoxYellow: {
    background: '#FFF8E1',
    border: '1px solid #FFECB3',
  },
  statNumber: {
    fontSize: 28,
    fontWeight: 800,
    color: '#004751',
    fontFamily: 'Georgia, serif',
  },
  statLabel: {
    fontSize: 11,
    color: '#5A7A82',
    marginTop: 4,
    fontWeight: 600,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  complianceList: {
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
    marginBottom: 16,
  },
  complianceItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '12px 16px',
    borderRadius: 8,
    background: '#F8FAFB',
  },
  complianceGreen: {
    background: '#F0FAF0',
    border: '1px solid #C8E6C9',
  },
  complianceYellow: {
    background: '#FFF8E1',
    border: '1px solid #FFECB3',
  },
  complianceLabel: {
    fontSize: 14,
    fontWeight: 600,
    color: '#1A2A30',
  },
  complianceBadge: {
    fontSize: 12,
    fontWeight: 600,
    padding: '4px 10px',
    borderRadius: 12,
    background: 'rgba(255,255,255,0.8)',
  },
  summaryBox: {
    background: '#F8FAFB',
    borderRadius: 8,
    padding: 16,
    borderLeft: '3px solid #004751',
  },
  summaryText: {
    margin: 0,
    fontSize: 14,
    color: '#3A5A64',
    lineHeight: 1.6,
  },
  // Training
  trainingList: {
    display: 'flex',
    flexDirection: 'column',
  },
  trainingRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '12px 0',
    borderBottom: '1px solid #F0F2F4',
    gap: 24,
  },
  trainingLabel: {
    fontSize: 13,
    color: '#5A7A82',
    flexShrink: 0,
  },
  trainingValue: {
    fontSize: 14,
    fontWeight: 600,
    color: '#1A2A30',
    textAlign: 'right',
  },
  // AI Notes Card
  notesCard: {
    display: 'flex',
    gap: 16,
    background: '#F8FAFB',
    borderRadius: 12,
    padding: 20,
    borderLeft: '4px solid #004751',
    marginBottom: 20,
  },
  notesIcon: {
    width: 36,
    height: 36,
    background: 'linear-gradient(135deg, #004751, #006575)',
    borderRadius: 8,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 12,
    fontWeight: 700,
    color: '#CDF95C',
    flexShrink: 0,
  },
  notesTitle: {
    fontSize: 12,
    fontWeight: 700,
    color: '#004751',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 6,
  },
  notesText: {
    margin: 0,
    fontSize: 14,
    color: '#3A5A64',
    lineHeight: 1.7,
  },
  // CTA Card
  ctaCard: {
    background: 'linear-gradient(135deg, #004751 0%, #006575 100%)',
    borderRadius: 12,
    padding: 24,
    textAlign: 'center',
  },
  ctaTitle: {
    margin: '0 0 8px',
    fontSize: 18,
    fontWeight: 600,
    color: '#FFFFFF',
  },
  ctaText: {
    margin: '0 0 16px',
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    lineHeight: 1.5,
  },
  ctaButton: {
    width: '100%',
    padding: '14px 24px',
    fontSize: 15,
    fontWeight: 600,
    background: '#CDF95C',
    color: '#004751',
    border: 'none',
    borderRadius: 8,
    cursor: 'pointer',
  },

  // Responsive
  '@media (max-width: 900px)': {
    grid: {
      gridTemplateColumns: '1fr',
    },
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
