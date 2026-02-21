import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import AdminLayout from './AdminLayout';
import { listSubmissions } from '../lib/api';

const REVENUE_PER_PLACEMENT = 500;

export default function Dashboard() {
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState({
    placements: 0,
    revenue: 0,
    activeJobs: 0,
    inPipeline: 0,
    submitted: 0,
    interviewing: 0,
  });

  useEffect(() => {
    loadMetrics();
  }, []);

  const loadMetrics = async () => {
    try {
      const [jobsRes, submissions] = await Promise.all([
        fetch('/api/jobs?status=Active').then(r => r.json()),
        listSubmissions(),
      ]);

      const placements = submissions.filter(s => s.status === 'Hired').length;
      const submitted = submissions.filter(s => s.status === 'Submitted').length;
      const interviewing = submissions.filter(s =>
        s.status === 'Interviewing' || s.status === 'Offer Extended'
      ).length;

      setMetrics({
        placements,
        revenue: placements * REVENUE_PER_PLACEMENT,
        activeJobs: jobsRes.jobs?.length || 0,
        inPipeline: submitted + interviewing,
        submitted,
        interviewing,
      });
    } catch (err) {
      console.error('Failed to load metrics:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AdminLayout>
      <h1 style={styles.title}>Career Agent Portal</h1>
      <p style={styles.subtitle}>Manage driver profiles, job requisitions, and fit matching.</p>

      {/* Metrics */}
      <div style={styles.metricsGrid}>
        <div style={styles.metricCard}>
          <div style={styles.metricValue}>
            {loading ? '...' : metrics.placements}
          </div>
          <div style={styles.metricLabel}>Placements</div>
        </div>
        <div style={{ ...styles.metricCard, background: '#D1FAE5' }}>
          <div style={{ ...styles.metricValue, color: '#059669' }}>
            {loading ? '...' : `$${metrics.revenue.toLocaleString()}`}
          </div>
          <div style={styles.metricLabel}>Revenue</div>
        </div>
        <div style={styles.metricCard}>
          <div style={styles.metricValue}>
            {loading ? '...' : metrics.activeJobs}
          </div>
          <div style={styles.metricLabel}>Active Jobs</div>
        </div>
        <div style={styles.metricCard}>
          <div style={styles.metricValue}>
            {loading ? '...' : metrics.inPipeline}
          </div>
          <div style={styles.metricLabel}>In Pipeline</div>
        </div>
      </div>

      {/* Pipeline breakdown */}
      <div style={styles.pipelineRow}>
        <div style={styles.pipelineItem}>
          <span style={{ ...styles.pipelineDot, background: '#3B82F6' }} />
          <span style={styles.pipelineText}>{metrics.submitted} Submitted</span>
        </div>
        <div style={styles.pipelineItem}>
          <span style={{ ...styles.pipelineDot, background: '#F59E0B' }} />
          <span style={styles.pipelineText}>{metrics.interviewing} Interviewing</span>
        </div>
        <div style={styles.pipelineItem}>
          <span style={{ ...styles.pipelineDot, background: '#10B981' }} />
          <span style={styles.pipelineText}>{metrics.placements} Hired</span>
        </div>
      </div>

      {/* Navigation cards */}
      <div style={styles.cards}>
        <Link to="/admin/requisitions" style={styles.card}>
          <h2 style={styles.cardTitle}>Requisitions</h2>
          <p style={styles.cardDesc}>
            Manage jobs, add new requisitions, submit drivers, and track the hiring pipeline.
          </p>
        </Link>

        <Link to="/admin/drivers" style={styles.card}>
          <h2 style={styles.cardTitle}>Drivers</h2>
          <p style={styles.cardDesc}>
            View driver profiles, edit details, add new drivers, and manage portfolios.
          </p>
        </Link>

        <Link to="/admin/submissions" style={styles.card}>
          <h2 style={styles.cardTitle}>Submissions</h2>
          <p style={styles.cardDesc}>
            Track all driver submissions, view fit scores, and manage hiring pipeline.
          </p>
        </Link>
      </div>
    </AdminLayout>
  );
}

const styles = {
  title: {
    margin: '0 0 8px',
    fontSize: 28,
    fontWeight: 700,
    color: '#004751',
    fontFamily: 'Georgia, serif',
  },
  subtitle: {
    margin: '0 0 24px',
    fontSize: 16,
    color: '#5A7A82',
  },
  metricsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
    gap: 16,
    marginBottom: 16,
  },
  metricCard: {
    background: '#F8FAFB',
    borderRadius: 12,
    padding: '20px 16px',
    textAlign: 'center',
    border: '1px solid #E8ECEE',
  },
  metricValue: {
    fontSize: 32,
    fontWeight: 700,
    color: '#004751',
    lineHeight: 1,
    marginBottom: 6,
  },
  metricLabel: {
    fontSize: 13,
    fontWeight: 500,
    color: '#5A7A82',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  pipelineRow: {
    display: 'flex',
    gap: 24,
    marginBottom: 32,
    padding: '12px 16px',
    background: '#FFFFFF',
    borderRadius: 8,
    border: '1px solid #E8ECEE',
  },
  pipelineItem: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  },
  pipelineDot: {
    width: 10,
    height: 10,
    borderRadius: '50%',
  },
  pipelineText: {
    fontSize: 14,
    color: '#1A2A30',
    fontWeight: 500,
  },
  cards: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
    gap: 20,
  },
  card: {
    background: '#FFFFFF',
    borderRadius: 12,
    padding: 24,
    textDecoration: 'none',
    boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
    border: '1px solid #E8ECEE',
    transition: 'all 0.2s',
    display: 'block',
  },
  cardTitle: {
    margin: '0 0 8px',
    fontSize: 18,
    fontWeight: 700,
    color: '#004751',
  },
  cardDesc: {
    margin: 0,
    fontSize: 14,
    color: '#5A7A82',
    lineHeight: 1.5,
  },
};
