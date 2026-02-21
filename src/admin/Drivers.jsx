import { useState, useEffect } from 'react';
import AdminLayout from './AdminLayout';
import { searchFreeAgents, searchCandidates, createCandidate, parseDocuments, fileToBase64, shortenUrl } from '../lib/api';

const API_BASE = '/api';

const PLACEMENT_STATUSES = [
  'Working and Looking',
  'Unemployed and Looking',
  'Inactive - Lost Contact',
  'Inactive - Happy with Job',
  'Active - Placed with Client',
];

function getPlacementStatusStyle(status) {
  switch (status) {
    case 'Working and Looking':
      return { background: '#FEF3C7', color: '#D97706' };
    case 'Unemployed and Looking':
      return { background: '#FFEDD5', color: '#EA580C' };
    case 'Active - Placed with Client':
      return { background: '#D1FAE5', color: '#059669' };
    case 'Inactive - Lost Contact':
    case 'Inactive - Happy with Job':
      return { background: '#F3F4F6', color: '#6B7280' };
    default:
      return { background: '#E5E7EB', color: '#6B7280' };
  }
}

export default function Drivers() {
  const [drivers, setDrivers] = useState([]);
  const [collaborators, setCollaborators] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedDriver, setSelectedDriver] = useState(null);
  const [showAddDriver, setShowAddDriver] = useState(false);

  // Filters & sorting
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterCDL, setFilterCDL] = useState('');
  const [filterAgent, setFilterAgent] = useState('');
  const [sortBy, setSortBy] = useState('name');
  const [sortDir, setSortDir] = useState('asc');

  // Inline editing
  const [editingCell, setEditingCell] = useState(null); // { uuid, field }
  const [savingCell, setSavingCell] = useState(null);

  useEffect(() => {
    loadDrivers();
    loadCollaborators();
  }, []);

  const loadCollaborators = async () => {
    try {
      const res = await fetch('/api/collaborators');
      const data = await res.json();
      setCollaborators(data.collaborators || []);
    } catch (err) {
      console.error('Failed to load collaborators:', err);
    }
  };

  const loadDrivers = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE}/candidates`);
      if (!response.ok) throw new Error('Failed to load drivers');
      const data = await response.json();
      setDrivers(data.candidates || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Filter drivers
  const filteredDrivers = drivers.filter(d => {
    if (filterStatus && d.placement_status !== filterStatus) return false;
    if (filterCDL && d.cdl_class !== filterCDL) return false;
    if (filterAgent && (d.career_agent?.id || d.career_agent?.email) !== filterAgent) return false;
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const name = (d.fullName || d.name || '').toLowerCase();
      const city = (d.city || '').toLowerCase();
      const state = (d.state || '').toLowerCase();
      if (!name.includes(query) && !city.includes(query) && !state.includes(query)) return false;
    }
    return true;
  });

  // Sort drivers
  const sortedDrivers = [...filteredDrivers].sort((a, b) => {
    let aVal, bVal;
    switch (sortBy) {
      case 'name':
        aVal = (a.fullName || a.name || '').toLowerCase();
        bVal = (b.fullName || b.name || '').toLowerCase();
        break;
      case 'location':
        aVal = `${a.state || ''} ${a.city || ''}`.toLowerCase();
        bVal = `${b.state || ''} ${b.city || ''}`.toLowerCase();
        break;
      case 'experience':
        aVal = a.years_experience || 0;
        bVal = b.years_experience || 0;
        break;
      case 'status':
        aVal = a.placement_status || '';
        bVal = b.placement_status || '';
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

  const handleInlineSave = async (uuid, field, value) => {
    setSavingCell({ uuid, field });
    try {
      const response = await fetch(`${API_BASE}/candidates/${uuid}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [field]: value }),
      });
      if (!response.ok) throw new Error('Save failed');
      // Update local state
      setDrivers(prev => prev.map(d =>
        d.uuid === uuid ? { ...d, [field]: value } : d
      ));
    } catch (err) {
      console.error('Failed to save:', err);
    } finally {
      setSavingCell(null);
      setEditingCell(null);
    }
  };

  const SortHeader = ({ field, children, style = {} }) => (
    <div
      style={{ ...styles.tableCell, ...style, cursor: 'pointer', userSelect: 'none' }}
      onClick={() => handleSort(field)}
    >
      {children} {sortBy === field && (sortDir === 'asc' ? '↑' : '↓')}
    </div>
  );

  if (loading) {
    return (
      <AdminLayout>
        <div style={styles.loading}>Loading drivers...</div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div style={styles.header}>
        <h1 style={styles.title}>Drivers</h1>
        <button onClick={() => setShowAddDriver(true)} style={styles.addButton}>
          + Add Driver
        </button>
      </div>

      {/* Filters */}
      <div style={styles.filters}>
        <input
          type="text"
          placeholder="Search..."
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          style={styles.searchInput}
        />
        <select
          value={filterStatus}
          onChange={e => setFilterStatus(e.target.value)}
          style={styles.filterSelect}
        >
          <option value="">All Statuses</option>
          {PLACEMENT_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <select
          value={filterCDL}
          onChange={e => setFilterCDL(e.target.value)}
          style={styles.filterSelect}
        >
          <option value="">All CDL</option>
          <option value="A">CDL-A</option>
          <option value="B">CDL-B</option>
        </select>
        <select
          value={filterAgent}
          onChange={e => setFilterAgent(e.target.value)}
          style={styles.filterSelect}
        >
          <option value="">All Agents</option>
          {collaborators.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <div style={styles.statChip}>{sortedDrivers.length} drivers</div>
      </div>

      {error && <div style={styles.error}>{error}</div>}

      <div style={styles.table}>
        <div style={styles.tableHeader}>
          <SortHeader field="name" style={{ flex: 1 }}>Name</SortHeader>
          <SortHeader field="location" style={{ width: 140, flex: 'none' }}>Location</SortHeader>
          <SortHeader field="experience" style={{ width: 60, flex: 'none' }}>Exp</SortHeader>
          <div style={{ ...styles.tableCell, width: 140, flex: 'none' }}>Agent</div>
          <SortHeader field="status" style={{ width: 160, flex: 'none' }}>Status</SortHeader>
          <div style={{ ...styles.tableCell, width: 70, flex: 'none' }}>Actions</div>
        </div>

        {sortedDrivers.map(driver => (
          <div key={driver.uuid} style={styles.tableRow}>
            <div style={{ ...styles.tableCell, flex: 1 }}>
              <div style={styles.driverName}>{driver.fullName || driver.name || 'Unknown'}</div>
              <div style={styles.meta}>{driver.email}</div>
            </div>
            <div style={{ ...styles.tableCell, width: 140, flex: 'none' }}>
              {driver.city && driver.state ? `${driver.city}, ${driver.state}` : '-'}
            </div>
            <div style={{ ...styles.tableCell, width: 60, flex: 'none' }}>
              {driver.years_experience ? `${driver.years_experience} yrs` : '-'}
            </div>
            <div
              style={{ ...styles.tableCell, width: 140, flex: 'none', fontSize: 13, color: '#5A7A82', cursor: 'pointer' }}
              onClick={() => setEditingCell({ uuid: driver.uuid, field: 'career_agent' })}
            >
              {editingCell?.uuid === driver.uuid && editingCell?.field === 'career_agent' ? (
                <select
                  autoFocus
                  value={driver.career_agent?.id || ''}
                  onChange={(e) => handleInlineSave(driver.uuid, 'career_agent', e.target.value ? { id: e.target.value } : null)}
                  onBlur={() => setEditingCell(null)}
                  onClick={(e) => e.stopPropagation()}
                  style={styles.inlineSelect}
                  disabled={savingCell?.uuid === driver.uuid}
                >
                  <option value="">Unassigned</option>
                  {collaborators.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              ) : (
                <span style={styles.editableCell}>
                  {driver.career_agent?.name || '-'}
                </span>
              )}
            </div>
            <div
              style={{ ...styles.tableCell, width: 160, flex: 'none', cursor: 'pointer' }}
              onClick={() => setEditingCell({ uuid: driver.uuid, field: 'placement_status' })}
            >
              {editingCell?.uuid === driver.uuid && editingCell?.field === 'placement_status' ? (
                <select
                  autoFocus
                  value={driver.placement_status || ''}
                  onChange={(e) => handleInlineSave(driver.uuid, 'placement_status', e.target.value)}
                  onBlur={() => setEditingCell(null)}
                  onClick={(e) => e.stopPropagation()}
                  style={styles.inlineSelect}
                  disabled={savingCell?.uuid === driver.uuid}
                >
                  <option value="">Not Set</option>
                  {PLACEMENT_STATUSES.map(s => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              ) : (
                <span style={{
                  ...styles.statusBadge,
                  ...getPlacementStatusStyle(driver.placement_status),
                }}>
                  {driver.placement_status || 'Not Set'}
                </span>
              )}
            </div>
            <div style={{ ...styles.tableCell, width: 70, flex: 'none' }}>
              <button
                onClick={() => setSelectedDriver(driver)}
                style={styles.viewButton}
              >
                View
              </button>
            </div>
          </div>
        ))}

        {sortedDrivers.length === 0 && (
          <div style={styles.empty}>
            {searchQuery || filterStatus || filterCDL ? 'No drivers match filters' : 'No drivers with profiles yet'}
          </div>
        )}
      </div>

      {selectedDriver && (
        <DriverModal
          driver={selectedDriver}
          collaborators={collaborators}
          onClose={() => setSelectedDriver(null)}
          onSave={loadDrivers}
        />
      )}

      {showAddDriver && (
        <AddDriverModal
          onClose={() => setShowAddDriver(false)}
          onSuccess={() => {
            setShowAddDriver(false);
            loadDrivers();
          }}
          onSelectExisting={(driver) => {
            setShowAddDriver(false);
            // Find the full driver object from drivers list
            const fullDriver = drivers.find(d => d.uuid === driver.uuid);
            if (fullDriver) setSelectedDriver(fullDriver);
          }}
        />
      )}
    </AdminLayout>
  );
}

function AddDriverModal({ onClose, onSuccess, onSelectExisting }) {
  const [step, setStep] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [freeAgentResults, setFreeAgentResults] = useState([]);
  const [existingDrivers, setExistingDrivers] = useState([]);
  const [searching, setSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [selectedCandidate, setSelectedCandidate] = useState(null);
  const [manualEntry, setManualEntry] = useState(false);
  const [manualForm, setManualForm] = useState({ name: '', email: '', phone: '', city: '', state: '' });
  const [files, setFiles] = useState({
    tenstreet: null,
    mvr: null,
    psp: null,
    clearinghouse: null,
  });
  const [parsing, setParsing] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [shortLinks, setShortLinks] = useState({ record: null, portfolio: null });
  const [shortening, setShortening] = useState(null);

  const handleShorten = async (type, url, title) => {
    setShortening(type);
    try {
      const result = await shortenUrl(url, title);
      setShortLinks(prev => ({ ...prev, [type]: result.shortUrl }));
      navigator.clipboard.writeText(result.shortUrl);
    } catch (err) {
      console.error('Shorten failed:', err);
    } finally {
      setShortening(null);
    }
  };

  const handleSearch = async () => {
    if (searchQuery.length < 2) return;
    setSearching(true);
    setError(null);
    setHasSearched(true);
    try {
      // Search both tables in parallel
      const [freeAgents, candidates] = await Promise.all([
        searchFreeAgents(searchQuery),
        searchCandidates(searchQuery),
      ]);
      setFreeAgentResults(freeAgents);
      setExistingDrivers(candidates);
    } catch (err) {
      setError(err.message);
    } finally {
      setSearching(false);
    }
  };

  const handleSelectCandidate = (candidate) => {
    setSelectedCandidate(candidate);
    setStep(2);
  };

  const handleSelectExisting = (driver) => {
    onClose();
    if (onSelectExisting) onSelectExisting(driver);
  };

  const handleManualEntry = () => {
    setManualEntry(true);
    setManualForm({ ...manualForm, name: searchQuery });
  };

  const handleFileChange = (field, file) => {
    setFiles(prev => ({ ...prev, [field]: file }));
  };

  const handleParse = async () => {
    if (!selectedCandidate) return;
    setParsing(true);
    setError(null);
    try {
      let candidateUuid = selectedCandidate.uuid;

      // Create candidate first (for both free agents and manual entries)
      // This ensures they exist in the Candidates table before parsing
      const created = await createCandidate({
        uuid: selectedCandidate.isManual ? undefined : selectedCandidate.uuid,
        fullName: selectedCandidate.name,
        email: selectedCandidate.email,
        phone: selectedCandidate.phone,
        city: selectedCandidate.city,
        state: selectedCandidate.state,
      });
      candidateUuid = created.uuid;

      const documents = {};
      if (files.tenstreet) documents.tenstreet = await fileToBase64(files.tenstreet);
      if (files.mvr) documents.mvr = await fileToBase64(files.mvr);
      if (files.psp) documents.psp = await fileToBase64(files.psp);
      if (files.clearinghouse) documents.clearinghouse = await fileToBase64(files.clearinghouse);

      if (Object.keys(documents).length === 0) {
        throw new Error('Please upload at least one document');
      }

      const result = await parseDocuments(candidateUuid, documents);
      setResult(result);
      setStep(3);
    } catch (err) {
      setError(err.message);
    } finally {
      setParsing(false);
    }
  };

  return (
    <div style={styles.modalOverlay} onClick={onClose}>
      <div style={styles.addDriverModal} onClick={e => e.stopPropagation()}>
        <div style={styles.modalHeader}>
          <h2 style={styles.modalTitle}>Add Driver</h2>
          <button onClick={onClose} style={styles.closeButton}>×</button>
        </div>

        {/* Progress Steps */}
        <div style={styles.steps}>
          <div style={{ ...styles.stepItem, ...(step >= 1 ? styles.stepActive : {}) }}>
            <span style={styles.stepNumber}>1</span> Search
          </div>
          <div style={styles.stepLine} />
          <div style={{ ...styles.stepItem, ...(step >= 2 ? styles.stepActive : {}) }}>
            <span style={styles.stepNumber}>2</span> Upload
          </div>
          <div style={styles.stepLine} />
          <div style={{ ...styles.stepItem, ...(step >= 3 ? styles.stepActive : {}) }}>
            <span style={styles.stepNumber}>3</span> Done
          </div>
        </div>

        {error && <div style={styles.modalError}>{error}</div>}

        <div style={styles.modalBody}>
          {/* Step 1: Search */}
          {step === 1 && !manualEntry && (
            <>
              <p style={styles.stepDesc}>Find the Free Agent in the system by name.</p>
              <div style={styles.searchRow}>
                <input
                  type="text"
                  placeholder="Enter name..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  style={styles.input}
                />
                <button onClick={handleSearch} disabled={searching} style={styles.button}>
                  {searching ? '...' : 'Search'}
                </button>
              </div>

              {/* Existing Drivers */}
              {existingDrivers.length > 0 && (
                <div style={{ marginTop: 16 }}>
                  <div style={styles.resultSectionLabel}>Already in Drivers:</div>
                  <div style={styles.results}>
                    {existingDrivers.map(d => (
                      <div
                        key={d.uuid}
                        onClick={() => handleSelectExisting(d)}
                        style={{ ...styles.resultItem, background: '#F0FAF0' }}
                      >
                        <div style={styles.resultName}>{d.name}</div>
                        <div style={styles.resultMeta}>
                          {d.location && <span>{d.location}</span>}
                          <span style={{ marginLeft: 8, color: '#059669', fontWeight: 600 }}>View →</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Free Agents */}
              {freeAgentResults.length > 0 && (
                <div style={{ marginTop: 16 }}>
                  <div style={styles.resultSectionLabel}>Free Agents (not yet added):</div>
                  <div style={styles.results}>
                    {freeAgentResults.map(c => (
                      <div
                        key={c.uuid}
                        onClick={() => handleSelectCandidate(c)}
                        style={styles.resultItem}
                      >
                        <div style={styles.resultName}>{c.name}</div>
                        <div style={styles.resultMeta}>
                          {c.location && <span>{c.location}</span>}
                          {c.email && <span> · {c.email}</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* No results - manual entry option */}
              {hasSearched && freeAgentResults.length === 0 && existingDrivers.length === 0 && (
                <div style={styles.noResults}>
                  <p>No results found for "{searchQuery}"</p>
                  <button onClick={handleManualEntry} style={styles.button}>
                    Add Manually
                  </button>
                </div>
              )}
            </>
          )}

          {/* Step 1b: Manual Entry Form */}
          {step === 1 && manualEntry && (
            <>
              <p style={styles.stepDesc}>Enter driver details manually.</p>
              <div style={styles.manualForm}>
                <input
                  type="text"
                  placeholder="Full Name *"
                  value={manualForm.name}
                  onChange={(e) => setManualForm({ ...manualForm, name: e.target.value })}
                  style={styles.input}
                />
                <input
                  type="email"
                  placeholder="Email"
                  value={manualForm.email}
                  onChange={(e) => setManualForm({ ...manualForm, email: e.target.value })}
                  style={styles.input}
                />
                <input
                  type="tel"
                  placeholder="Phone"
                  value={manualForm.phone}
                  onChange={(e) => setManualForm({ ...manualForm, phone: e.target.value })}
                  style={styles.input}
                />
                <div style={{ display: 'flex', gap: 10 }}>
                  <input
                    type="text"
                    placeholder="City"
                    value={manualForm.city}
                    onChange={(e) => setManualForm({ ...manualForm, city: e.target.value })}
                    style={{ ...styles.input, flex: 1 }}
                  />
                  <input
                    type="text"
                    placeholder="State"
                    value={manualForm.state}
                    onChange={(e) => setManualForm({ ...manualForm, state: e.target.value })}
                    style={{ ...styles.input, width: 80 }}
                  />
                </div>
              </div>
              <div style={styles.actions}>
                <button onClick={() => setManualEntry(false)} style={styles.buttonSecondary}>Back</button>
                <button
                  onClick={() => {
                    if (!manualForm.name.trim()) {
                      setError('Name is required');
                      return;
                    }
                    setSelectedCandidate({
                      name: manualForm.name,
                      email: manualForm.email,
                      phone: manualForm.phone,
                      city: manualForm.city,
                      state: manualForm.state,
                      isManual: true,
                    });
                    setStep(2);
                  }}
                  style={styles.button}
                >
                  Continue
                </button>
              </div>
            </>
          )}

          {/* Step 2: Upload */}
          {step === 2 && selectedCandidate && (
            <>
              <p style={styles.stepDesc}>Upload documents for <strong>{selectedCandidate.name}</strong></p>
              <div style={styles.uploadGrid}>
                <FileUpload label="Tenstreet" file={files.tenstreet} onChange={(f) => handleFileChange('tenstreet', f)} />
                <FileUpload label="MVR" file={files.mvr} onChange={(f) => handleFileChange('mvr', f)} />
                <FileUpload label="PSP Report" file={files.psp} onChange={(f) => handleFileChange('psp', f)} />
                <FileUpload label="Clearinghouse" file={files.clearinghouse} onChange={(f) => handleFileChange('clearinghouse', f)} />
              </div>
              <div style={styles.actions}>
                <button onClick={() => setStep(1)} style={styles.buttonSecondary}>Back</button>
                <button onClick={handleParse} disabled={parsing} style={styles.button}>
                  {parsing ? 'Parsing...' : 'Parse & Generate'}
                </button>
              </div>
            </>
          )}

          {/* Step 3: Done */}
          {step === 3 && result && (
            <>
              <div style={styles.successIcon}>✓</div>
              <p style={styles.stepDesc}>Profile created for {selectedCandidate.name}!</p>
              <div style={styles.linkBox}>
                <div style={styles.linkLabel}>Video Recording Link (send to driver):</div>
                <div style={styles.linkValue}>
                  {shortLinks.record || `${window.location.origin}${result.recordUrl}`}
                  <button
                    onClick={() => navigator.clipboard.writeText(shortLinks.record || window.location.origin + result.recordUrl)}
                    style={styles.copyButton}
                  >
                    Copy
                  </button>
                  {!shortLinks.record && (
                    <button
                      onClick={() => handleShorten('record', window.location.origin + result.recordUrl, `Record Story - ${selectedCandidate.name}`)}
                      disabled={shortening === 'record'}
                      style={{ ...styles.copyButton, background: '#059669' }}
                    >
                      {shortening === 'record' ? '...' : 'Shorten'}
                    </button>
                  )}
                </div>
              </div>
              <div style={styles.linkBox}>
                <div style={styles.linkLabel}>Portfolio URL:</div>
                <div style={styles.linkValue}>
                  {shortLinks.portfolio || `${window.location.origin}${result.portfolioUrl}`}
                  <button
                    onClick={() => navigator.clipboard.writeText(shortLinks.portfolio || window.location.origin + result.portfolioUrl)}
                    style={styles.copyButton}
                  >
                    Copy
                  </button>
                  {!shortLinks.portfolio && (
                    <button
                      onClick={() => handleShorten('portfolio', window.location.origin + result.portfolioUrl, `Portfolio - ${selectedCandidate.name}`)}
                      disabled={shortening === 'portfolio'}
                      style={{ ...styles.copyButton, background: '#059669' }}
                    >
                      {shortening === 'portfolio' ? '...' : 'Shorten'}
                    </button>
                  )}
                </div>
              </div>
              <div style={styles.actions}>
                <button onClick={onSuccess} style={styles.button}>Done</button>
                <a href={result.portfolioUrl} target="_blank" rel="noopener noreferrer" style={styles.buttonSecondary}>
                  View Profile
                </a>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function FileUpload({ label, file, onChange }) {
  const [isDragging, setIsDragging] = useState(false);

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const droppedFile = e.dataTransfer.files?.[0];
    if (droppedFile?.type === 'application/pdf') onChange(droppedFile);
  };

  return (
    <div style={styles.uploadBox}>
      <div style={styles.uploadLabel}>{label}</div>
      <label
        style={{ ...styles.uploadArea, ...(isDragging ? styles.uploadAreaDragging : {}) }}
        onDragOver={e => e.preventDefault()}
        onDragEnter={() => setIsDragging(true)}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
      >
        <input type="file" accept=".pdf" onChange={e => e.target.files?.[0] && onChange(e.target.files[0])} style={{ display: 'none' }} />
        {file ? (
          <div style={styles.uploadedFile}>
            <span>{file.name}</span>
            <button onClick={(e) => { e.preventDefault(); onChange(null); }} style={styles.removeFile}>×</button>
          </div>
        ) : (
          <div style={styles.uploadPlaceholder}>{isDragging ? 'Drop here' : 'Click or drag PDF'}</div>
        )}
      </label>
    </div>
  );
}

function DriverModal({ driver, collaborators, onClose, onSave }) {
  const [editing, setEditing] = useState(false);
  const [formData, setFormData] = useState({ ...driver });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [shortening, setShortening] = useState(null); // 'record' | 'portfolio' | null
  const [shortLinks, setShortLinks] = useState({});

  const handleShorten = async (type) => {
    setShortening(type);
    try {
      const baseUrl = window.location.origin;
      let url, title;
      if (type === 'record') {
        url = `${baseUrl}/record/${driver.uuid}`;
        title = `Record Story - ${driver.fullName || driver.name}`;
      } else {
        url = `${baseUrl}/portfolio/${driver.portfolio_slug}`;
        title = `Portfolio - ${driver.fullName || driver.name}`;
      }
      const result = await shortenUrl(url, title);
      setShortLinks(prev => ({ ...prev, [type]: result.shortUrl }));
      navigator.clipboard.writeText(result.shortUrl);
      alert(`Short link copied: ${result.shortUrl}`);
    } catch (err) {
      alert(`Failed to shorten: ${err.message}`);
    } finally {
      setShortening(null);
    }
  };

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      const response = await fetch(`${API_BASE}/candidates/${driver.uuid}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || 'Save failed');
      }
      setEditing(false);
      onSave();
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const fields = [
    { key: 'fullName', label: 'Full Name', type: 'text' },
    { key: 'email', label: 'Email', type: 'text' },
    { key: 'phone', label: 'Phone', type: 'text' },
    { key: 'city', label: 'City', type: 'text' },
    { key: 'state', label: 'State', type: 'text' },
    { key: 'zipcode', label: 'Zip Code', type: 'text' },
    { key: 'cdl_class', label: 'CDL Class', type: 'select', options: ['A', 'B'] },
    { key: 'years_experience', label: 'Years Experience', type: 'number' },
    { key: 'endorsements', label: 'Endorsements', type: 'text', placeholder: 'H, T, N, X' },
    { key: 'home_time_preference', label: 'Home Time Preference', type: 'select', options: ['Daily', 'Weekly', 'OTR', 'Flexible'] },
    { key: 'min_weekly_pay', label: 'Min Weekly Pay', type: 'number' },
    { key: 'target_weekly_pay', label: 'Target Weekly Pay', type: 'number' },
    { key: 'willing_touch_freight', label: 'Willing Touch Freight', type: 'checkbox' },
    { key: 'mvr_status', label: 'MVR Status', type: 'select', options: ['Clear', 'Has Violations'] },
    { key: 'mvr_violations_3yr', label: 'MVR Violations (3yr)', type: 'number' },
    { key: 'mvr_accidents_3yr', label: 'MVR Accidents (3yr)', type: 'number' },
    { key: 'clearinghouse_status', label: 'Clearinghouse', type: 'select', options: ['Not Prohibited', 'Prohibited'] },
    { key: 'placement_status', label: 'Placement Status', type: 'select', options: PLACEMENT_STATUSES },
    { key: 'career_agent', label: 'Career Agent', type: 'collaborator' },
    { key: 'portfolio_slug', label: 'Portfolio Slug', type: 'text' },
    { key: 'portfolio_published', label: 'Published', type: 'checkbox' },
  ];

  const storyFields = [
    { key: 'story_who_are_you', label: 'Who Are You?' },
    { key: 'story_what_is_your_why', label: 'What Is Your Why?' },
    { key: 'story_freeworld_journey', label: 'FreeWorld Journey' },
    { key: 'story_why_trucking', label: 'Why Trucking?' },
    { key: 'story_looking_for', label: 'What Are You Looking For?' },
    { key: 'story_what_others_say', label: 'What Others Say' },
  ];

  return (
    <div style={styles.modalOverlay} onClick={onClose}>
      <div style={styles.modal} onClick={e => e.stopPropagation()}>
        <div style={styles.modalHeader}>
          <div>
            <h2 style={styles.modalTitle}>{driver.fullName || driver.name || 'Driver'}</h2>
            <div style={styles.modalSubtitle}>
              {driver.city}, {driver.state} · {driver.cdl_class ? `CDL-${driver.cdl_class}` : 'No CDL'}
            </div>
          </div>
          <div style={styles.modalActions}>
            {!editing ? (
              <button onClick={() => setEditing(true)} style={styles.editButton}>Edit</button>
            ) : (
              <>
                <button onClick={() => setEditing(false)} style={styles.cancelButton}>Cancel</button>
                <button onClick={handleSave} disabled={saving} style={styles.saveButton}>
                  {saving ? 'Saving...' : 'Save'}
                </button>
              </>
            )}
            <button onClick={onClose} style={styles.closeButton}>×</button>
          </div>
        </div>

        {error && <div style={styles.modalError}>{error}</div>}

        <div style={styles.modalBody}>
          <div style={styles.section}>
            <h3 style={styles.sectionTitle}>Basic Info</h3>
            <div style={styles.fieldsGrid}>
              {fields.map(field => (
                <div key={field.key} style={styles.fieldItem}>
                  <label style={styles.fieldLabel}>{field.label}</label>
                  {editing ? (
                    field.type === 'collaborator' ? (
                      <select
                        value={formData[field.key]?.id || formData[field.key]?.email || ''}
                        onChange={e => handleChange(field.key, e.target.value ? { id: e.target.value } : null)}
                        style={styles.fieldInput}
                      >
                        <option value="">Unassigned</option>
                        {collaborators.map(c => (
                          <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                      </select>
                    ) : field.type === 'select' ? (
                      <select
                        value={formData[field.key] || ''}
                        onChange={e => handleChange(field.key, e.target.value)}
                        style={styles.fieldInput}
                      >
                        <option value="">--</option>
                        {field.options.map(opt => (
                          <option key={opt} value={opt}>{opt}</option>
                        ))}
                      </select>
                    ) : field.type === 'checkbox' ? (
                      <input
                        type="checkbox"
                        checked={formData[field.key] || false}
                        onChange={e => handleChange(field.key, e.target.checked)}
                      />
                    ) : (
                      <input
                        type={field.type}
                        value={formData[field.key] || ''}
                        onChange={e => handleChange(field.key, field.type === 'number' ? Number(e.target.value) : e.target.value)}
                        placeholder={field.placeholder}
                        style={styles.fieldInput}
                      />
                    )
                  ) : (
                    <div style={styles.fieldValue}>
                      {field.type === 'collaborator'
                        ? (formData[field.key]?.name || formData[field.key]?.email || '-')
                        : field.type === 'checkbox'
                        ? (formData[field.key] ? 'Yes' : 'No')
                        : (formData[field.key] || '-')}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div style={styles.section}>
            <h3 style={styles.sectionTitle}>Story</h3>
            <div style={styles.storyFields}>
              {storyFields.map(field => (
                <div key={field.key} style={styles.storyField}>
                  <label style={styles.fieldLabel}>{field.label}</label>
                  {editing ? (
                    <textarea
                      value={formData[field.key] || ''}
                      onChange={e => handleChange(field.key, e.target.value)}
                      style={styles.textarea}
                      rows={3}
                    />
                  ) : (
                    <div style={styles.storyValue}>
                      {formData[field.key] || '-'}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Video Recording Section */}
          <div style={styles.section}>
            <h3 style={styles.sectionTitle}>Video Story</h3>
            <div style={styles.videoSection}>
              <div style={styles.videoStatus}>
                <span style={styles.fieldLabel}>Status:</span>
                <span style={{
                  ...styles.statusBadge,
                  background: driver.video_status === 'complete' ? '#D1FAE5' :
                             driver.video_status === 'processing' ? '#FEF3C7' :
                             driver.video_status === 'recording' ? '#DBEAFE' : '#F3F4F6',
                  color: driver.video_status === 'complete' ? '#059669' :
                         driver.video_status === 'processing' ? '#D97706' :
                         driver.video_status === 'recording' ? '#2563EB' : '#6B7280',
                }}>
                  {driver.video_status || 'Not Started'}
                </span>
              </div>
              <div style={styles.videoActions}>
                <button
                  onClick={() => handleShorten('record')}
                  disabled={shortening === 'record'}
                  style={styles.videoButton}
                >
                  {shortening === 'record' ? 'Shortening...' : shortLinks.record ? 'Copy Again' : 'Get Short Link'}
                </button>
                {shortLinks.record && (
                  <span style={styles.shortLinkDisplay}>{shortLinks.record}</span>
                )}
                <a
                  href={`/record/${driver.uuid}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={styles.videoButtonSecondary}
                >
                  Open Recorder
                </a>
              </div>
              {driver.video_url && (
                <div style={styles.videoPreview}>
                  <a href={driver.video_url} target="_blank" rel="noopener noreferrer">
                    View Final Video →
                  </a>
                </div>
              )}
            </div>
          </div>

          {driver.portfolio_slug && (
            <div style={styles.portfolioLink}>
              <a href={`/portfolio/${driver.portfolio_slug}`} target="_blank" rel="noopener noreferrer">
                View Portfolio →
              </a>
              <button
                onClick={() => handleShorten('portfolio')}
                disabled={shortening === 'portfolio'}
                style={{ ...styles.videoButton, marginLeft: 12 }}
              >
                {shortening === 'portfolio' ? '...' : 'Get Short Link'}
              </button>
              {shortLinks.portfolio && (
                <span style={styles.shortLinkDisplay}>{shortLinks.portfolio}</span>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
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
  headerActions: {
    display: 'flex',
    alignItems: 'center',
    gap: 16,
  },
  searchInput: {
    padding: '8px 14px',
    fontSize: 14,
    border: '1px solid #D1D9DD',
    borderRadius: 6,
    width: 200,
  },
  addButton: {
    padding: '8px 16px',
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
  statChip: {
    padding: '6px 12px',
    fontSize: 13,
    fontWeight: 600,
    background: '#E8ECEE',
    color: '#004751',
    borderRadius: 16,
    marginLeft: 'auto',
  },
  stat: {
    textAlign: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: 700,
    color: '#004751',
  },
  statLabel: {
    fontSize: 12,
    color: '#5A7A82',
    textTransform: 'uppercase',
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
    fontSize: 12,
    fontWeight: 600,
    color: '#5A7A82',
    textTransform: 'uppercase',
  },
  tableRow: {
    display: 'flex',
    padding: '16px',
    borderBottom: '1px solid #E8ECEE',
    alignItems: 'center',
  },
  tableCell: {
    flex: 1,
    paddingRight: 16,
  },
  driverName: {
    fontWeight: 600,
    color: '#004751',
    fontSize: 15,
  },
  meta: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  cdlBadge: {
    background: '#004751',
    color: '#FFFFFF',
    padding: '2px 8px',
    borderRadius: 4,
    fontSize: 12,
    fontWeight: 600,
  },
  statusBadge: {
    padding: '4px 10px',
    borderRadius: 12,
    fontSize: 12,
    fontWeight: 500,
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
    maxWidth: 800,
    maxHeight: '90vh',
    overflow: 'auto',
  },
  addDriverModal: {
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
    zIndex: 1,
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
  modalActions: {
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
  modalError: {
    background: '#FEF2F2',
    color: '#DC2626',
    padding: '12px 16px',
    fontSize: 14,
  },
  modalBody: {
    padding: 24,
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    margin: '0 0 16px',
    fontSize: 16,
    fontWeight: 600,
    color: '#1A2A30',
    paddingBottom: 8,
    borderBottom: '1px solid #E8ECEE',
  },
  fieldsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: 16,
  },
  fieldItem: {
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: 600,
    color: '#5A7A82',
  },
  fieldValue: {
    fontSize: 14,
    color: '#1A2A30',
  },
  fieldInput: {
    padding: '6px 10px',
    fontSize: 14,
    border: '1px solid #D1D9DD',
    borderRadius: 4,
  },
  storyFields: {
    display: 'flex',
    flexDirection: 'column',
    gap: 16,
  },
  storyField: {
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
  },
  storyValue: {
    fontSize: 14,
    color: '#1A2A30',
    lineHeight: 1.5,
    whiteSpace: 'pre-wrap',
  },
  textarea: {
    padding: '8px 10px',
    fontSize: 14,
    border: '1px solid #D1D9DD',
    borderRadius: 4,
    resize: 'vertical',
    fontFamily: 'inherit',
  },
  portfolioLink: {
    padding: 16,
    background: '#F8FAFB',
    borderRadius: 8,
    textAlign: 'center',
  },
  videoSection: {
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
  },
  videoStatus: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
  },
  videoActions: {
    display: 'flex',
    gap: 10,
    flexWrap: 'wrap',
  },
  videoButton: {
    padding: '8px 16px',
    fontSize: 13,
    fontWeight: 600,
    background: '#004751',
    color: '#FFFFFF',
    border: 'none',
    borderRadius: 6,
    cursor: 'pointer',
  },
  videoButtonSecondary: {
    padding: '8px 16px',
    fontSize: 13,
    fontWeight: 600,
    background: '#FFFFFF',
    color: '#004751',
    border: '1px solid #004751',
    borderRadius: 6,
    cursor: 'pointer',
    textDecoration: 'none',
  },
  videoPreview: {
    padding: 12,
    background: '#D1FAE5',
    borderRadius: 6,
    textAlign: 'center',
  },
  // Add Driver Modal styles
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
    maxWidth: 40,
  },
  stepDesc: {
    margin: '0 0 20px',
    fontSize: 14,
    color: '#5A7A82',
  },
  searchRow: {
    display: 'flex',
    gap: 10,
  },
  input: {
    flex: 1,
    padding: '10px 14px',
    fontSize: 14,
    border: '1px solid #D1D9DD',
    borderRadius: 6,
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
    border: '1px solid #004751',
    borderRadius: 6,
    cursor: 'pointer',
    textDecoration: 'none',
  },
  results: {
    marginTop: 8,
    border: '1px solid #E8ECEE',
    borderRadius: 6,
    overflow: 'hidden',
  },
  resultSectionLabel: {
    fontSize: 12,
    fontWeight: 600,
    color: '#5A7A82',
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  resultItem: {
    padding: '10px 14px',
    cursor: 'pointer',
    borderBottom: '1px solid #E8ECEE',
    background: '#FFFFFF',
  },
  noResults: {
    marginTop: 20,
    padding: 20,
    textAlign: 'center',
    background: '#F8FAFB',
    borderRadius: 8,
  },
  manualForm: {
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
    marginBottom: 16,
  },
  resultName: {
    fontWeight: 600,
    color: '#1A2A30',
    fontSize: 14,
  },
  resultMeta: {
    fontSize: 12,
    color: '#5A7A82',
  },
  uploadGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: 12,
    marginBottom: 20,
  },
  uploadBox: {},
  uploadLabel: {
    fontSize: 13,
    fontWeight: 600,
    color: '#1A2A30',
    marginBottom: 6,
  },
  uploadArea: {
    display: 'block',
    padding: 16,
    border: '2px dashed #D1D9DD',
    borderRadius: 6,
    cursor: 'pointer',
    textAlign: 'center',
  },
  uploadAreaDragging: {
    borderColor: '#004751',
    background: '#F0F9FA',
  },
  uploadPlaceholder: {
    fontSize: 13,
    color: '#5A7A82',
  },
  uploadedFile: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    fontSize: 13,
    color: '#004751',
  },
  removeFile: {
    background: 'none',
    border: 'none',
    fontSize: 18,
    color: '#9CA3AF',
    cursor: 'pointer',
  },
  actions: {
    display: 'flex',
    gap: 10,
    justifyContent: 'flex-end',
  },
  successIcon: {
    width: 56,
    height: 56,
    borderRadius: '50%',
    background: '#D1FAE5',
    color: '#059669',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 28,
    fontWeight: 700,
    margin: '0 auto 12px',
  },
  linkBox: {
    background: '#F8FAFB',
    borderRadius: 6,
    padding: 12,
    marginBottom: 12,
  },
  linkLabel: {
    fontSize: 11,
    fontWeight: 600,
    color: '#5A7A82',
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  linkValue: {
    fontSize: 13,
    color: '#004751',
    fontFamily: 'monospace',
    wordBreak: 'break-all',
    display: 'flex',
    alignItems: 'center',
    gap: 10,
  },
  copyButton: {
    padding: '4px 10px',
    fontSize: 11,
    fontWeight: 600,
    background: '#004751',
    color: '#FFFFFF',
    border: 'none',
    borderRadius: 4,
    cursor: 'pointer',
    flexShrink: 0,
  },
  inlineSelect: {
    width: '100%',
    padding: '4px 6px',
    fontSize: 12,
    border: '1px solid #004751',
    borderRadius: 4,
    background: '#FFFFFF',
    cursor: 'pointer',
  },
  editableCell: {
    display: 'inline-block',
    padding: '2px 4px',
    borderRadius: 4,
    transition: 'background 0.15s',
  },
  shortLinkDisplay: {
    fontSize: 12,
    color: '#059669',
    fontFamily: 'monospace',
    background: '#D1FAE5',
    padding: '4px 8px',
    borderRadius: 4,
    marginLeft: 8,
  },
};
