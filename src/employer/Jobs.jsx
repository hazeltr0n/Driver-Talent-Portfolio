import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import EmployerLayout from './EmployerLayout';
import { listEmployerJobs } from '../lib/employer-api';

export default function EmployerJobs() {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filterStatus, setFilterStatus] = useState('Active');
  const navigate = useNavigate();

  useEffect(() => {
    loadJobs();
  }, [filterStatus]);

  const loadJobs = async () => {
    try {
      setLoading(true);
      const data = await listEmployerJobs(filterStatus);
      setJobs(data || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <EmployerLayout>
      <div style={styles.header}>
        <h1 style={styles.title}>Job Requisitions</h1>
        <button onClick={() => navigate('/employer/jobs/new')} style={styles.addButton}>
          + Add Job
        </button>
      </div>

      <div style={styles.filters}>
        <select
          value={filterStatus}
          onChange={e => setFilterStatus(e.target.value)}
          style={styles.filterSelect}
        >
          <option value="Active">Active</option>
          <option value="Filled">Filled</option>
          <option value="On Hold">On Hold</option>
          <option value="Closed">Closed</option>
        </select>
        <div style={styles.stats}>
          <span style={styles.statChip}>{jobs.length} jobs</span>
        </div>
      </div>

      {error && <div style={styles.error}>{error}</div>}

      {loading ? (
        <div style={styles.loading}>Loading jobs...</div>
      ) : jobs.length === 0 ? (
        <div style={styles.empty}>
          <div style={styles.emptyIcon}>📋</div>
          <h3 style={styles.emptyTitle}>No jobs yet</h3>
          <p style={styles.emptyText}>Create your first job requisition to start finding qualified drivers.</p>
          <button onClick={() => navigate('/employer/jobs/new')} style={styles.emptyButton}>
            Add Your First Job
          </button>
        </div>
      ) : (
        <div style={styles.table}>
          <div style={styles.tableHeader}>
            <div style={styles.tableHeaderCell}>Title</div>
            <div style={styles.tableHeaderCell}>Location</div>
            <div style={styles.tableHeaderCell}>Pay</div>
            <div style={styles.tableHeaderCell}>Route</div>
            <div style={styles.tableHeaderCell}>CDL</div>
            <div style={styles.tableHeaderCell}>Positions</div>
            <div style={styles.tableHeaderCell}>Status</div>
          </div>
          {jobs.map(job => (
            <div key={job.id} style={styles.tableRow} onClick={() => navigate(`/employer/jobs/${job.id}`)}>
              <div style={styles.tableCell}>
                <span style={styles.jobTitle}>{job.title}</span>
              </div>
              <div style={styles.tableCell}>{job.location || '-'}</div>
              <div style={styles.tableCell}>
                {job.pay_min && job.pay_max ? `$${job.pay_min}-$${job.pay_max}/wk` : '-'}
              </div>
              <div style={styles.tableCell}>{job.route_type || '-'}</div>
              <div style={styles.tableCell}>{job.cdl_class ? `Class ${job.cdl_class}` : '-'}</div>
              <div style={styles.tableCell}>{job.positions_available || 1}</div>
              <div style={styles.tableCell}>
                <span style={{ ...styles.statusBadge, ...getStatusStyle(job.status) }}>
                  {job.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </EmployerLayout>
  );
}

function getStatusStyle(status) {
  switch (status) {
    case 'Active':
      return { background: '#D1FAE5', color: '#059669' };
    case 'Filled':
      return { background: '#DBEAFE', color: '#2563EB' };
    case 'On Hold':
      return { background: '#FEF3C7', color: '#D97706' };
    case 'Closed':
      return { background: '#F3F4F6', color: '#6B7280' };
    default:
      return { background: '#F3F4F6', color: '#6B7280' };
  }
}

const styles = {
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    margin: 0,
    fontSize: 28,
    fontWeight: 700,
    color: '#004751',
    fontFamily: 'Georgia, serif',
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
    marginBottom: 24,
    alignItems: 'center',
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
  tableHeaderCell: {
    display: 'table-cell',
    padding: '12px 16px',
    fontSize: 11,
    fontWeight: 600,
    color: '#5A7A82',
    textTransform: 'uppercase',
    borderBottom: '1px solid #E8ECEE',
  },
  tableRow: {
    display: 'table-row',
    cursor: 'pointer',
  },
  tableCell: {
    display: 'table-cell',
    padding: '12px 16px',
    fontSize: 14,
    verticalAlign: 'middle',
    borderBottom: '1px solid #E8ECEE',
  },
  jobTitle: {
    fontWeight: 600,
    color: '#004751',
  },
  statusBadge: {
    display: 'inline-block',
    padding: '4px 10px',
    fontSize: 11,
    fontWeight: 600,
    borderRadius: 12,
  },
};
