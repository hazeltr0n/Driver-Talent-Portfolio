import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import EmployerLayout from './EmployerLayout';
import { listEmployerJobs, updateEmployerJob } from '../lib/employer-api';

const STATUSES = ['Active', 'Filled', 'On Hold', 'Closed'];
const ROUTE_TYPES = ['Local', 'Regional', 'OTR'];
const CDL_CLASSES = ['A', 'B'];
const HOME_TIMES = ['Home Daily', 'Home Weekly', 'Home Bi-weekly', 'Out 2-3 weeks'];
const TOUCH_FREIGHT = ['Very Light', 'Light', 'Medium', 'Heavy'];

export default function EmployerJobs() {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filterStatus, setFilterStatus] = useState('Active');
  const [editingCell, setEditingCell] = useState(null);
  const [savingCell, setSavingCell] = useState(null);
  const [selectedJob, setSelectedJob] = useState(null);
  const navigate = useNavigate();

  const handleStatusChange = async (jobId, newStatus) => {
    setSavingCell(jobId);
    try {
      await updateEmployerJob(jobId, { status: newStatus });
      setJobs(prev => prev.map(j =>
        j.id === jobId ? { ...j, status: newStatus } : j
      ));
    } catch (err) {
      console.error('Failed to update status:', err);
    } finally {
      setSavingCell(null);
      setEditingCell(null);
    }
  };

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
            <div key={job.id} style={styles.tableRow} onClick={() => setSelectedJob(job)}>
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
              <div
                style={{ ...styles.tableCell, cursor: 'pointer' }}
                onClick={(e) => {
                  e.stopPropagation();
                  setEditingCell(job.id);
                }}
              >
                {editingCell === job.id ? (
                  <select
                    autoFocus
                    value={job.status || 'Active'}
                    onChange={(e) => handleStatusChange(job.id, e.target.value)}
                    onBlur={() => setEditingCell(null)}
                    onClick={(e) => e.stopPropagation()}
                    style={styles.inlineSelect}
                    disabled={savingCell === job.id}
                  >
                    {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                ) : (
                  <span style={{ ...styles.statusBadge, ...getStatusStyle(job.status) }}>
                    {job.status}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {selectedJob && (
        <JobDetailModal
          job={selectedJob}
          onClose={() => setSelectedJob(null)}
          onSave={() => {
            setSelectedJob(null);
            loadJobs();
          }}
        />
      )}
    </EmployerLayout>
  );
}

function JobDetailModal({ job, onClose, onSave }) {
  const [editing, setEditing] = useState(false);
  const [formData, setFormData] = useState({ ...job });
  const [saving, setSaving] = useState(false);

  const handleFieldChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateEmployerJob(job.id, formData);
      setEditing(false);
      onSave();
    } catch (err) {
      console.error('Save error:', err);
      alert('Save failed: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={styles.modalOverlay} onClick={onClose}>
      <div style={styles.modal} onClick={e => e.stopPropagation()}>
        <div style={styles.modalHeader}>
          <div>
            <h2 style={styles.modalTitle}>{job.title}</h2>
            <div style={styles.modalSubtitle}>{job.location}</div>
          </div>
          <div style={styles.modalHeaderActions}>
            {!editing ? (
              <button onClick={() => setEditing(true)} style={styles.editButton}>Edit</button>
            ) : (
              <>
                <button onClick={() => { setEditing(false); setFormData({ ...job }); }} style={styles.cancelButton}>Cancel</button>
                <button onClick={handleSave} disabled={saving} style={styles.saveButton}>
                  {saving ? '...' : 'Save'}
                </button>
              </>
            )}
            <button onClick={onClose} style={styles.closeButton}>×</button>
          </div>
        </div>

        <div style={styles.modalBody}>
          {editing ? (
            <div style={styles.formSections}>
              <div style={styles.formSection}>
                <div style={styles.formSectionTitle}>Basic Info</div>
                <div style={styles.formGrid}>
                  <FormField label="Title" value={formData.title || ''} onChange={v => handleFieldChange('title', v)} />
                  <FormField label="Location" value={formData.location || ''} onChange={v => handleFieldChange('location', v)} />
                  <FormField label="Yard Zip" value={formData.yard_zip || ''} onChange={v => handleFieldChange('yard_zip', v)} />
                  <FormField label="Status" value={formData.status || ''} onChange={v => handleFieldChange('status', v)} type="select" options={STATUSES} />
                  <FormField label="Positions" value={formData.positions_available || 1} onChange={v => handleFieldChange('positions_available', parseInt(v) || 1)} type="number" />
                  <FormField label="Received Date" value={formData.received_date || ''} onChange={v => handleFieldChange('received_date', v)} type="date" />
                  <FormField label="Filled Date" value={formData.filled_date || ''} onChange={v => handleFieldChange('filled_date', v)} type="date" />
                </div>
              </div>

              <div style={styles.formSection}>
                <div style={styles.formSectionTitle}>Job Requirements</div>
                <div style={styles.formGrid}>
                  <FormField label="Route Type" value={formData.route_type || ''} onChange={v => handleFieldChange('route_type', v)} type="select" options={ROUTE_TYPES} />
                  <FormField label="CDL Class" value={formData.cdl_class || ''} onChange={v => handleFieldChange('cdl_class', v)} type="select" options={CDL_CLASSES} />
                  <FormField label="Min Experience (yrs)" value={formData.min_experience_years || ''} onChange={v => handleFieldChange('min_experience_years', parseInt(v) || null)} type="number" />
                  <FormField label="Home Time" value={formData.home_time || ''} onChange={v => handleFieldChange('home_time', v)} type="select" options={HOME_TIMES} />
                  <FormField label="Touch Freight" value={formData.touch_freight || ''} onChange={v => handleFieldChange('touch_freight', v)} type="select" options={TOUCH_FREIGHT} />
                  <FormField label="Equipment Types" value={formData.equipment_types || ''} onChange={v => handleFieldChange('equipment_types', v)} />
                  <FormField label="Endorsements Required" value={formData.endorsements_required || ''} onChange={v => handleFieldChange('endorsements_required', v)} />
                </div>
              </div>

              <div style={styles.formSection}>
                <div style={styles.formSectionTitle}>Driver Qualifications</div>
                <div style={styles.formGrid}>
                  <FormField label="Max MVR Violations" value={formData.max_mvr_violations || ''} onChange={v => handleFieldChange('max_mvr_violations', parseInt(v) || null)} type="number" />
                  <FormField label="Max Accidents" value={formData.max_accidents || ''} onChange={v => handleFieldChange('max_accidents', parseInt(v) || null)} type="number" />
                </div>
              </div>

              <div style={styles.formSection}>
                <div style={styles.formSectionTitle}>Compensation</div>
                <div style={styles.formGrid}>
                  <FormField label="Pay Min ($/wk)" value={formData.pay_min || ''} onChange={v => handleFieldChange('pay_min', parseInt(v) || null)} type="number" />
                  <FormField label="Pay Max ($/wk)" value={formData.pay_max || ''} onChange={v => handleFieldChange('pay_max', parseInt(v) || null)} type="number" />
                </div>
              </div>

              <div style={styles.formSection}>
                <div style={styles.formSectionTitle}>Job Description</div>
                <textarea
                  value={formData.raw_description || ''}
                  onChange={e => handleFieldChange('raw_description', e.target.value)}
                  style={styles.textarea}
                  rows={6}
                  placeholder="Full job description..."
                />
              </div>

              <div style={styles.formSection}>
                <div style={styles.formSectionTitle}>Internal Notes</div>
                <textarea
                  value={formData.notes || ''}
                  onChange={e => handleFieldChange('notes', e.target.value)}
                  style={styles.textarea}
                  rows={3}
                  placeholder="Internal notes (not shown to drivers)..."
                />
              </div>
            </div>
          ) : (
            <div style={styles.detailSections}>
              <div style={styles.detailGrid}>
                <DetailItem label="Status" value={job.status} />
                <DetailItem label="Location" value={job.location} />
                <DetailItem label="Yard Zip" value={job.yard_zip} />
                <DetailItem label="Route Type" value={job.route_type} />
                <DetailItem label="CDL Class" value={job.cdl_class ? `Class ${job.cdl_class}` : null} />
                <DetailItem label="Min Experience" value={job.min_experience_years ? `${job.min_experience_years} years` : null} />
                <DetailItem label="Home Time" value={job.home_time} />
                <DetailItem label="Touch Freight" value={job.touch_freight} />
                <DetailItem label="Equipment" value={job.equipment_types} />
                <DetailItem label="Pay" value={job.pay_min && job.pay_max ? `$${job.pay_min}-$${job.pay_max}/wk` : null} />
                <DetailItem label="Positions" value={job.positions_available || 1} />
                <DetailItem label="Endorsements" value={job.endorsements_required} />
                <DetailItem label="Max MVR Violations" value={job.max_mvr_violations} />
                <DetailItem label="Max Accidents" value={job.max_accidents} />
                <DetailItem label="Received" value={job.received_date} />
                <DetailItem label="Filled" value={job.filled_date} />
              </div>
              {job.raw_description && (
                <div style={styles.descriptionSection}>
                  <div style={styles.descriptionLabel}>Job Description</div>
                  <div style={styles.descriptionText}>{job.raw_description}</div>
                </div>
              )}
              {job.notes && (
                <div style={styles.notesSection}>
                  <div style={styles.notesLabel}>Internal Notes</div>
                  <div style={styles.notesText}>{job.notes}</div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function FormField({ label, value, onChange, type = 'text', options = [], placeholder = '' }) {
  return (
    <div style={styles.formField}>
      <label style={styles.formLabel}>{label}</label>
      {type === 'select' ? (
        <select value={value} onChange={e => onChange(e.target.value)} style={styles.formInput}>
          <option value="">--</option>
          {options.map(o => <option key={o} value={o}>{o}</option>)}
        </select>
      ) : type === 'date' ? (
        <input
          type="date"
          value={value || ''}
          onChange={e => onChange(e.target.value)}
          style={styles.formInput}
        />
      ) : (
        <input
          type={type}
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          style={styles.formInput}
        />
      )}
    </div>
  );
}

function DetailItem({ label, value }) {
  if (!value) return null;
  return (
    <div style={styles.detailItem}>
      <span style={styles.detailLabel}>{label}</span>
      <span style={styles.detailValue}>{value}</span>
    </div>
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
    cursor: 'pointer',
  },
  inlineSelect: {
    padding: '4px 8px',
    fontSize: 12,
    border: '1px solid #004751',
    borderRadius: 4,
    background: '#FFFFFF',
    cursor: 'pointer',
  },
  // Modal styles
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
    padding: '8px 16px',
    fontSize: 13,
    fontWeight: 600,
    background: '#004751',
    color: '#FFFFFF',
    border: 'none',
    borderRadius: 6,
    cursor: 'pointer',
  },
  cancelButton: {
    padding: '8px 16px',
    fontSize: 13,
    fontWeight: 500,
    background: '#FFFFFF',
    color: '#5A7A82',
    border: '1px solid #D1D9DD',
    borderRadius: 6,
    cursor: 'pointer',
  },
  saveButton: {
    padding: '8px 16px',
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
    marginLeft: 8,
  },
  modalBody: {
    padding: 24,
  },
  formSections: {
    display: 'flex',
    flexDirection: 'column',
    gap: 24,
  },
  formSection: {},
  formSectionTitle: {
    fontSize: 14,
    fontWeight: 600,
    color: '#004751',
    marginBottom: 12,
    paddingBottom: 8,
    borderBottom: '1px solid #E8ECEE',
  },
  formGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: 12,
  },
  formField: {
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
  },
  formLabel: {
    fontSize: 12,
    fontWeight: 600,
    color: '#5A7A82',
  },
  formInput: {
    padding: '8px 10px',
    fontSize: 14,
    border: '1px solid #D1D9DD',
    borderRadius: 4,
  },
  textarea: {
    width: '100%',
    padding: '8px 10px',
    fontSize: 14,
    border: '1px solid #D1D9DD',
    borderRadius: 4,
    fontFamily: 'inherit',
    resize: 'vertical',
  },
  detailSections: {},
  detailGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: 16,
  },
  detailItem: {
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
  },
  detailLabel: {
    fontSize: 12,
    fontWeight: 600,
    color: '#5A7A82',
  },
  detailValue: {
    fontSize: 14,
    color: '#1A2A30',
  },
  descriptionSection: {
    marginTop: 20,
    padding: 16,
    background: '#FFFFFF',
    borderRadius: 8,
    border: '1px solid #E8ECEE',
  },
  descriptionLabel: {
    fontSize: 12,
    fontWeight: 600,
    color: '#004751',
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  descriptionText: {
    fontSize: 14,
    color: '#1A2A30',
    lineHeight: 1.6,
    whiteSpace: 'pre-wrap',
  },
  notesSection: {
    marginTop: 16,
    padding: 16,
    background: '#F8FAFB',
    borderRadius: 8,
  },
  notesLabel: {
    fontSize: 12,
    fontWeight: 600,
    color: '#5A7A82',
    marginBottom: 8,
  },
  notesText: {
    fontSize: 14,
    color: '#1A2A30',
    lineHeight: 1.5,
    whiteSpace: 'pre-wrap',
  },
};
