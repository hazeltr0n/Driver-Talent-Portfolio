import { useState, useEffect } from 'react';
import AdminLayout from './AdminLayout';
import { listSubmissions, createSubmission, updateSubmission, searchCandidates, parseJobDescription, createJob, listEmployers } from '../lib/api';

const AIRTABLE_BASE_ID = 'appjZUryTUrvwToXE';
const AIRTABLE_REQUISITIONS_TABLE = 'tblnLDyGMPLOGROnn';

export default function Requisitions() {
  const [jobs, setJobs] = useState([]);
  const [submissions, setSubmissions] = useState({});
  const [collaborators, setCollaborators] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedJob, setSelectedJob] = useState(null);
  const [showAddJob, setShowAddJob] = useState(false);
  const [error, setError] = useState(null);

  // Filters & sorting
  const [filterStatus, setFilterStatus] = useState('Active');
  const [filterAgent, setFilterAgent] = useState('');
  const [filterRoute, setFilterRoute] = useState('');
  const [filterEmployer, setFilterEmployer] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('employer');
  const [sortDir, setSortDir] = useState('asc');

  // Inline editing
  const [editingCell, setEditingCell] = useState(null);
  const [savingCell, setSavingCell] = useState(null);

  useEffect(() => {
    loadData();
    loadCollaborators();
  }, [filterStatus]);

  const loadCollaborators = async () => {
    try {
      const res = await fetch('/api/collaborators');
      const data = await res.json();
      setCollaborators(data.collaborators || []);
    } catch (err) {
      console.error('Failed to load collaborators:', err);
    }
  };

  const handleInlineSave = async (id, field, value) => {
    setSavingCell({ id, field });
    try {
      const response = await fetch(`/api/jobs/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [field]: value }),
      });
      if (!response.ok) throw new Error('Update failed');
      setJobs(prev => prev.map(j =>
        j.id === id ? { ...j, [field]: value } : j
      ));
    } catch (err) {
      console.error('Failed to save:', err);
    } finally {
      setSavingCell(null);
      setEditingCell(null);
    }
  };

  const loadData = async () => {
    try {
      setLoading(true);
      const [jobsRes, submissionsData] = await Promise.all([
        fetch(`/api/jobs?status=${filterStatus}`).then(r => r.json()),
        listSubmissions(),
      ]);
      setJobs(jobsRes.jobs || []);

      const grouped = {};
      for (const sub of submissionsData) {
        if (!grouped[sub.requisition_id]) grouped[sub.requisition_id] = [];
        grouped[sub.requisition_id].push(sub);
      }
      setSubmissions(grouped);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const getSubmissionCounts = (jobId) => {
    const subs = submissions[jobId] || [];
    return {
      submitted: subs.filter(s => s.status === 'Submitted').length,
      interviewing: subs.filter(s => s.status === 'Interviewing' || s.status === 'Offer Extended').length,
      hired: subs.filter(s => s.status === 'Hired').length,
    };
  };

  const getDaysOpen = (receivedDate) => {
    if (!receivedDate) return '-';
    const days = Math.floor((new Date() - new Date(receivedDate)) / (1000 * 60 * 60 * 24));
    return days;
  };

  // Get unique values for filters
  const agents = [...new Set(jobs.map(j => j.career_agent?.name || j.career_agent_name).filter(Boolean))];
  const routeTypes = [...new Set(jobs.map(j => j.route_type).filter(Boolean))];
  const employers = [...new Set(jobs.map(j => j.employer).filter(Boolean))].sort();

  // Apply filters
  const filteredJobs = jobs.filter(job => {
    if (filterAgent && (job.career_agent?.name || job.career_agent_name) !== filterAgent) return false;
    if (filterRoute && job.route_type !== filterRoute) return false;
    if (filterEmployer && job.employer !== filterEmployer) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const matchEmployer = (job.employer || '').toLowerCase().includes(q);
      const matchTitle = (job.title || '').toLowerCase().includes(q);
      const matchLocation = (job.location || '').toLowerCase().includes(q);
      if (!matchEmployer && !matchTitle && !matchLocation) return false;
    }
    return true;
  });

  // Sort jobs
  const sortedJobs = [...filteredJobs].sort((a, b) => {
    let aVal, bVal;
    switch (sortBy) {
      case 'employer':
        aVal = (a.employer || '').toLowerCase();
        bVal = (b.employer || '').toLowerCase();
        break;
      case 'location':
        aVal = (a.location || '').toLowerCase();
        bVal = (b.location || '').toLowerCase();
        break;
      case 'pay':
        aVal = a.pay_max || 0;
        bVal = b.pay_max || 0;
        break;
      case 'days':
        aVal = a.received_date ? new Date(a.received_date).getTime() : 0;
        bVal = b.received_date ? new Date(b.received_date).getTime() : 0;
        break;
      default:
        return 0;
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

  const SortHeader = ({ field, children }) => (
    <div
      style={{ ...styles.tableHeaderCell, cursor: 'pointer', userSelect: 'none' }}
      onClick={() => handleSort(field)}
    >
      {children} {sortBy === field && (sortDir === 'asc' ? '↑' : '↓')}
    </div>
  );

  if (loading) {
    return (
      <AdminLayout>
        <div style={styles.loading}>Loading requisitions...</div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div style={styles.header}>
        <h1 style={styles.title}>Requisitions</h1>
        <div style={styles.headerButtons}>
          <a
            href={`https://airtable.com/${AIRTABLE_BASE_ID}/${AIRTABLE_REQUISITIONS_TABLE}`}
            target="_blank"
            rel="noopener noreferrer"
            style={styles.airtableLink}
          >
            View in Airtable
          </a>
          <button onClick={() => setShowAddJob(true)} style={styles.addButton}>
            + Add Job
          </button>
        </div>
      </div>

      {/* Filters */}
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
        <select
          value={filterAgent}
          onChange={e => setFilterAgent(e.target.value)}
          style={styles.filterSelect}
        >
          <option value="">All Agents</option>
          {agents.map(a => <option key={a} value={a}>{a}</option>)}
        </select>
        <select
          value={filterRoute}
          onChange={e => setFilterRoute(e.target.value)}
          style={styles.filterSelect}
        >
          <option value="">All Routes</option>
          {routeTypes.map(r => <option key={r} value={r}>{r}</option>)}
        </select>
        <select
          value={filterEmployer}
          onChange={e => setFilterEmployer(e.target.value)}
          style={styles.filterSelect}
        >
          <option value="">All Employers</option>
          {employers.map(e => <option key={e} value={e}>{e}</option>)}
        </select>
        <input
          type="text"
          placeholder="Search..."
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          style={styles.searchInput}
        />
        <div style={styles.statsRow}>
          <span style={styles.statChip}>{sortedJobs.length} jobs</span>
        </div>
      </div>

      {error && <div style={styles.error}>{error}</div>}

      <div style={styles.table}>
        <div style={styles.tableHeader}>
          <SortHeader field="employer">Employer / Title</SortHeader>
          <SortHeader field="location">Location</SortHeader>
          <SortHeader field="pay">Pay</SortHeader>
          <div style={styles.tableHeaderCell}>Status</div>
          <div style={styles.tableHeaderCell}>Agent</div>
          <SortHeader field="days">Days</SortHeader>
          <div style={styles.tableHeaderCell}>Sub</div>
          <div style={styles.tableHeaderCell}>Int</div>
          <div style={styles.tableHeaderCell}>Hired</div>
          <div style={styles.tableHeaderCell}>Actions</div>
        </div>

        {sortedJobs.map(job => {
          const counts = getSubmissionCounts(job.id);
          return (
            <div key={job.id} style={styles.tableRow}>
              <div style={styles.tableCell}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={styles.employer}>{job.employer}</span>
                  {job.hubspot_company_id && (
                    <a
                      href={`https://app.hubspot.com/contacts/47971120/company/${job.hubspot_company_id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={styles.hubspotLink}
                      onClick={e => e.stopPropagation()}
                    >
                      HubSpot
                    </a>
                  )}
                </div>
                <div style={styles.jobTitle}>{job.title}</div>
                <div style={styles.meta}>{job.route_type} · {job.cdl_class ? `CDL-${job.cdl_class}` : ''}</div>
              </div>
              <div style={styles.tableCell}>{job.location || '-'}</div>
              <div style={styles.tableCell}>
                {job.pay_min && job.pay_max ? `$${job.pay_min}-${job.pay_max}` : '-'}
              </div>
              <div
                style={{ ...styles.tableCell, cursor: 'pointer' }}
                onClick={() => setEditingCell({ id: job.id, field: 'status' })}
              >
                {editingCell?.id === job.id && editingCell?.field === 'status' ? (
                  <select
                    autoFocus
                    value={job.status || 'Active'}
                    onChange={(e) => handleInlineSave(job.id, 'status', e.target.value)}
                    onBlur={() => setEditingCell(null)}
                    onClick={(e) => e.stopPropagation()}
                    style={styles.inlineSelect}
                    disabled={savingCell?.id === job.id}
                  >
                    <option value="Active">Active</option>
                    <option value="Filled">Filled</option>
                    <option value="On Hold">On Hold</option>
                    <option value="Closed">Closed</option>
                  </select>
                ) : (
                  <span style={{ ...styles.statusBadge, ...getStatusStyle(job.status) }}>
                    {job.status || 'Active'}
                  </span>
                )}
              </div>
              <div
                style={{ ...styles.tableCell, fontSize: 13, color: '#5A7A82', cursor: 'pointer' }}
                onClick={() => setEditingCell({ id: job.id, field: 'career_agent' })}
              >
                {editingCell?.id === job.id && editingCell?.field === 'career_agent' ? (
                  <select
                    autoFocus
                    value={job.career_agent?.id || ''}
                    onChange={(e) => {
                      const selected = collaborators.find(c => c.id === e.target.value);
                      handleInlineSave(job.id, 'career_agent', selected ? { id: selected.id, name: selected.name } : null);
                    }}
                    onBlur={() => setEditingCell(null)}
                    onClick={(e) => e.stopPropagation()}
                    style={styles.inlineSelect}
                    disabled={savingCell?.id === job.id}
                  >
                    <option value="">Unassigned</option>
                    {collaborators.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                ) : (
                  <span style={styles.editableCell}>
                    {job.career_agent?.name || job.career_agent_name || <span style={styles.unassigned}>Unassigned</span>}
                  </span>
                )}
              </div>
              <div style={styles.tableCellNarrow}>{getDaysOpen(job.received_date)}</div>
              <div style={styles.tableCellNarrow}>
                <span style={styles.countBadge}>{counts.submitted}</span>
              </div>
              <div style={styles.tableCellNarrow}>
                <span style={{ ...styles.countBadge, background: '#FEF3C7', color: '#D97706' }}>{counts.interviewing}</span>
              </div>
              <div style={styles.tableCellNarrow}>
                <span style={{ ...styles.countBadge, background: '#D1FAE5', color: '#059669' }}>{counts.hired}</span>
              </div>
              <div style={styles.tableCell}>
                <button onClick={() => setSelectedJob(job)} style={styles.viewButton}>View</button>
              </div>
            </div>
          );
        })}

        {sortedJobs.length === 0 && (
          <div style={styles.empty}>No requisitions found</div>
        )}
      </div>

      {selectedJob && (
        <JobDetailModal
          job={selectedJob}
          submissions={submissions[selectedJob.id] || []}
          collaborators={collaborators}
          onClose={() => setSelectedJob(null)}
          onRefresh={loadData}
        />
      )}

      {showAddJob && (
        <AddJobModal
          onClose={() => setShowAddJob(false)}
          onSuccess={() => {
            setShowAddJob(false);
            loadData();
          }}
        />
      )}
    </AdminLayout>
  );
}

function AddJobModal({ onClose, onSuccess }) {
  const [step, setStep] = useState(1);
  const [description, setDescription] = useState('');
  const [parsing, setParsing] = useState(false);
  const [parsedJob, setParsedJob] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [employers, setEmployers] = useState([]);
  const [selectedEmployerId, setSelectedEmployerId] = useState('');

  useEffect(() => {
    loadEmployers();
  }, []);

  const loadEmployers = async () => {
    try {
      const data = await listEmployers();
      setEmployers(data || []);
    } catch (err) {
      console.error('Failed to load employers:', err);
    }
  };

  const handleParse = async () => {
    if (!description.trim()) return;
    setParsing(true);
    setError(null);
    try {
      const result = await parseJobDescription(description);
      setParsedJob({ ...result, raw_description: description });
      // Try to auto-match employer from parsed text
      const parsedEmployer = (result.employer || '').toLowerCase();
      const match = employers.find(e => e.name.toLowerCase().includes(parsedEmployer) || parsedEmployer.includes(e.name.toLowerCase()));
      if (match) {
        setSelectedEmployerId(match.id);
      }
      setStep(2);
    } catch (err) {
      setError(err.message);
    } finally {
      setParsing(false);
    }
  };

  const handleFieldChange = (field, value) => {
    setParsedJob(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    if (!selectedEmployerId) {
      setError('Please select an employer');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const selectedEmployer = employers.find(e => e.id === selectedEmployerId);
      await createJob({
        ...parsedJob,
        employer_id: selectedEmployerId,
        employer: selectedEmployer?.name || '', // Keep text field for backwards compatibility
      });
      onSuccess();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={styles.modalOverlay} onClick={onClose}>
      <div style={styles.addJobModal} onClick={e => e.stopPropagation()}>
        <div style={styles.modalHeader}>
          <h2 style={styles.modalTitle}>Add Job</h2>
          <button onClick={onClose} style={styles.closeButton}>×</button>
        </div>

        <div style={styles.steps}>
          <div style={{ ...styles.stepItem, ...(step >= 1 ? styles.stepActive : {}) }}>
            <span style={styles.stepNumber}>1</span> Paste
          </div>
          <div style={styles.stepLine} />
          <div style={{ ...styles.stepItem, ...(step >= 2 ? styles.stepActive : {}) }}>
            <span style={styles.stepNumber}>2</span> Review
          </div>
        </div>

        {error && <div style={styles.modalError}>{error}</div>}

        <div style={styles.modalBody}>
          {step === 1 && (
            <>
              <p style={styles.stepDesc}>Paste the job description and we'll extract the details.</p>
              <textarea
                placeholder="Paste job description here..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                style={styles.textarea}
                rows={10}
              />
              <div style={styles.actions}>
                <button onClick={handleParse} disabled={parsing || !description.trim()} style={styles.button}>
                  {parsing ? 'Parsing...' : 'Parse Job'}
                </button>
              </div>
            </>
          )}

          {step === 2 && parsedJob && (
            <>
              <p style={styles.stepDesc}>Review and edit the extracted details.</p>
              <div style={styles.formGrid}>
                <div style={styles.formField}>
                  <label style={styles.formLabel}>Employer *</label>
                  <select
                    value={selectedEmployerId}
                    onChange={e => setSelectedEmployerId(e.target.value)}
                    style={{ ...styles.formInput, ...(selectedEmployerId ? {} : { borderColor: '#EF4444' }) }}
                  >
                    <option value="">-- Select Employer --</option>
                    {employers.map(e => (
                      <option key={e.id} value={e.id}>{e.name}</option>
                    ))}
                  </select>
                  {employers.length === 0 && (
                    <div style={{ fontSize: 12, color: '#EF4444', marginTop: 4 }}>
                      No employers found. Add employers first.
                    </div>
                  )}
                </div>
                <FormField label="Title" value={parsedJob.title || ''} onChange={v => handleFieldChange('title', v)} />
                <FormField label="Location" value={parsedJob.location || ''} onChange={v => handleFieldChange('location', v)} />
                <FormField label="Yard Zip" value={parsedJob.yard_zip || ''} onChange={v => handleFieldChange('yard_zip', v)} />
                <FormField label="Route Type" value={parsedJob.route_type || ''} onChange={v => handleFieldChange('route_type', v)} type="select" options={['Local', 'Regional', 'OTR']} />
                <FormField label="CDL Class" value={parsedJob.cdl_class || ''} onChange={v => handleFieldChange('cdl_class', v)} type="select" options={['A', 'B']} />
                <FormField label="Min Exp (yrs)" value={parsedJob.min_experience_years || 0} onChange={v => handleFieldChange('min_experience_years', parseInt(v) || 0)} type="number" />
                <FormField label="Pay Min" value={parsedJob.pay_min || 0} onChange={v => handleFieldChange('pay_min', parseInt(v) || 0)} type="number" />
                <FormField label="Pay Max" value={parsedJob.pay_max || 0} onChange={v => handleFieldChange('pay_max', parseInt(v) || 0)} type="number" />
                <FormField label="Home Time" value={parsedJob.home_time || ''} onChange={v => handleFieldChange('home_time', v)} type="select" options={['Home Daily', 'Home Weekly', 'Home Bi-weekly', 'Out 2-3 weeks']} />
                <FormField label="Touch Freight" value={parsedJob.touch_freight || 'Very Light'} onChange={v => handleFieldChange('touch_freight', v)} type="select" options={['Very Light', 'Light', 'Medium', 'Heavy']} />
                <FormField label="Equipment" value={parsedJob.equipment_types || ''} onChange={v => handleFieldChange('equipment_types', v)} />
              </div>
              <div style={styles.actions}>
                <button onClick={() => setStep(1)} style={styles.buttonSecondary}>Back</button>
                <button onClick={handleSave} disabled={saving} style={styles.button}>
                  {saving ? 'Saving...' : 'Save Job'}
                </button>
              </div>
            </>
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

function JobDetailModal({ job, submissions, collaborators, onClose, onRefresh }) {
  const [editing, setEditing] = useState(false);
  const [formData, setFormData] = useState({ ...job });
  const [saving, setSaving] = useState(false);
  const [showAddDriver, setShowAddDriver] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [fitScores, setFitScores] = useState({});
  const [loadingFit, setLoadingFit] = useState({});

  const fetchFitScore = async (candidateUuid) => {
    if (!candidateUuid || fitScores[candidateUuid] !== undefined) return;
    setLoadingFit(prev => ({ ...prev, [candidateUuid]: true }));
    try {
      const res = await fetch('/api/fit-profiles/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ candidate_uuid: candidateUuid, requisition_id: job.id }),
      });
      if (res.ok) {
        const data = await res.json();
        setFitScores(prev => ({ ...prev, [candidateUuid]: data.fit_score }));
      } else {
        setFitScores(prev => ({ ...prev, [candidateUuid]: null }));
      }
    } catch (err) {
      setFitScores(prev => ({ ...prev, [candidateUuid]: null }));
    } finally {
      setLoadingFit(prev => ({ ...prev, [candidateUuid]: false }));
    }
  };

  const handleFieldChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSaveJob = async () => {
    setSaving(true);
    try {
      const response = await fetch(`/api/jobs/${job.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'Update failed');
      }
      setEditing(false);
      onRefresh();
    } catch (err) {
      console.error('Save error:', err);
      alert('Save failed: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleSearch = async () => {
    if (searchQuery.length < 2) return;
    setSearching(true);
    setFitScores({});
    try {
      const results = await searchCandidates(searchQuery);
      setSearchResults(results);
      // Auto-fetch fit scores
      for (const c of results) {
        if (c.uuid) {
          fetchFitScore(c.uuid);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSearching(false);
    }
  };

  const handleSubmitDriver = async (candidate) => {
    setSubmitting(true);
    try {
      await createSubmission({
        candidate_uuid: candidate.uuid,
        candidate_name: candidate.name || candidate.fullName,
        requisition_id: job.id,
        employer: job.employer,
        job_title: job.title,
      });
      setShowAddDriver(false);
      setSearchQuery('');
      setSearchResults([]);
      onRefresh();
    } catch (err) {
      console.error(err);
      alert('Error: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateStatus = async (submissionId, updates) => {
    try {
      await updateSubmission(submissionId, updates);
      onRefresh();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div style={styles.modalOverlay} onClick={onClose}>
      <div style={styles.modal} onClick={e => e.stopPropagation()}>
        <div style={styles.modalHeader}>
          <div>
            <h2 style={styles.modalTitle}>{job.title}</h2>
            <div style={styles.modalSubtitle}>{job.employer} · {job.location}</div>
          </div>
          <div style={styles.modalHeaderActions}>
            {!editing ? (
              <button onClick={() => setEditing(true)} style={styles.editButton}>Edit</button>
            ) : (
              <>
                <button onClick={() => { setEditing(false); setFormData({ ...job }); }} style={styles.cancelButtonSmall}>Cancel</button>
                <button onClick={handleSaveJob} disabled={saving} style={styles.saveButtonSmall}>
                  {saving ? '...' : 'Save'}
                </button>
              </>
            )}
            <button onClick={onClose} style={styles.closeButton}>×</button>
          </div>
        </div>

        <div style={styles.modalBody}>
          {editing ? (
            <div style={styles.editSections}>
              <div style={styles.editSection}>
                <div style={styles.editSectionTitle}>Basic Info</div>
                <div style={styles.editFormGrid}>
                  <FormField label="Employer" value={formData.employer || ''} onChange={v => handleFieldChange('employer', v)} />
                  <FormField label="Title" value={formData.title || ''} onChange={v => handleFieldChange('title', v)} />
                  <FormField label="Location" value={formData.location || ''} onChange={v => handleFieldChange('location', v)} />
                  <FormField label="Yard Zip" value={formData.yard_zip || ''} onChange={v => handleFieldChange('yard_zip', v)} />
                  <FormField label="Status" value={formData.status || ''} onChange={v => handleFieldChange('status', v)} type="select" options={['Active', 'Filled', 'On Hold', 'Closed']} />
                  <div style={styles.formField}>
                    <label style={styles.formLabel}>Career Agent</label>
                    <select
                      value={formData.career_agent?.id || formData.career_agent_name || ''}
                      onChange={e => handleFieldChange('career_agent', e.target.value ? { id: e.target.value } : null)}
                      style={styles.formInput}
                    >
                      <option value="">Unassigned</option>
                      {collaborators.map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                  <FormField label="Positions" value={formData.positions_available || 1} onChange={v => handleFieldChange('positions_available', parseInt(v) || 1)} type="number" />
                  <FormField label="Received Date" value={formData.received_date || ''} onChange={v => handleFieldChange('received_date', v)} type="date" />
                  <FormField label="Filled Date" value={formData.filled_date || ''} onChange={v => handleFieldChange('filled_date', v)} type="date" />
                </div>
              </div>

              <div style={styles.editSection}>
                <div style={styles.editSectionTitle}>Job Requirements</div>
                <div style={styles.editFormGrid}>
                  <FormField label="Route Type" value={formData.route_type || ''} onChange={v => handleFieldChange('route_type', v)} type="select" options={['Local', 'Regional', 'OTR']} />
                  <FormField label="CDL Class" value={formData.cdl_class || ''} onChange={v => handleFieldChange('cdl_class', v)} type="select" options={['A', 'B']} />
                  <FormField label="Min Exp (yrs)" value={formData.min_experience_years || 0} onChange={v => handleFieldChange('min_experience_years', parseInt(v) || 0)} type="number" />
                  <FormField label="Home Time" value={formData.home_time || ''} onChange={v => handleFieldChange('home_time', v)} type="select" options={['Home Daily', 'Home Weekly', 'Home Bi-weekly', 'Out 2-3 weeks']} />
                  <FormField label="Touch Freight" value={formData.touch_freight || ''} onChange={v => handleFieldChange('touch_freight', v)} type="select" options={['Very Light', 'Light', 'Medium', 'Heavy']} />
                  <FormField label="Equipment" value={formData.equipment_types || ''} onChange={v => handleFieldChange('equipment_types', v)} />
                  <FormField label="Endorsements" value={formData.endorsements_required || ''} onChange={v => handleFieldChange('endorsements_required', v)} />
                </div>
              </div>

              <div style={styles.editSection}>
                <div style={styles.editSectionTitle}>Compensation</div>
                <div style={styles.editFormGrid}>
                  <FormField label="Pay Min ($/wk)" value={formData.pay_min || 0} onChange={v => handleFieldChange('pay_min', parseInt(v) || 0)} type="number" />
                  <FormField label="Pay Max ($/wk)" value={formData.pay_max || 0} onChange={v => handleFieldChange('pay_max', parseInt(v) || 0)} type="number" />
                </div>
              </div>

              <div style={styles.editSection}>
                <div style={styles.editSectionTitle}>Background Requirements</div>
                <div style={styles.editFormGrid}>
                  <FormField label="Max MVR Violations" value={formData.max_mvr_violations || 0} onChange={v => handleFieldChange('max_mvr_violations', parseInt(v) || 0)} type="number" />
                  <FormField label="Max Accidents" value={formData.max_accidents || 0} onChange={v => handleFieldChange('max_accidents', parseInt(v) || 0)} type="number" />
                </div>
              </div>

              <div style={styles.editSection}>
                <div style={styles.editSectionTitle}>Notes</div>
                <textarea
                  value={formData.notes || ''}
                  onChange={e => handleFieldChange('notes', e.target.value)}
                  style={styles.editTextarea}
                  rows={3}
                  placeholder="Internal notes..."
                />
              </div>

              <div style={styles.editSection}>
                <div style={styles.editSectionTitle}>Original Job Description</div>
                <textarea
                  value={formData.raw_description || ''}
                  onChange={e => handleFieldChange('raw_description', e.target.value)}
                  style={styles.editTextarea}
                  rows={6}
                  placeholder="Paste original job posting here..."
                />
              </div>
            </div>
          ) : (
            <div style={styles.jobDetails}>
              <div style={styles.detailItem}><span style={styles.detailLabel}>Pay:</span> ${job.pay_min}-${job.pay_max}/wk</div>
              <div style={styles.detailItem}><span style={styles.detailLabel}>Route:</span> {job.route_type}</div>
              <div style={styles.detailItem}><span style={styles.detailLabel}>Home Time:</span> {job.home_time}</div>
              <div style={styles.detailItem}><span style={styles.detailLabel}>Touch Freight:</span> {job.touch_freight || 'Not specified'}</div>
              <div style={styles.detailItem}><span style={styles.detailLabel}>CDL:</span> {job.cdl_class ? `Class ${job.cdl_class}` : '-'}</div>
              <div style={styles.detailItem}><span style={styles.detailLabel}>Min Exp:</span> {job.min_experience_years || 0} yrs</div>
              <div style={styles.detailItem}><span style={styles.detailLabel}>Equipment:</span> {job.equipment_types || '-'}</div>
              <div style={styles.detailItem}><span style={styles.detailLabel}>Agent:</span> {job.career_agent?.name || job.career_agent_name || 'Unassigned'}</div>
            </div>
          )}

          <div style={styles.submissionsHeader}>
            <h3 style={styles.submissionsTitle}>Submissions ({submissions.length})</h3>
            <button onClick={() => setShowAddDriver(true)} style={styles.addButtonSmall}>+ Submit Driver</button>
          </div>

          {showAddDriver && (
            <div style={styles.addDriverBox}>
              <div style={styles.searchRow}>
                <input
                  type="text"
                  placeholder="Search existing drivers..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleSearch()}
                  style={styles.searchInputSmall}
                />
                <button onClick={handleSearch} disabled={searching} style={styles.searchButton}>{searching ? '...' : 'Search'}</button>
                <button onClick={() => setShowAddDriver(false)} style={styles.cancelButton}>Cancel</button>
              </div>
              <div style={styles.searchHint}>Drivers must be added on the Drivers page first</div>
              {searchResults.length > 0 && (
                <div style={styles.searchResults}>
                  {searchResults.map(c => {
                    const score = fitScores[c.uuid];
                    const isLoading = loadingFit[c.uuid];
                    return (
                      <div key={c.uuid} style={styles.searchResultItem}>
                        <div style={{ flex: 1 }}>
                          <div style={styles.candidateName}>{c.name || c.fullName}</div>
                          <div style={styles.candidateMeta}>{c.location || [c.city, c.state].filter(Boolean).join(', ')}</div>
                        </div>
                        <div style={styles.fitPreview}>
                          {isLoading ? (
                            <span style={styles.fitLoading}>...</span>
                          ) : score !== undefined && score !== null ? (
                            <span style={{ ...styles.fitScorePreview, color: score >= 85 ? '#059669' : score >= 70 ? '#D97706' : '#DC2626' }}>
                              {score}%
                            </span>
                          ) : null}
                        </div>
                        <button onClick={() => handleSubmitDriver(c)} disabled={submitting} style={styles.submitButton}>Submit</button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          <div style={styles.submissionsList}>
            {submissions.map(sub => (
              <SubmissionRow key={sub.id} submission={sub} onUpdateStatus={handleUpdateStatus} />
            ))}
            {submissions.length === 0 && (
              <div style={styles.noSubmissions}>No drivers submitted yet</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function SubmissionRow({ submission: sub, onUpdateStatus }) {
  const [expanded, setExpanded] = useState(false);
  const [copied, setCopied] = useState(false);
  const dimensions = sub.fit_dimensions || [];

  const getScoreColor = (score) => {
    if (score >= 85) return '#059669';
    if (score >= 70) return '#D97706';
    return '#DC2626';
  };

  const handleCopyLink = () => {
    const fullUrl = `${window.location.origin}${sub.driver_fit_link}`;
    navigator.clipboard.writeText(fullUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleOpenLink = () => {
    window.open(sub.driver_fit_link, '_blank');
  };

  return (
    <div style={styles.submissionItemWrapper}>
      <div style={styles.submissionItem}>
        <div style={styles.submissionInfo}>
          <div style={styles.submissionNameRow}>
            <span style={styles.submissionName}>{sub.candidate_name}</span>
            {sub.fit_score && (
              <span style={{ ...styles.fitScoreBadge, background: getScoreColor(sub.fit_score) }}>
                {sub.fit_score}%
              </span>
            )}
          </div>
          <div style={styles.submissionMeta}>
            {sub.submitted_date}
            {sub.hire_date && ` · Hired ${sub.hire_date}`}
          </div>
          <div style={styles.submissionLinks}>
            {sub.driver_fit_link && (
              <>
                <button onClick={handleOpenLink} style={styles.fitLinkButton}>
                  View Fit Profile
                </button>
                <button onClick={handleCopyLink} style={styles.copyLinkButton}>
                  {copied ? 'Copied!' : 'Copy Link'}
                </button>
              </>
            )}
            {sub.fit_recommendation && (
              <button onClick={() => setExpanded(!expanded)} style={styles.expandButton}>
                {expanded ? '- Hide' : '+ Details'}
              </button>
            )}
          </div>
        </div>
        <div style={styles.submissionActions}>
          <select
            value={sub.status}
            onChange={e => onUpdateStatus(sub.id, { status: e.target.value })}
            style={{ ...styles.statusSelect, background: getStatusColor(sub.status) }}
          >
            <option value="Submitted">Submitted</option>
            <option value="Interviewing">Interviewing</option>
            <option value="Offer Extended">Offer Extended</option>
            <option value="Hired">Hired</option>
            <option value="Rejected">Rejected</option>
            <option value="Withdrawn">Withdrawn</option>
          </select>
          {sub.status === 'Rejected' && (
            <select
              value={sub.rejection_reason || ''}
              onChange={e => onUpdateStatus(sub.id, { rejection_reason: e.target.value })}
              style={styles.reasonSelect}
            >
              <option value="">Reason...</option>
              <option value="No Response">No Response</option>
              <option value="Failed Background">Failed Background</option>
              <option value="Client Rejected">Client Rejected</option>
              <option value="Driver Declined">Driver Declined</option>
              <option value="Position Filled">Position Filled</option>
            </select>
          )}
        </div>
      </div>

      {expanded && (
        <div style={styles.fitDetails}>
          {dimensions.length > 0 && (
            <div style={styles.dimensionsGrid}>
              {dimensions.map((dim, i) => (
                <div key={i} style={styles.dimensionItem}>
                  <div style={styles.dimensionHeader}>
                    <span style={styles.dimensionName}>{dim.name}</span>
                    <span style={{ ...styles.dimensionScore, color: getScoreColor(dim.score) }}>{dim.score}</span>
                  </div>
                  <div style={styles.dimensionNote}>{dim.note}</div>
                </div>
              ))}
            </div>
          )}
          {sub.fit_recommendation && (
            <div style={styles.recommendation}>
              <div style={styles.recommendationLabel}>AI Recommendation</div>
              <div style={styles.recommendationText}>{sub.fit_recommendation}</div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function getStatusColor(status) {
  switch (status) {
    case 'Submitted': return '#DBEAFE';
    case 'Interviewing': return '#FEF3C7';
    case 'Offer Extended': return '#E9D5FF';
    case 'Hired': return '#D1FAE5';
    case 'Rejected': return '#FEE2E2';
    case 'Withdrawn': return '#F3F4F6';
    default: return '#F3F4F6';
  }
}

function getStatusStyle(status) {
  switch (status) {
    case 'Active': return { background: '#D1FAE5', color: '#059669' };
    case 'Filled': return { background: '#DBEAFE', color: '#1D4ED8' };
    case 'On Hold': return { background: '#FEF3C7', color: '#D97706' };
    case 'Closed': return { background: '#F3F4F6', color: '#6B7280' };
    default: return { background: '#D1FAE5', color: '#059669' };
  }
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
  headerButtons: {
    display: 'flex',
    gap: 12,
    alignItems: 'center',
  },
  airtableLink: {
    padding: '10px 16px',
    fontSize: 14,
    fontWeight: 600,
    background: '#FFFFFF',
    color: '#004751',
    border: '1px solid #D1D9DD',
    borderRadius: 6,
    textDecoration: 'none',
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
    width: 180,
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
  tableRow: {
    display: 'table-row',
  },
  tableCell: {
    display: 'table-cell',
    padding: '12px 16px',
    fontSize: 14,
    verticalAlign: 'middle',
    whiteSpace: 'nowrap',
    borderBottom: '1px solid #E8ECEE',
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
  tableCellNarrow: {
    display: 'table-cell',
    padding: '12px 8px',
    textAlign: 'center',
    fontSize: 14,
    verticalAlign: 'middle',
    whiteSpace: 'nowrap',
    borderBottom: '1px solid #E8ECEE',
  },
  employer: {
    fontWeight: 600,
    color: '#004751',
    fontSize: 15,
  },
  jobTitle: {
    fontSize: 13,
    color: '#1A2A30',
  },
  meta: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 2,
  },
  unassigned: {
    color: '#9CA3AF',
    fontStyle: 'italic',
  },
  countBadge: {
    display: 'inline-block',
    padding: '2px 8px',
    fontSize: 12,
    fontWeight: 600,
    background: '#DBEAFE',
    color: '#1D4ED8',
    borderRadius: 10,
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
    maxWidth: 700,
    maxHeight: '90vh',
    overflow: 'auto',
  },
  addJobModal: {
    background: '#FFFFFF',
    borderRadius: 12,
    width: '90%',
    maxWidth: 650,
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
  closeButton: {
    background: 'none',
    border: 'none',
    fontSize: 28,
    color: '#9CA3AF',
    cursor: 'pointer',
    lineHeight: 1,
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
  cancelButtonSmall: {
    padding: '6px 12px',
    fontSize: 13,
    fontWeight: 500,
    background: '#FFFFFF',
    color: '#5A7A82',
    border: '1px solid #D1D9DD',
    borderRadius: 6,
    cursor: 'pointer',
  },
  saveButtonSmall: {
    padding: '6px 12px',
    fontSize: 13,
    fontWeight: 600,
    background: '#059669',
    color: '#FFFFFF',
    border: 'none',
    borderRadius: 6,
    cursor: 'pointer',
  },
  editSections: {
    marginBottom: 24,
  },
  editSection: {
    marginBottom: 20,
  },
  editSectionTitle: {
    fontSize: 13,
    fontWeight: 600,
    color: '#004751',
    marginBottom: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  editFormGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
    gap: 12,
    padding: 12,
    background: '#F8FAFB',
    borderRadius: 8,
  },
  editTextarea: {
    width: '100%',
    padding: 12,
    fontSize: 14,
    border: '1px solid #D1D9DD',
    borderRadius: 6,
    fontFamily: 'inherit',
    resize: 'vertical',
    boxSizing: 'border-box',
  },
  modalBody: {
    padding: 24,
  },
  modalError: {
    background: '#FEF2F2',
    color: '#DC2626',
    padding: '12px 16px',
    fontSize: 14,
  },
  steps: {
    display: 'flex',
    alignItems: 'center',
    padding: '16px 24px',
    background: '#F8FAFB',
    gap: 8,
  },
  stepItem: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    fontSize: 13,
    color: '#9CA3AF',
    fontWeight: 500,
  },
  stepActive: {
    color: '#004751',
  },
  stepNumber: {
    width: 24,
    height: 24,
    borderRadius: '50%',
    background: '#E8ECEE',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 12,
    fontWeight: 700,
  },
  stepLine: {
    flex: 1,
    height: 2,
    background: '#E8ECEE',
    maxWidth: 60,
  },
  stepDesc: {
    margin: '0 0 16px',
    fontSize: 14,
    color: '#5A7A82',
  },
  textarea: {
    width: '100%',
    padding: 12,
    fontSize: 14,
    border: '1px solid #D1D9DD',
    borderRadius: 6,
    fontFamily: 'inherit',
    resize: 'vertical',
    marginBottom: 16,
    boxSizing: 'border-box',
  },
  formGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
    gap: 12,
    marginBottom: 16,
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
  actions: {
    display: 'flex',
    gap: 10,
    justifyContent: 'flex-end',
  },
  button: {
    padding: '10px 20px',
    fontSize: 14,
    fontWeight: 600,
    background: '#004751',
    color: '#FFFFFF',
    border: 'none',
    borderRadius: 6,
    cursor: 'pointer',
  },
  buttonSecondary: {
    padding: '10px 20px',
    fontSize: 14,
    fontWeight: 600,
    background: '#FFFFFF',
    color: '#004751',
    border: '1px solid #D1D9DD',
    borderRadius: 6,
    cursor: 'pointer',
  },
  // Job detail modal
  jobDetails: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: 10,
    marginBottom: 24,
    padding: 16,
    background: '#F8FAFB',
    borderRadius: 8,
  },
  detailItem: {
    fontSize: 14,
  },
  detailLabel: {
    color: '#5A7A82',
    marginRight: 6,
  },
  submissionsHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  submissionsTitle: {
    margin: 0,
    fontSize: 16,
    fontWeight: 600,
    color: '#1A2A30',
  },
  addButtonSmall: {
    padding: '6px 14px',
    fontSize: 13,
    fontWeight: 600,
    background: '#004751',
    color: '#FFFFFF',
    border: 'none',
    borderRadius: 6,
    cursor: 'pointer',
  },
  addDriverBox: {
    background: '#F8FAFB',
    borderRadius: 8,
    padding: 14,
    marginBottom: 12,
  },
  searchRow: {
    display: 'flex',
    gap: 8,
  },
  searchInputSmall: {
    flex: 1,
    padding: '8px 12px',
    fontSize: 14,
    border: '1px solid #D1D9DD',
    borderRadius: 6,
  },
  searchButton: {
    padding: '8px 14px',
    fontSize: 13,
    fontWeight: 500,
    background: '#004751',
    color: '#FFFFFF',
    border: 'none',
    borderRadius: 6,
    cursor: 'pointer',
  },
  cancelButton: {
    padding: '8px 14px',
    fontSize: 13,
    fontWeight: 500,
    background: '#FFFFFF',
    color: '#5A7A82',
    border: '1px solid #D1D9DD',
    borderRadius: 6,
    cursor: 'pointer',
  },
  searchResults: {
    marginTop: 10,
    border: '1px solid #E8ECEE',
    borderRadius: 6,
    overflow: 'hidden',
  },
  searchHint: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 8,
  },
  searchResultItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '10px 12px',
    borderBottom: '1px solid #E8ECEE',
    background: '#FFFFFF',
  },
  candidateName: {
    fontWeight: 500,
    color: '#1A2A30',
  },
  candidateMeta: {
    fontSize: 12,
    color: '#5A7A82',
  },
  submitButton: {
    padding: '6px 12px',
    fontSize: 12,
    fontWeight: 600,
    background: '#059669',
    color: '#FFFFFF',
    border: 'none',
    borderRadius: 4,
    cursor: 'pointer',
  },
  newDriverButton: {
    padding: '8px 14px',
    fontSize: 13,
    fontWeight: 500,
    background: '#059669',
    color: '#FFFFFF',
    border: 'none',
    borderRadius: 6,
    cursor: 'pointer',
  },
  newDriverForm: {
    padding: 4,
  },
  newDriverTitle: {
    fontSize: 14,
    fontWeight: 600,
    color: '#004751',
    marginBottom: 12,
  },
  newDriverGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
    gap: 8,
    marginBottom: 12,
  },
  newDriverInput: {
    padding: '8px 10px',
    fontSize: 14,
    border: '1px solid #D1D9DD',
    borderRadius: 4,
  },
  newDriverActions: {
    display: 'flex',
    gap: 8,
    justifyContent: 'flex-end',
  },
  searchModeRow: {
    display: 'flex',
    gap: 4,
    marginBottom: 10,
  },
  searchModeButton: {
    padding: '6px 12px',
    fontSize: 12,
    fontWeight: 500,
    background: '#FFFFFF',
    color: '#5A7A82',
    border: '1px solid #D1D9DD',
    borderRadius: 4,
    cursor: 'pointer',
  },
  searchModeActive: {
    padding: '6px 12px',
    fontSize: 12,
    fontWeight: 600,
    background: '#004751',
    color: '#FFFFFF',
    border: '1px solid #004751',
    borderRadius: 4,
    cursor: 'pointer',
  },
  submissionsList: {
    border: '1px solid #E8ECEE',
    borderRadius: 8,
    overflow: 'hidden',
  },
  submissionItemWrapper: {
    borderBottom: '1px solid #E8ECEE',
  },
  submissionItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: '12px 14px',
  },
  submissionInfo: {
    flex: 1,
  },
  submissionNameRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  },
  submissionName: {
    fontWeight: 500,
    color: '#1A2A30',
  },
  fitScoreBadge: {
    padding: '2px 6px',
    borderRadius: 10,
    fontSize: 11,
    fontWeight: 600,
    color: '#FFFFFF',
  },
  submissionMeta: {
    fontSize: 12,
    color: '#5A7A82',
    marginTop: 2,
  },
  submissionLinks: {
    display: 'flex',
    gap: 8,
    marginTop: 6,
    flexWrap: 'wrap',
  },
  fitLinkButton: {
    background: '#004751',
    color: '#FFFFFF',
    border: 'none',
    padding: '4px 10px',
    fontSize: 11,
    fontWeight: 600,
    borderRadius: 4,
    cursor: 'pointer',
  },
  copyLinkButton: {
    background: '#FFFFFF',
    color: '#004751',
    border: '1px solid #004751',
    padding: '4px 10px',
    fontSize: 11,
    fontWeight: 600,
    borderRadius: 4,
    cursor: 'pointer',
  },
  expandButton: {
    background: 'none',
    border: 'none',
    padding: '4px 0',
    fontSize: 12,
    color: '#004751',
    cursor: 'pointer',
    fontWeight: 500,
  },
  submissionActions: {
    display: 'flex',
    gap: 6,
    flexShrink: 0,
  },
  statusSelect: {
    padding: '6px 10px',
    fontSize: 12,
    fontWeight: 500,
    border: 'none',
    borderRadius: 4,
    cursor: 'pointer',
  },
  reasonSelect: {
    padding: '6px 10px',
    fontSize: 12,
    border: '1px solid #D1D9DD',
    borderRadius: 4,
  },
  noSubmissions: {
    padding: 24,
    textAlign: 'center',
    color: '#5A7A82',
    fontSize: 14,
  },
  fitDetails: {
    padding: '0 14px 14px',
    background: '#F8FAFB',
  },
  dimensionsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
    gap: 8,
    marginBottom: 10,
  },
  dimensionItem: {
    background: '#FFFFFF',
    borderRadius: 6,
    padding: 10,
    border: '1px solid #E8ECEE',
  },
  dimensionHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  dimensionName: {
    fontSize: 11,
    fontWeight: 600,
    color: '#1A2A30',
  },
  dimensionScore: {
    fontSize: 13,
    fontWeight: 700,
  },
  dimensionNote: {
    fontSize: 11,
    color: '#5A7A82',
    lineHeight: 1.3,
  },
  recommendation: {
    background: '#FFFFFF',
    borderRadius: 6,
    padding: 12,
    border: '1px solid #E8ECEE',
  },
  recommendationLabel: {
    fontSize: 11,
    fontWeight: 600,
    color: '#5A7A82',
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  recommendationText: {
    fontSize: 13,
    color: '#1A2A30',
    lineHeight: 1.5,
  },
  hubspotLink: {
    fontSize: 11,
    fontWeight: 600,
    color: '#FF7A59',
    textDecoration: 'none',
    padding: '2px 6px',
    background: '#FFF1ED',
    borderRadius: 4,
  },
  fitPreview: {
    marginRight: 10,
    minWidth: 40,
    textAlign: 'center',
  },
  fitLoading: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  fitScorePreview: {
    fontSize: 14,
    fontWeight: 700,
  },
  inlineSelect: {
    padding: '4px 6px',
    fontSize: 12,
    border: '1px solid #004751',
    borderRadius: 4,
    background: '#FFFFFF',
    cursor: 'pointer',
    minWidth: 70,
  },
  editableCell: {
    cursor: 'pointer',
    padding: '2px 6px',
    borderRadius: 4,
  },
  statusBadge: {
    display: 'inline-block',
    padding: '4px 8px',
    fontSize: 11,
    fontWeight: 600,
    borderRadius: 10,
  },
};
