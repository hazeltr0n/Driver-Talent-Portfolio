import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import EmployerLayout from './EmployerLayout';
import { listQualifiedCandidates, listEmployerJobs, requestInterview } from '../lib/employer-api';

export default function DriverFeed() {
  const [candidates, setCandidates] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filterJob, setFilterJob] = useState('');
  const [sortBy, setSortBy] = useState('score');
  const navigate = useNavigate();

  useEffect(() => {
    loadJobs();
  }, []);

  useEffect(() => {
    loadCandidates();
  }, [filterJob, sortBy]);

  const loadJobs = async () => {
    try {
      const data = await listEmployerJobs('Active');
      setJobs(data || []);
    } catch (err) {
      console.error('Failed to load jobs:', err);
    }
  };

  const loadCandidates = async () => {
    try {
      setLoading(true);
      const data = await listQualifiedCandidates({
        minScore: 70,
        jobId: filterJob || undefined,
        sortBy,
      });
      setCandidates(data || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <EmployerLayout>
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>Driver Feed</h1>
          <p style={styles.subtitle}>Qualified candidates matching your job requirements (70+ fit score)</p>
        </div>
      </div>

      <div style={styles.filters}>
        <select
          value={filterJob}
          onChange={e => setFilterJob(e.target.value)}
          style={styles.filterSelect}
        >
          <option value="">All Jobs</option>
          {jobs.map(job => (
            <option key={job.id} value={job.id}>{job.title}</option>
          ))}
        </select>
        <select
          value={sortBy}
          onChange={e => setSortBy(e.target.value)}
          style={styles.filterSelect}
        >
          <option value="score">Highest Fit Score</option>
          <option value="experience">Most Experience</option>
          <option value="recent">Most Recent</option>
        </select>
        <div style={styles.stats}>
          <span style={styles.statChip}>{candidates.length} candidates</span>
        </div>
      </div>

      {error && <div style={styles.error}>{error}</div>}

      {loading ? (
        <div style={styles.loading}>Loading candidates...</div>
      ) : candidates.length === 0 ? (
        <div style={styles.empty}>
          <div style={styles.emptyIcon}>🔍</div>
          <h3 style={styles.emptyTitle}>No qualified candidates yet</h3>
          <p style={styles.emptyText}>
            {jobs.length === 0
              ? 'Add a job requisition to start seeing matched drivers.'
              : 'Check back soon - we\'re continuously matching new drivers to your jobs.'}
          </p>
        </div>
      ) : (
        <div style={styles.grid}>
          {candidates.map(candidate => (
            <CandidateCard
              key={`${candidate.uuid}-${candidate.job_id}`}
              candidate={candidate}
              onClick={() => navigate(`/employer/drivers/${candidate.uuid}`)}
            />
          ))}
        </div>
      )}
    </EmployerLayout>
  );
}

function CandidateCard({ candidate, onClick }) {
  const getScoreColor = (score) => {
    if (score >= 85) return { background: '#D1FAE5', color: '#059669' };
    if (score >= 70) return { background: '#FEF3C7', color: '#D97706' };
    return { background: '#FEE2E2', color: '#DC2626' };
  };

  return (
    <div style={styles.card} onClick={onClick}>
      <div style={styles.cardHeader}>
        <div>
          <h3 style={styles.candidateName}>{candidate.name}</h3>
          <div style={styles.candidateMeta}>
            {candidate.city}, {candidate.state} · CDL-{candidate.cdl_class} · {candidate.years_experience} yrs
          </div>
        </div>
        <div style={{ ...styles.scoreBadge, ...getScoreColor(candidate.fit_score) }}>
          {candidate.fit_score}%
        </div>
      </div>

      <div style={styles.jobTag}>
        {candidate.job_title}
      </div>

      {candidate.fit_recommendation && (
        <p style={styles.recommendation}>
          {candidate.fit_recommendation.length > 150
            ? `${candidate.fit_recommendation.slice(0, 150)}...`
            : candidate.fit_recommendation}
        </p>
      )}

      <div style={styles.dimensions}>
        {(candidate.fit_dimensions || []).slice(0, 4).map((dim, i) => (
          <div key={i} style={styles.dimension}>
            <span style={styles.dimName}>{dim.name}</span>
            <span style={{ ...styles.dimScore, color: getScoreColor(dim.score).color }}>{dim.score}</span>
          </div>
        ))}
      </div>

      <div style={styles.cardFooter}>
        <button style={styles.viewButton}>View Profile</button>
      </div>
    </div>
  );
}

const styles = {
  header: {
    marginBottom: 24,
  },
  title: {
    margin: 0,
    fontSize: 28,
    fontWeight: 700,
    color: '#004751',
    fontFamily: 'Georgia, serif',
  },
  subtitle: {
    margin: '8px 0 0',
    fontSize: 14,
    color: '#5A7A82',
  },
  filters: {
    display: 'flex',
    gap: 12,
    marginBottom: 24,
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  filterSelect: {
    padding: '8px 12px',
    fontSize: 14,
    border: '1px solid #D1D9DD',
    borderRadius: 6,
    background: '#FFFFFF',
  },
  stats: {
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
  empty: {
    background: '#FFFFFF',
    borderRadius: 12,
    padding: 48,
    textAlign: 'center',
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyTitle: {
    margin: '0 0 8px',
    fontSize: 20,
    fontWeight: 600,
    color: '#1A2A30',
  },
  emptyText: {
    margin: 0,
    fontSize: 14,
    color: '#5A7A82',
    maxWidth: 400,
    marginLeft: 'auto',
    marginRight: 'auto',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))',
    gap: 16,
  },
  card: {
    background: '#FFFFFF',
    borderRadius: 12,
    border: '1px solid #E8ECEE',
    padding: 20,
    cursor: 'pointer',
    transition: 'box-shadow 0.2s, transform 0.2s',
  },
  cardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  candidateName: {
    margin: 0,
    fontSize: 16,
    fontWeight: 600,
    color: '#004751',
  },
  candidateMeta: {
    fontSize: 12,
    color: '#5A7A82',
    marginTop: 4,
  },
  scoreBadge: {
    padding: '6px 12px',
    fontSize: 14,
    fontWeight: 700,
    borderRadius: 20,
  },
  jobTag: {
    display: 'inline-block',
    padding: '4px 10px',
    fontSize: 11,
    fontWeight: 500,
    background: '#E8ECEE',
    color: '#004751',
    borderRadius: 4,
    marginBottom: 12,
  },
  recommendation: {
    margin: '0 0 16px',
    fontSize: 13,
    color: '#5A7A82',
    lineHeight: 1.5,
  },
  dimensions: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: 8,
    marginBottom: 16,
  },
  dimension: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '6px 10px',
    background: '#F8FAFB',
    borderRadius: 4,
    fontSize: 12,
  },
  dimName: {
    color: '#5A7A82',
  },
  dimScore: {
    fontWeight: 600,
  },
  cardFooter: {
    borderTop: '1px solid #E8ECEE',
    paddingTop: 12,
  },
  viewButton: {
    width: '100%',
    padding: '10px 16px',
    fontSize: 13,
    fontWeight: 600,
    background: '#004751',
    color: '#FFFFFF',
    border: 'none',
    borderRadius: 6,
    cursor: 'pointer',
  },
};
