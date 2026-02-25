import { useState, useEffect } from 'react';
import AdminLayout from './AdminLayout';
import { listEmployers, searchHubSpotCompanies, getHubSpotCompany, createEmployer, updateEmployer } from '../lib/api';

const AIRTABLE_BASE_ID = 'appjZUryTUrvwToXE';
const AIRTABLE_EMPLOYERS_TABLE = 'tbl9bxGlAKtQfnPhY';

function getLifecycleStyle(stage) {
  switch (stage) {
    case 'customer':
      return { background: '#D1FAE5', color: '#059669' };
    case 'opportunity':
      return { background: '#FEF3C7', color: '#D97706' };
    default:
      return { background: '#E5E7EB', color: '#6B7280' };
  }
}

function getEnrichmentStyle(tier) {
  if (!tier) return { background: '#F3F4F6', color: '#9CA3AF' };
  if (tier.includes('Level 6')) return { background: '#EDE9FE', color: '#7C3AED' };
  if (tier.includes('Level 5')) return { background: '#D1FAE5', color: '#059669' };
  if (tier.includes('Level 4')) return { background: '#CCFBF1', color: '#0D9488' };
  if (tier.includes('Level 3')) return { background: '#CFFAFE', color: '#0891B2' };
  if (tier.includes('Level 2')) return { background: '#DBEAFE', color: '#2563EB' };
  return { background: '#F3F4F6', color: '#6B7280' };
}

export default function Employers() {
  const [employers, setEmployers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingEmployer, setEditingEmployer] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadEmployers();
  }, []);

  const loadEmployers = async () => {
    try {
      setLoading(true);
      const data = await listEmployers();
      setEmployers(data || []);
    } catch (err) {
      console.error('Failed to load employers:', err);
    } finally {
      setLoading(false);
    }
  };

  const filteredEmployers = employers.filter(e => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      (e.name || '').toLowerCase().includes(query) ||
      (e.city || '').toLowerCase().includes(query) ||
      (e.state || '').toLowerCase().includes(query)
    );
  });

  if (loading) {
    return (
      <AdminLayout>
        <div style={styles.loading}>Loading employers...</div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div style={styles.header}>
        <h1 style={styles.title}>Employers</h1>
        <div style={styles.headerButtons}>
          <a
            href={`https://airtable.com/${AIRTABLE_BASE_ID}/${AIRTABLE_EMPLOYERS_TABLE}`}
            target="_blank"
            rel="noopener noreferrer"
            style={styles.airtableLink}
          >
            View in Airtable
          </a>
          <button onClick={() => setShowAddModal(true)} style={styles.addButton}>
            + Add Employer
          </button>
        </div>
      </div>

      <div style={styles.filters}>
        <input
          type="text"
          placeholder="Search employers..."
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          style={styles.searchInput}
        />
        <span style={styles.count}>{filteredEmployers.length} employers</span>
      </div>

      <div style={styles.table}>
        <div style={styles.tableHeader}>
          <div style={styles.tableHeaderCell}>Company</div>
          <div style={styles.tableHeaderCell}>Location</div>
          <div style={styles.tableHeaderCell}>Stage</div>
          <div style={styles.tableHeaderCell}>Enrichment</div>
          <div style={styles.tableHeaderCell}>Main Contact</div>
          <div style={styles.tableHeaderCell}>Actions</div>
        </div>

        {filteredEmployers.map(employer => (
          <div key={employer.id} style={styles.tableRow}>
            <div style={styles.tableCell}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={styles.companyName}>{employer.name}</span>
                {employer.hubspot_company_id && (
                  <a
                    href={`https://app.hubspot.com/contacts/47971120/company/${employer.hubspot_company_id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={styles.hubspotLink}
                    onClick={e => e.stopPropagation()}
                  >
                    HubSpot
                  </a>
                )}
              </div>
              {employer.domain && (
                <div style={styles.domain}>{employer.domain}</div>
              )}
            </div>
            <div style={styles.tableCell}>
              {[employer.city, employer.state].filter(Boolean).join(', ') || '-'}
            </div>
            <div style={styles.tableCell}>
              <span style={{ ...styles.badge, ...getLifecycleStyle(employer.lifecycle_stage) }}>
                {employer.lifecycle_stage || '-'}
              </span>
            </div>
            <div style={styles.tableCell}>
              {employer.employer_enrichment_tier ? (
                <span style={{ ...styles.badge, ...getEnrichmentStyle(employer.employer_enrichment_tier) }}>
                  {employer.employer_enrichment_tier.replace('Level ', 'L')}
                </span>
              ) : '-'}
            </div>
            <div style={styles.tableCell}>
              {employer.main_contact_name ? (
                <div>
                  <div style={styles.contactName}>{employer.main_contact_name}</div>
                  {employer.main_contact_email && (
                    <div style={styles.contactEmail}>{employer.main_contact_email}</div>
                  )}
                </div>
              ) : '-'}
            </div>
            <div style={styles.tableCell}>
              <button
                onClick={() => setEditingEmployer(employer)}
                style={styles.editButton}
              >
                Edit
              </button>
            </div>
          </div>
        ))}

        {filteredEmployers.length === 0 && (
          <div style={styles.empty}>
            No employers found. Click "Add Employer" to import from HubSpot.
          </div>
        )}
      </div>

      {showAddModal && (
        <AddEmployerModal
          onClose={() => setShowAddModal(false)}
          onAdded={() => {
            setShowAddModal(false);
            loadEmployers();
          }}
        />
      )}

      {editingEmployer && (
        <EditEmployerModal
          employer={editingEmployer}
          onClose={() => setEditingEmployer(null)}
          onSaved={() => {
            setEditingEmployer(null);
            loadEmployers();
          }}
        />
      )}
    </AdminLayout>
  );
}

function AddEmployerModal({ onClose, onAdded }) {
  const [step, setStep] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState(null);
  const [companyDetails, setCompanyDetails] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSearch = async () => {
    if (searchQuery.length < 2) return;
    setSearching(true);
    setError(null);
    try {
      const results = await searchHubSpotCompanies(searchQuery);
      setSearchResults(results);
    } catch (err) {
      setError('Search failed: ' + err.message);
    } finally {
      setSearching(false);
    }
  };

  const handleSelect = async (company) => {
    setSelectedCompany(company);
    setLoading(true);
    setError(null);
    try {
      const details = await getHubSpotCompany(company.hubspot_company_id);
      setCompanyDetails(details);
      setStep(2);
    } catch (err) {
      setError('Failed to load company details: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = {
        hubspot_company_id: companyDetails.hubspot_company_id,
        hubspot_parent_company_id: companyDetails.hubspot_parent_company_id,
        name: companyDetails.name,
        domain: companyDetails.domain,
        phone: companyDetails.phone,
        zip: companyDetails.zip,
        city: companyDetails.city,
        state: companyDetails.state,
        lifecycle_stage: companyDetails.lifecycle_stage,
        employer_enrichment_tier: companyDetails.employer_enrichment_tier,
        main_contact_name: companyDetails.main_contact?.name,
        main_contact_email: companyDetails.main_contact?.email,
        main_contact_phone: companyDetails.main_contact?.phone,
        main_contact_mobile: companyDetails.main_contact?.mobile,
      };
      const result = await createEmployer(data);
      if (result.already_existed) {
        setError('This employer already exists in CAP.');
      } else {
        onAdded();
      }
    } catch (err) {
      setError('Failed to create employer: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.modalOverlay} onClick={onClose}>
      <div style={styles.modal} onClick={e => e.stopPropagation()}>
        <div style={styles.modalHeader}>
          <h2 style={styles.modalTitle}>
            {step === 1 ? 'Search HubSpot Companies' : 'Confirm Employer'}
          </h2>
          <button onClick={onClose} style={styles.closeButton}>x</button>
        </div>

        {error && <div style={styles.error}>{error}</div>}

        {step === 1 && (
          <div style={styles.modalBody}>
            <div style={styles.searchRow}>
              <input
                type="text"
                placeholder="Search by company name..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSearch()}
                style={styles.modalInput}
                autoFocus
              />
              <button
                onClick={handleSearch}
                disabled={searching || searchQuery.length < 2}
                style={styles.searchButton}
              >
                {searching ? 'Searching...' : 'Search'}
              </button>
            </div>

            <div style={styles.hint}>
              Searching companies in Employer Partnerships team (customer/opportunity only)
            </div>

            <div style={styles.resultsList}>
              {searchResults.map(company => (
                <div
                  key={company.hubspot_company_id}
                  style={styles.resultItem}
                  onClick={() => handleSelect(company)}
                >
                  <div style={styles.resultName}>{company.name}</div>
                  <div style={styles.resultMeta}>
                    {[company.city, company.state].filter(Boolean).join(', ')}
                    {company.lifecycle_stage && (
                      <span style={{ ...styles.badge, ...getLifecycleStyle(company.lifecycle_stage), marginLeft: 8 }}>
                        {company.lifecycle_stage}
                      </span>
                    )}
                  </div>
                </div>
              ))}
              {searchResults.length === 0 && searchQuery && !searching && (
                <div style={styles.noResults}>No companies found</div>
              )}
            </div>
          </div>
        )}

        {step === 2 && companyDetails && (
          <div style={styles.modalBody}>
            <div style={styles.detailSection}>
              <h3 style={styles.sectionTitle}>Company Info</h3>
              <div style={styles.detailGrid}>
                <div style={styles.detailRow}>
                  <span style={styles.detailLabel}>Name:</span>
                  <span style={styles.detailValue}>{companyDetails.name}</span>
                </div>
                <div style={styles.detailRow}>
                  <span style={styles.detailLabel}>Domain:</span>
                  <span style={styles.detailValue}>{companyDetails.domain || '-'}</span>
                </div>
                <div style={styles.detailRow}>
                  <span style={styles.detailLabel}>Phone:</span>
                  <span style={styles.detailValue}>{companyDetails.phone || '-'}</span>
                </div>
                <div style={styles.detailRow}>
                  <span style={styles.detailLabel}>Location:</span>
                  <span style={styles.detailValue}>
                    {[companyDetails.city, companyDetails.state, companyDetails.zip].filter(Boolean).join(', ') || '-'}
                  </span>
                </div>
                <div style={styles.detailRow}>
                  <span style={styles.detailLabel}>Stage:</span>
                  <span style={{ ...styles.badge, ...getLifecycleStyle(companyDetails.lifecycle_stage) }}>
                    {companyDetails.lifecycle_stage || '-'}
                  </span>
                </div>
                <div style={styles.detailRow}>
                  <span style={styles.detailLabel}>Enrichment:</span>
                  <span style={styles.detailValue}>{companyDetails.employer_enrichment_tier || '-'}</span>
                </div>
              </div>
            </div>

            {companyDetails.main_contact && (
              <div style={styles.detailSection}>
                <h3 style={styles.sectionTitle}>Main Contact</h3>
                <div style={styles.detailGrid}>
                  <div style={styles.detailRow}>
                    <span style={styles.detailLabel}>Name:</span>
                    <span style={styles.detailValue}>{companyDetails.main_contact.name}</span>
                  </div>
                  <div style={styles.detailRow}>
                    <span style={styles.detailLabel}>Title:</span>
                    <span style={styles.detailValue}>{companyDetails.main_contact.title || '-'}</span>
                  </div>
                  <div style={styles.detailRow}>
                    <span style={styles.detailLabel}>Email:</span>
                    <span style={styles.detailValue}>{companyDetails.main_contact.email || '-'}</span>
                  </div>
                  <div style={styles.detailRow}>
                    <span style={styles.detailLabel}>Phone:</span>
                    <span style={styles.detailValue}>{companyDetails.main_contact.phone || '-'}</span>
                  </div>
                  <div style={styles.detailRow}>
                    <span style={styles.detailLabel}>Mobile:</span>
                    <span style={styles.detailValue}>{companyDetails.main_contact.mobile || '-'}</span>
                  </div>
                </div>
              </div>
            )}

            <div style={styles.modalActions}>
              <button onClick={() => setStep(1)} style={styles.backButton}>
                Back
              </button>
              <button onClick={handleCreate} disabled={loading} style={styles.createButton}>
                {loading ? 'Creating...' : 'Add to CAP'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function EditEmployerModal({ employer, onClose, onSaved }) {
  const [form, setForm] = useState({
    name: employer.name || '',
    domain: employer.domain || '',
    phone: employer.phone || '',
    city: employer.city || '',
    state: employer.state || '',
    zip: employer.zip || '',
    lifecycle_stage: employer.lifecycle_stage || '',
    main_contact_name: employer.main_contact_name || '',
    main_contact_email: employer.main_contact_email || '',
    main_contact_phone: employer.main_contact_phone || '',
    main_contact_mobile: employer.main_contact_mobile || '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const handleChange = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      await updateEmployer(employer.id, form);
      onSaved();
    } catch (err) {
      setError('Failed to save: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={styles.modalOverlay} onClick={onClose}>
      <div style={styles.modal} onClick={e => e.stopPropagation()}>
        <div style={styles.modalHeader}>
          <h2 style={styles.modalTitle}>Edit Employer</h2>
          <button onClick={onClose} style={styles.closeButton}>x</button>
        </div>

        {error && <div style={styles.error}>{error}</div>}

        <div style={styles.modalBody}>
          <div style={styles.formSection}>
            <h3 style={styles.sectionTitle}>Company Info</h3>
            <div style={styles.formGrid}>
              <div style={styles.formRow}>
                <label style={styles.formLabel}>Name</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={e => handleChange('name', e.target.value)}
                  style={styles.formInput}
                />
              </div>
              <div style={styles.formRow}>
                <label style={styles.formLabel}>Domain</label>
                <input
                  type="text"
                  value={form.domain}
                  onChange={e => handleChange('domain', e.target.value)}
                  style={styles.formInput}
                />
              </div>
              <div style={styles.formRow}>
                <label style={styles.formLabel}>Phone</label>
                <input
                  type="text"
                  value={form.phone}
                  onChange={e => handleChange('phone', e.target.value)}
                  style={styles.formInput}
                />
              </div>
              <div style={styles.formRowThird}>
                <div>
                  <label style={styles.formLabel}>City</label>
                  <input
                    type="text"
                    value={form.city}
                    onChange={e => handleChange('city', e.target.value)}
                    style={styles.formInput}
                  />
                </div>
                <div>
                  <label style={styles.formLabel}>State</label>
                  <input
                    type="text"
                    value={form.state}
                    onChange={e => handleChange('state', e.target.value)}
                    style={styles.formInput}
                  />
                </div>
                <div>
                  <label style={styles.formLabel}>ZIP</label>
                  <input
                    type="text"
                    value={form.zip}
                    onChange={e => handleChange('zip', e.target.value)}
                    style={styles.formInput}
                  />
                </div>
              </div>
              <div style={styles.formRow}>
                <label style={styles.formLabel}>Lifecycle Stage</label>
                <select
                  value={form.lifecycle_stage}
                  onChange={e => handleChange('lifecycle_stage', e.target.value)}
                  style={styles.formInput}
                >
                  <option value="">-</option>
                  <option value="subscriber">Subscriber</option>
                  <option value="lead">Lead</option>
                  <option value="marketingqualifiedlead">Marketing Qualified Lead</option>
                  <option value="salesqualifiedlead">Sales Qualified Lead</option>
                  <option value="opportunity">Opportunity</option>
                  <option value="customer">Customer</option>
                  <option value="evangelist">Evangelist</option>
                  <option value="other">Other</option>
                </select>
              </div>
            </div>
          </div>

          <div style={styles.formSection}>
            <h3 style={styles.sectionTitle}>Main Contact</h3>
            <div style={styles.formGrid}>
              <div style={styles.formRow}>
                <label style={styles.formLabel}>Name</label>
                <input
                  type="text"
                  value={form.main_contact_name}
                  onChange={e => handleChange('main_contact_name', e.target.value)}
                  style={styles.formInput}
                />
              </div>
              <div style={styles.formRow}>
                <label style={styles.formLabel}>Email</label>
                <input
                  type="email"
                  value={form.main_contact_email}
                  onChange={e => handleChange('main_contact_email', e.target.value)}
                  style={styles.formInput}
                />
              </div>
              <div style={styles.formRowHalf}>
                <div>
                  <label style={styles.formLabel}>Phone</label>
                  <input
                    type="text"
                    value={form.main_contact_phone}
                    onChange={e => handleChange('main_contact_phone', e.target.value)}
                    style={styles.formInput}
                  />
                </div>
                <div>
                  <label style={styles.formLabel}>Mobile</label>
                  <input
                    type="text"
                    value={form.main_contact_mobile}
                    onChange={e => handleChange('main_contact_mobile', e.target.value)}
                    style={styles.formInput}
                  />
                </div>
              </div>
            </div>
          </div>

          <div style={styles.modalActions}>
            <button onClick={onClose} style={styles.backButton}>
              Cancel
            </button>
            <button onClick={handleSave} disabled={saving} style={styles.createButton}>
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
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
    marginBottom: 24,
  },
  title: {
    margin: 0,
    fontSize: 24,
    fontWeight: 600,
    color: '#1F2937',
  },
  headerButtons: {
    display: 'flex',
    gap: 12,
    alignItems: 'center',
  },
  airtableLink: {
    padding: '10px 16px',
    fontSize: 13,
    fontWeight: 600,
    background: '#FCB400',
    color: '#1F2937',
    borderRadius: 8,
    textDecoration: 'none',
  },
  addButton: {
    background: '#004751',
    color: '#FFFFFF',
    border: 'none',
    padding: '10px 20px',
    borderRadius: 8,
    fontSize: 14,
    fontWeight: 500,
    cursor: 'pointer',
  },
  filters: {
    display: 'flex',
    gap: 12,
    marginBottom: 16,
    alignItems: 'center',
  },
  searchInput: {
    padding: '10px 14px',
    borderRadius: 8,
    border: '1px solid #E5E7EB',
    fontSize: 14,
    width: 300,
  },
  count: {
    color: '#6B7280',
    fontSize: 14,
  },
  loading: {
    padding: 40,
    textAlign: 'center',
    color: '#6B7280',
  },
  table: {
    display: 'table',
    width: '100%',
    background: '#FFFFFF',
    borderRadius: 12,
    border: '1px solid #E5E7EB',
    borderCollapse: 'collapse',
    overflow: 'hidden',
  },
  tableHeader: {
    display: 'table-row',
    background: '#F9FAFB',
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
    borderBottom: '1px solid #F3F4F6',
  },
  tableHeaderCell: {
    display: 'table-cell',
    padding: '12px 16px',
    fontWeight: 600,
    fontSize: 12,
    color: '#6B7280',
    textTransform: 'uppercase',
    borderBottom: '1px solid #E5E7EB',
  },
  companyName: {
    fontWeight: 500,
    color: '#1F2937',
  },
  domain: {
    fontSize: 12,
    color: '#6B7280',
  },
  badge: {
    display: 'inline-block',
    padding: '4px 10px',
    borderRadius: 12,
    fontSize: 12,
    fontWeight: 500,
  },
  contactName: {
    fontWeight: 500,
    color: '#1F2937',
  },
  contactEmail: {
    fontSize: 12,
    color: '#6B7280',
  },
  empty: {
    padding: 40,
    textAlign: 'center',
    color: '#6B7280',
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
    width: '100%',
    maxWidth: 560,
    maxHeight: '90vh',
    overflow: 'auto',
  },
  modalHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '16px 20px',
    borderBottom: '1px solid #E5E7EB',
  },
  modalTitle: {
    margin: 0,
    fontSize: 18,
    fontWeight: 600,
  },
  closeButton: {
    background: 'none',
    border: 'none',
    fontSize: 20,
    cursor: 'pointer',
    color: '#6B7280',
  },
  modalBody: {
    padding: 20,
  },
  searchRow: {
    display: 'flex',
    gap: 8,
  },
  modalInput: {
    flex: 1,
    padding: '10px 14px',
    borderRadius: 8,
    border: '1px solid #E5E7EB',
    fontSize: 14,
  },
  searchButton: {
    background: '#004751',
    color: '#FFFFFF',
    border: 'none',
    padding: '10px 20px',
    borderRadius: 8,
    fontSize: 14,
    cursor: 'pointer',
  },
  hint: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 8,
  },
  resultsList: {
    marginTop: 16,
    maxHeight: 300,
    overflow: 'auto',
  },
  resultItem: {
    padding: '12px 14px',
    borderRadius: 8,
    border: '1px solid #E5E7EB',
    marginBottom: 8,
    cursor: 'pointer',
    transition: 'background 0.2s',
  },
  resultName: {
    fontWeight: 500,
    color: '#1F2937',
  },
  resultMeta: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 4,
  },
  noResults: {
    textAlign: 'center',
    color: '#9CA3AF',
    padding: 20,
  },
  error: {
    background: '#FEE2E2',
    color: '#DC2626',
    padding: '10px 20px',
    fontSize: 14,
  },
  detailSection: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: 600,
    color: '#6B7280',
    marginBottom: 12,
    textTransform: 'uppercase',
  },
  detailGrid: {
    background: '#F9FAFB',
    borderRadius: 8,
    padding: 16,
  },
  detailRow: {
    display: 'flex',
    marginBottom: 8,
  },
  detailLabel: {
    width: 100,
    color: '#6B7280',
    fontSize: 14,
  },
  detailValue: {
    flex: 1,
    color: '#1F2937',
    fontSize: 14,
  },
  modalActions: {
    display: 'flex',
    justifyContent: 'space-between',
    marginTop: 20,
  },
  backButton: {
    background: '#F3F4F6',
    color: '#374151',
    border: 'none',
    padding: '10px 20px',
    borderRadius: 8,
    fontSize: 14,
    cursor: 'pointer',
  },
  createButton: {
    background: '#004751',
    color: '#FFFFFF',
    border: 'none',
    padding: '10px 24px',
    borderRadius: 8,
    fontSize: 14,
    fontWeight: 500,
    cursor: 'pointer',
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
  editButton: {
    background: '#F3F4F6',
    color: '#374151',
    border: 'none',
    padding: '6px 12px',
    borderRadius: 6,
    fontSize: 13,
    cursor: 'pointer',
  },
  formSection: {
    marginBottom: 20,
  },
  formGrid: {
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
  },
  formRow: {
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
  },
  formRowHalf: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: 12,
  },
  formRowThird: {
    display: 'grid',
    gridTemplateColumns: '2fr 1fr 1fr',
    gap: 12,
  },
  formLabel: {
    fontSize: 12,
    fontWeight: 500,
    color: '#6B7280',
  },
  formInput: {
    padding: '8px 12px',
    borderRadius: 6,
    border: '1px solid #E5E7EB',
    fontSize: 14,
    width: '100%',
    boxSizing: 'border-box',
  },
};
