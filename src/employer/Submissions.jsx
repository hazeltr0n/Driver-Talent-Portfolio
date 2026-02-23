import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import EmployerLayout from './EmployerLayout';
import { listEmployerSubmissions, updateEmployerSubmission } from '../lib/employer-api';

export default function EmployerSubmissions() {
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filterStatus, setFilterStatus] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    loadSubmissions();
  }, [filterStatus]);

  const loadSubmissions = async () => {
    try {
      setLoading(true);
      const data = await listEmployerSubmissions(filterStatus || null);
      setSubmissions(data || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (submissionId, newStatus) => {
    try {
      await updateEmployerSubmission(submissionId, { status: newStatus });
      loadSubmissions();
    } catch (err) {
      alert('Failed to update status: ' + err.message);
    }
  };

  const getStatusCounts = () => {
    return {
      submitted: submissions.filter(s => s.status === 'Submitted').length,
      interviewing: submissions.filter(s => s.status === 'Interviewing').length,
      offerExtended: submissions.filter(s => s.status === 'Offer Extended').length,
      hired: submissions.filter(s => s.status === 'Hired').length,
      rejected: submissions.filter(s => s.status === 'Rejected').length,
    };
  };

  const counts = getStatusCounts();

  return (
    <EmployerLayout>
      <div style={styles.header}>
        <h1 style={styles.title}>Submissions</h1>
      </div>

      {/* Stats Row */}
      <div style={styles.statsRow}>
        <div style={{ ...styles.statCard, background: '#DBEAFE' }}>
          <span style={styles.statValue}>{counts.submitted}</span>
          <span style={styles.statLabel}>Submitted</span>
        </div>
        <div style={{ ...styles.statCard, background: '#FEF3C7' }}>
          <span style={styles.statValue}>{counts.interviewing}</span>
          <span style={styles.statLabel}>Interviewing</span>
        </div>
        <div style={{ ...styles.statCard, background: '#E9D5FF' }}>
          <span style={styles.statValue}>{counts.offerExtended}</span>
          <span style={styles.statLabel}>Offer Extended</span>
        </div>
        <div style={{ ...styles.statCard, background: '#D1FAE5' }}>
          <span style={styles.statValue}>{counts.hired}</span>
          <span style={styles.statLabel}>Hired</span>
        </div>
      </div>

      <div style={styles.filters}>
        <select
          value={filterStatus}
          onChange={e => setFilterStatus(e.target.value)}
          style={styles.filterSelect}
        >
          <option value="">All Statuses</option>
          <option value="Submitted">Submitted</option>
          <option value="Interviewing">Interviewing</option>
          <option value="Offer Extended">Offer Extended</option>
          <option value="Hired">Hired</option>
          <option value="Rejected">Rejected</option>
          <option value="Withdrawn">Withdrawn</option>
        </select>
        <div style={styles.resultCount}>{submissions.length} submissions</div>
      </div>

      {error && <div style={styles.error}>{error}</div>}

      {loading ? (
        <div style={styles.loading}>Loading submissions...</div>
      ) : submissions.length === 0 ? (
        <div style={styles.empty}>
          <div style={styles.emptyIcon}>📋</div>
          <h3 style={styles.emptyTitle}>No submissions yet</h3>
          <p style={styles.emptyText}>
            When you request interviews with candidates, they'll appear here.
          </p>
          <button onClick={() => navigate('/employer/drivers')} style={styles.emptyButton}>
            Browse Driver Feed
          </button>
        </div>
      ) : (
        <div style={styles.table}>
          <div style={styles.tableHeader}>
            <div style={{ ...styles.tableCell, flex: 2 }}>Candidate</div>
            <div style={styles.tableCell}>Position</div>
            <div style={styles.tableCell}>Fit Score</div>
            <div style={styles.tableCell}>Date</div>
            <div style={styles.tableCell}>Status</div>
            <div style={styles.tableCell}>Actions</div>
          </div>

          {submissions.map(sub => (
            <SubmissionRow
              key={sub.id}
              submission={sub}
              onStatusChange={handleStatusChange}
              onView={() => navigate(`/employer/submissions/${sub.id}`)}
            />
          ))}
        </div>
      )}
    </EmployerLayout>
  );
}

function SubmissionRow({ submission, onStatusChange, onView }) {
  const getStatusStyle = (status) => {
    switch (status) {
      case 'Submitted': return { background: '#DBEAFE', color: '#1D4ED8' };
      case 'Interviewing': return { background: '#FEF3C7', color: '#D97706' };
      case 'Offer Extended': return { background: '#E9D5FF', color: '#7C3AED' };
      case 'Hired': return { background: '#D1FAE5', color: '#059669' };
      case 'Rejected': return { background: '#FEE2E2', color: '#DC2626' };
      case 'Withdrawn': return { background: '#F3F4F6', color: '#6B7280' };
      default: return { background: '#F3F4F6', color: '#6B7280' };
    }
  };

  const getScoreColor = (score) => {
    if (score >= 85) return '#059669';
    if (score >= 70) return '#D97706';
    return '#DC2626';
  };

  return (
    <div style={styles.tableRow}>
      <div style={{ ...styles.tableCell, flex: 2 }}>
        <div style={styles.candidateName}>{submission.candidate_name}</div>
        {submission.requested_by === 'Employer' && (
          <div style={styles.requestedBy}>Requested by you</div>
        )}
      </div>
      <div style={styles.tableCell}>{submission.job_title}</div>
      <div style={styles.tableCell}>
        <span style={{ ...styles.scoreBadge, color: getScoreColor(submission.fit_score) }}>
          {submission.fit_score}%
        </span>
      </div>
      <div style={styles.tableCell}>{submission.submitted_date}</div>
      <div style={styles.tableCell}>
        <select
          value={submission.status}
          onChange={e => onStatusChange(submission.id, e.target.value)}
          style={{ ...styles.statusSelect, ...getStatusStyle(submission.status) }}
        >
          <option value="Submitted">Submitted</option>
          <option value="Interviewing">Interviewing</option>
          <option value="Offer Extended">Offer Extended</option>
          <option value="Hired">Hired</option>
          <option value="Rejected">Rejected</option>
          <option value="Withdrawn">Withdrawn</option>
        </select>
      </div>
      <div style={styles.tableCell}>
        <button onClick={onView} style={styles.viewButton}>View</button>
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
  statsRow: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
    gap: 16,
    marginBottom: 24,
  },
  statCard: {
    padding: 16,
    borderRadius: 12,
    textAlign: 'center',
  },
  statValue: {
    display: 'block',
    fontSize: 28,
    fontWeight: 700,
    color: '#1A2A30',
  },
  statLabel: {
    display: 'block',
    fontSize: 12,
    color: '#5A7A82',
    marginTop: 4,
  },
  filters: {
    display: 'flex',
    gap: 12,
    marginBottom: 20,
    alignItems: 'center',
  },
  filterSelect: {
    padding: '8px 12px',
    fontSize: 14,
    border: '1px solid #D1D9DD',
    borderRadius: 6,
    background: '#FFFFFF',
  },
  resultCount: {
    marginLeft: 'auto',
    fontSize: 14,
    color: '#5A7A82',
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
    margin: '0 0 24px',
    fontSize: 14,
    color: '#5A7A82',
  },
  emptyButton: {
    padding: '12px 24px',
    fontSize: 14,
    fontWeight: 600,
    background: '#004751',
    color: '#FFFFFF',
    border: 'none',
    borderRadius: 6,
    cursor: 'pointer',
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
  candidateName: {
    fontWeight: 600,
    color: '#004751',
  },
  requestedBy: {
    fontSize: 11,
    color: '#059669',
    marginTop: 2,
  },
  scoreBadge: {
    fontWeight: 600,
  },
  statusSelect: {
    padding: '6px 10px',
    fontSize: 12,
    fontWeight: 500,
    border: 'none',
    borderRadius: 4,
    cursor: 'pointer',
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
};
