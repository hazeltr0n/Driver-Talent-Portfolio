import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import EmployerLayout from './EmployerLayout';
import { createEmployerJob, parseJobDescription } from '../lib/employer-api';

export default function AddJob() {
  const navigate = useNavigate();
  const [saving, setSaving] = useState(false);
  const [parsing, setParsing] = useState(false);
  const [error, setError] = useState(null);
  const [parseText, setParseText] = useState('');
  const [formData, setFormData] = useState({
    title: '',
    location: '',
    yard_zip: '',
    route_type: '',
    cdl_class: 'A',
    min_experience_years: 1,
    pay_min: 0,
    pay_max: 0,
    home_time: '',
    touch_freight: 'Very Light',
    equipment_types: '',
    endorsements_required: '',
    max_mvr_violations: 2,
    max_accidents: 1,
    positions_available: 1,
    notes: '',
    raw_description: '',
  });

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleParse = async () => {
    if (!parseText || parseText.length < 50) {
      setError('Please paste a job description (at least 50 characters)');
      return;
    }

    setParsing(true);
    setError(null);

    try {
      const parsed = await parseJobDescription(parseText);

      // Merge parsed data with form, keeping raw_description
      setFormData(prev => ({
        ...prev,
        ...parsed,
        raw_description: parseText,
      }));
    } catch (err) {
      setError('Failed to parse: ' + err.message);
    } finally {
      setParsing(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.title) {
      setError('Title is required');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      await createEmployerJob(formData);
      navigate('/employer/jobs');
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <EmployerLayout>
      <div style={styles.header}>
        <h1 style={styles.title}>Add Job Requisition</h1>
      </div>

      <form onSubmit={handleSubmit} style={styles.form}>
        {error && <div style={styles.error}>{error}</div>}

        <div style={styles.parseSection}>
          <h2 style={styles.sectionTitle}>Quick Fill from Job Posting</h2>
          <p style={styles.parseHint}>Paste your job description below and we'll extract the details automatically.</p>
          <textarea
            value={parseText}
            onChange={e => setParseText(e.target.value)}
            placeholder="Paste your full job posting here..."
            style={styles.parseTextarea}
            rows={5}
          />
          <button
            type="button"
            onClick={handleParse}
            disabled={parsing || parseText.length < 50}
            style={styles.parseButton}
          >
            {parsing ? 'Parsing...' : 'Parse & Fill Form'}
          </button>
        </div>

        <div style={styles.section}>
          <h2 style={styles.sectionTitle}>Basic Information</h2>
          <div style={styles.grid}>
            <div style={styles.fieldFull}>
              <label style={styles.label}>Job Title *</label>
              <input
                type="text"
                value={formData.title}
                onChange={e => handleChange('title', e.target.value)}
                placeholder="e.g. Regional CDL-A Driver"
                style={styles.input}
                required
              />
            </div>
            <div style={styles.field}>
              <label style={styles.label}>Location</label>
              <input
                type="text"
                value={formData.location}
                onChange={e => handleChange('location', e.target.value)}
                placeholder="e.g. Dallas, TX"
                style={styles.input}
              />
            </div>
            <div style={styles.field}>
              <label style={styles.label}>Yard Zip Code</label>
              <input
                type="text"
                value={formData.yard_zip}
                onChange={e => handleChange('yard_zip', e.target.value)}
                placeholder="e.g. 75201"
                style={styles.input}
              />
            </div>
            <div style={styles.field}>
              <label style={styles.label}>Positions Available</label>
              <input
                type="number"
                value={formData.positions_available}
                onChange={e => handleChange('positions_available', parseInt(e.target.value) || 1)}
                min={1}
                style={styles.input}
              />
            </div>
          </div>
        </div>

        <div style={styles.section}>
          <h2 style={styles.sectionTitle}>Job Requirements</h2>
          <div style={styles.grid}>
            <div style={styles.field}>
              <label style={styles.label}>Route Type</label>
              <select
                value={formData.route_type}
                onChange={e => handleChange('route_type', e.target.value)}
                style={styles.select}
              >
                <option value="">Select...</option>
                <option value="Local">Local</option>
                <option value="Regional">Regional</option>
                <option value="OTR">OTR</option>
              </select>
            </div>
            <div style={styles.field}>
              <label style={styles.label}>CDL Class</label>
              <select
                value={formData.cdl_class}
                onChange={e => handleChange('cdl_class', e.target.value)}
                style={styles.select}
              >
                <option value="A">Class A</option>
                <option value="B">Class B</option>
              </select>
            </div>
            <div style={styles.field}>
              <label style={styles.label}>Min Experience (years)</label>
              <input
                type="number"
                value={formData.min_experience_years}
                onChange={e => handleChange('min_experience_years', parseInt(e.target.value) || 0)}
                min={0}
                style={styles.input}
              />
            </div>
            <div style={styles.field}>
              <label style={styles.label}>Home Time</label>
              <select
                value={formData.home_time}
                onChange={e => handleChange('home_time', e.target.value)}
                style={styles.select}
              >
                <option value="">Select...</option>
                <option value="Home Daily">Home Daily</option>
                <option value="Home Weekly">Home Weekly</option>
                <option value="Home Bi-weekly">Home Bi-weekly</option>
                <option value="Out 2-3 weeks">Out 2-3 weeks</option>
              </select>
            </div>
            <div style={styles.field}>
              <label style={styles.label}>Touch Freight</label>
              <select
                value={formData.touch_freight}
                onChange={e => handleChange('touch_freight', e.target.value)}
                style={styles.select}
              >
                <option value="Very Light">Very Light (No Touch)</option>
                <option value="Light">Light</option>
                <option value="Medium">Medium</option>
                <option value="Heavy">Heavy</option>
              </select>
            </div>
            <div style={styles.field}>
              <label style={styles.label}>Equipment Types</label>
              <input
                type="text"
                value={formData.equipment_types}
                onChange={e => handleChange('equipment_types', e.target.value)}
                placeholder="e.g. Dry Van, Reefer"
                style={styles.input}
              />
            </div>
            <div style={styles.field}>
              <label style={styles.label}>Endorsements Required</label>
              <input
                type="text"
                value={formData.endorsements_required}
                onChange={e => handleChange('endorsements_required', e.target.value)}
                placeholder="e.g. Hazmat, Tanker"
                style={styles.input}
              />
            </div>
          </div>
        </div>

        <div style={styles.section}>
          <h2 style={styles.sectionTitle}>Compensation</h2>
          <div style={styles.grid}>
            <div style={styles.field}>
              <label style={styles.label}>Pay Min ($/week)</label>
              <input
                type="number"
                value={formData.pay_min}
                onChange={e => handleChange('pay_min', parseInt(e.target.value) || 0)}
                min={0}
                style={styles.input}
              />
            </div>
            <div style={styles.field}>
              <label style={styles.label}>Pay Max ($/week)</label>
              <input
                type="number"
                value={formData.pay_max}
                onChange={e => handleChange('pay_max', parseInt(e.target.value) || 0)}
                min={0}
                style={styles.input}
              />
            </div>
          </div>
        </div>

        <div style={styles.section}>
          <h2 style={styles.sectionTitle}>Background Requirements</h2>
          <div style={styles.grid}>
            <div style={styles.field}>
              <label style={styles.label}>Max MVR Violations (3yr)</label>
              <input
                type="number"
                value={formData.max_mvr_violations}
                onChange={e => handleChange('max_mvr_violations', parseInt(e.target.value) || 0)}
                min={0}
                style={styles.input}
              />
            </div>
            <div style={styles.field}>
              <label style={styles.label}>Max Accidents (3yr)</label>
              <input
                type="number"
                value={formData.max_accidents}
                onChange={e => handleChange('max_accidents', parseInt(e.target.value) || 0)}
                min={0}
                style={styles.input}
              />
            </div>
          </div>
        </div>

        <div style={styles.section}>
          <h2 style={styles.sectionTitle}>Additional Information</h2>
          <div style={styles.field}>
            <label style={styles.label}>Notes</label>
            <textarea
              value={formData.notes}
              onChange={e => handleChange('notes', e.target.value)}
              placeholder="Any additional notes about this position..."
              style={styles.textarea}
              rows={3}
            />
          </div>
          <div style={styles.field}>
            <label style={styles.label}>Full Job Description</label>
            <textarea
              value={formData.raw_description}
              onChange={e => handleChange('raw_description', e.target.value)}
              placeholder="Paste the full job description here..."
              style={styles.textarea}
              rows={6}
            />
          </div>
        </div>

        <div style={styles.actions}>
          <button type="button" onClick={() => navigate('/employer/jobs')} style={styles.cancelButton}>
            Cancel
          </button>
          <button type="submit" disabled={saving} style={styles.submitButton}>
            {saving ? 'Creating...' : 'Create Job'}
          </button>
        </div>
      </form>
    </EmployerLayout>
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
  form: {
    maxWidth: 800,
  },
  error: {
    background: '#FEF2F2',
    color: '#DC2626',
    padding: '12px 16px',
    borderRadius: 8,
    marginBottom: 16,
    fontSize: 14,
  },
  parseSection: {
    background: '#F0FDF4',
    borderRadius: 12,
    border: '1px solid #86EFAC',
    padding: 24,
    marginBottom: 20,
  },
  parseHint: {
    margin: '0 0 12px',
    fontSize: 14,
    color: '#166534',
  },
  parseTextarea: {
    width: '100%',
    padding: '12px',
    fontSize: 14,
    border: '1px solid #86EFAC',
    borderRadius: 6,
    fontFamily: 'inherit',
    resize: 'vertical',
    boxSizing: 'border-box',
  },
  parseButton: {
    marginTop: 12,
    padding: '10px 20px',
    fontSize: 14,
    fontWeight: 600,
    background: '#059669',
    color: '#FFFFFF',
    border: 'none',
    borderRadius: 6,
    cursor: 'pointer',
  },
  section: {
    background: '#FFFFFF',
    borderRadius: 12,
    border: '1px solid #E8ECEE',
    padding: 24,
    marginBottom: 20,
  },
  sectionTitle: {
    margin: '0 0 20px',
    fontSize: 16,
    fontWeight: 600,
    color: '#004751',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: 16,
  },
  field: {
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
  },
  fieldFull: {
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
    gridColumn: '1 / -1',
  },
  label: {
    fontSize: 13,
    fontWeight: 600,
    color: '#5A7A82',
  },
  input: {
    padding: '10px 12px',
    fontSize: 14,
    border: '1px solid #D1D9DD',
    borderRadius: 6,
    outline: 'none',
  },
  select: {
    padding: '10px 12px',
    fontSize: 14,
    border: '1px solid #D1D9DD',
    borderRadius: 6,
    background: '#FFFFFF',
  },
  textarea: {
    padding: '10px 12px',
    fontSize: 14,
    border: '1px solid #D1D9DD',
    borderRadius: 6,
    fontFamily: 'inherit',
    resize: 'vertical',
  },
  actions: {
    display: 'flex',
    gap: 12,
    justifyContent: 'flex-end',
    marginTop: 24,
  },
  cancelButton: {
    padding: '12px 24px',
    fontSize: 14,
    fontWeight: 600,
    background: '#FFFFFF',
    color: '#5A7A82',
    border: '1px solid #D1D9DD',
    borderRadius: 6,
    cursor: 'pointer',
  },
  submitButton: {
    padding: '12px 24px',
    fontSize: 14,
    fontWeight: 600,
    background: '#004751',
    color: '#FFFFFF',
    border: 'none',
    borderRadius: 6,
    cursor: 'pointer',
  },
};
