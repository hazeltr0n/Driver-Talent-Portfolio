import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import EmployerLayout, { useEmployerAuth } from './EmployerLayout';
import { listEmployerJobs, listQualifiedCandidates, listEmployerSubmissions } from '../lib/employer-api';

export default function EmployerDashboard() {
  const { employer } = useEmployerAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    activeJobs: 0,
    qualifiedCandidates: 0,
    pendingSubmissions: 0,
    interviewingCount: 0,
    hiredCount: 0,
  });
  const [recentCandidates, setRecentCandidates] = useState([]);
  const [pendingActions, setPendingActions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);

      const [jobs, candidates, submissions] = await Promise.all([
        listEmployerJobs('Active'),
        listQualifiedCandidates({ minScore: 70 }),
        listEmployerSubmissions(),
      ]);

      setStats({
        activeJobs: jobs?.length || 0,
        qualifiedCandidates: candidates?.length || 0,
        pendingSubmissions: submissions?.filter(s => s.status === 'Submitted').length || 0,
        interviewingCount: submissions?.filter(s => s.status === 'Interviewing').length || 0,
        hiredCount: submissions?.filter(s => s.status === 'Hired').length || 0,
      });

      // Get top 5 recent qualified candidates
      setRecentCandidates((candidates || []).slice(0, 5));

      // Build pending actions list
      const actions = [];

      // Submissions needing review
      const pendingReview = (submissions || []).filter(s => s.status === 'Submitted');
      if (pendingReview.length > 0) {
        actions.push({
          type: 'review',
          count: pendingReview.length,
          message: `${pendingReview.length} submission${pendingReview.length > 1 ? 's' : ''} to review`,
          action: () => navigate('/employer/submissions'),
        });
      }

      // Interviewing that may need updates
      const interviewing = (submissions || []).filter(s => s.status === 'Interviewing');
      if (interviewing.length > 0) {
        actions.push({
          type: 'update',
          count: interviewing.length,
          message: `${interviewing.length} candidate${interviewing.length > 1 ? 's' : ''} in interview stage`,
          action: () => navigate('/employer/submissions?status=Interviewing'),
        });
      }

      // New qualified candidates
      const newCandidates = (candidates || []).filter(c => {
        const generated = new Date(c.generated_at);
        const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
        return generated > dayAgo;
      });
      if (newCandidates.length > 0) {
        actions.push({
          type: 'new',
          count: newCandidates.length,
          message: `${newCandidates.length} new qualified driver${newCandidates.length > 1 ? 's' : ''} in last 24h`,
          action: () => navigate('/employer/drivers'),
        });
      }

      setPendingActions(actions);
    } catch (err) {
      console.error('Dashboard load error:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <EmployerLayout>
        <div style={styles.loading}>Loading dashboard...</div>
      </EmployerLayout>
    );
  }

  return (
    <EmployerLayout>
      <div style={styles.welcomeSection}>
        <h1 style={styles.welcomeTitle}>Welcome, {employer?.contact_name?.split(' ')[0] || 'Partner'}</h1>
        <p style={styles.welcomeSubtitle}>{employer?.name}</p>
      </div>

      {/* Stats Grid */}
      <div style={styles.statsGrid}>
        <StatCard
          label="Active Jobs"
          value={stats.activeJobs}
          color="#004751"
          onClick={() => navigate('/employer/jobs')}
        />
        <StatCard
          label="Qualified Drivers"
          value={stats.qualifiedCandidates}
          color="#059669"
          onClick={() => navigate('/employer/drivers')}
        />
        <StatCard
          label="Pending Review"
          value={stats.pendingSubmissions}
          color="#D97706"
          onClick={() => navigate('/employer/submissions')}
        />
        <StatCard
          label="Interviewing"
          value={stats.interviewingCount}
          color="#7C3AED"
          onClick={() => navigate('/employer/submissions')}
        />
        <StatCard
          label="Hired"
          value={stats.hiredCount}
          color="#059669"
          onClick={() => navigate('/employer/submissions')}
        />
      </div>

      <div style={styles.contentGrid}>
        {/* Pending Actions */}
        <div style={styles.section}>
          <h2 style={styles.sectionTitle}>Pending Actions</h2>
          {pendingActions.length === 0 ? (
            <div style={styles.emptyActions}>
              <div style={styles.checkIcon}>✓</div>
              <p>All caught up! No pending actions.</p>
            </div>
          ) : (
            <div style={styles.actionsList}>
              {pendingActions.map((action, i) => (
                <div key={i} style={styles.actionItem} onClick={action.action}>
                  <div style={styles.actionBadge}>{action.count}</div>
                  <div style={styles.actionMessage}>{action.message}</div>
                  <div style={styles.actionArrow}>→</div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Qualified Candidates */}
        <div style={styles.section}>
          <div style={styles.sectionHeader}>
            <h2 style={styles.sectionTitle}>Top Qualified Drivers</h2>
            <button onClick={() => navigate('/employer/drivers')} style={styles.viewAllButton}>
              View All
            </button>
          </div>

          {recentCandidates.length === 0 ? (
            <div style={styles.emptyCandidates}>
              <p>No qualified candidates yet.</p>
              <button onClick={() => navigate('/employer/jobs/new')} style={styles.addJobButton}>
                Add a Job to Get Started
              </button>
            </div>
          ) : (
            <div style={styles.candidatesList}>
              {recentCandidates.map((candidate, i) => (
                <div
                  key={i}
                  style={styles.candidateItem}
                  onClick={() => navigate(`/employer/drivers/${candidate.uuid}`)}
                >
                  <div style={styles.candidateInfo}>
                    <div style={styles.candidateName}>{candidate.name}</div>
                    <div style={styles.candidateMeta}>
                      {candidate.city}, {candidate.state} · {candidate.years_experience} yrs
                    </div>
                    <div style={styles.candidateJob}>{candidate.job_title}</div>
                  </div>
                  <div style={{ ...styles.scoreBadge, ...getScoreStyle(candidate.fit_score) }}>
                    {candidate.fit_score}%
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div style={styles.quickActions}>
        <h3 style={styles.quickActionsTitle}>Quick Actions</h3>
        <div style={styles.quickActionsGrid}>
          <button onClick={() => navigate('/employer/jobs/new')} style={styles.quickActionButton}>
            + Add New Job
          </button>
          <button onClick={() => navigate('/employer/drivers')} style={styles.quickActionButton}>
            Browse Drivers
          </button>
          <button onClick={() => navigate('/employer/submissions')} style={styles.quickActionButton}>
            View Submissions
          </button>
        </div>
      </div>
    </EmployerLayout>
  );
}

function StatCard({ label, value, color, onClick }) {
  return (
    <div style={{ ...styles.statCard, borderTopColor: color }} onClick={onClick}>
      <div style={{ ...styles.statValue, color }}>{value}</div>
      <div style={styles.statLabel}>{label}</div>
    </div>
  );
}

function getScoreStyle(score) {
  if (score >= 85) return { background: '#D1FAE5', color: '#059669' };
  if (score >= 70) return { background: '#FEF3C7', color: '#D97706' };
  return { background: '#FEE2E2', color: '#DC2626' };
}

const styles = {
  loading: {
    padding: 48,
    textAlign: 'center',
    color: '#5A7A82',
  },
  welcomeSection: {
    marginBottom: 24,
  },
  welcomeTitle: {
    margin: 0,
    fontSize: 28,
    fontWeight: 700,
    color: '#004751',
    fontFamily: 'Georgia, serif',
  },
  welcomeSubtitle: {
    margin: '4px 0 0',
    fontSize: 14,
    color: '#5A7A82',
  },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
    gap: 16,
    marginBottom: 24,
  },
  statCard: {
    background: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    borderTop: '4px solid',
    cursor: 'pointer',
    transition: 'transform 0.2s',
  },
  statValue: {
    fontSize: 32,
    fontWeight: 700,
  },
  statLabel: {
    fontSize: 13,
    color: '#5A7A82',
    marginTop: 4,
  },
  contentGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))',
    gap: 24,
    marginBottom: 24,
  },
  section: {
    background: '#FFFFFF',
    borderRadius: 12,
    border: '1px solid #E8ECEE',
    padding: 24,
  },
  sectionHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    margin: 0,
    fontSize: 16,
    fontWeight: 600,
    color: '#004751',
  },
  viewAllButton: {
    background: 'none',
    border: 'none',
    color: '#004751',
    fontSize: 13,
    cursor: 'pointer',
    textDecoration: 'underline',
  },
  emptyActions: {
    textAlign: 'center',
    padding: 24,
    color: '#5A7A82',
  },
  checkIcon: {
    width: 48,
    height: 48,
    background: '#D1FAE5',
    color: '#059669',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 24,
    margin: '0 auto 12px',
  },
  actionsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
  },
  actionItem: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    background: '#F8FAFB',
    borderRadius: 8,
    cursor: 'pointer',
    transition: 'background 0.2s',
  },
  actionBadge: {
    width: 32,
    height: 32,
    background: '#004751',
    color: '#FFFFFF',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 14,
    fontWeight: 600,
  },
  actionMessage: {
    flex: 1,
    fontSize: 14,
    color: '#1A2A30',
  },
  actionArrow: {
    color: '#9CA3AF',
    fontSize: 16,
  },
  emptyCandidates: {
    textAlign: 'center',
    padding: 24,
    color: '#5A7A82',
  },
  addJobButton: {
    padding: '10px 20px',
    fontSize: 14,
    fontWeight: 600,
    background: '#004751',
    color: '#FFFFFF',
    border: 'none',
    borderRadius: 6,
    cursor: 'pointer',
    marginTop: 12,
  },
  candidatesList: {
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
  },
  candidateItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    background: '#F8FAFB',
    borderRadius: 8,
    cursor: 'pointer',
  },
  candidateInfo: {},
  candidateName: {
    fontSize: 14,
    fontWeight: 600,
    color: '#004751',
  },
  candidateMeta: {
    fontSize: 12,
    color: '#5A7A82',
    marginTop: 2,
  },
  candidateJob: {
    fontSize: 11,
    color: '#9CA3AF',
    marginTop: 2,
  },
  scoreBadge: {
    padding: '4px 10px',
    fontSize: 13,
    fontWeight: 700,
    borderRadius: 16,
  },
  quickActions: {
    background: '#FFFFFF',
    borderRadius: 12,
    border: '1px solid #E8ECEE',
    padding: 24,
  },
  quickActionsTitle: {
    margin: '0 0 16px',
    fontSize: 14,
    fontWeight: 600,
    color: '#5A7A82',
  },
  quickActionsGrid: {
    display: 'flex',
    gap: 12,
    flexWrap: 'wrap',
  },
  quickActionButton: {
    padding: '12px 20px',
    fontSize: 14,
    fontWeight: 600,
    background: '#004751',
    color: '#FFFFFF',
    border: 'none',
    borderRadius: 6,
    cursor: 'pointer',
  },
};
