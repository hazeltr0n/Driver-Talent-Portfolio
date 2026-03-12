import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAdminAuth } from './AdminLayout';

export default function AdminLogin() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { login } = useAdminAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const response = await fetch('/api/auth/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Login failed');
      }

      login(data.token, data.admin);
      navigate('/admin');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <div style={styles.logo}>
          <img src="/fw-logo.svg" alt="FreeWorld" style={{ height: 48, width: 48 }} />
        </div>
        <h1 style={styles.title}>Career Agent Portal</h1>
        <p style={styles.subtitle}>Sign in to continue</p>

        {error && <div style={styles.error}>{error}</div>}

        <form onSubmit={handleSubmit} style={styles.form}>
          <div style={styles.field}>
            <label style={styles.label}>Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@freeworld.org"
              style={styles.input}
              required
              autoFocus
            />
          </div>
          <div style={styles.field}>
            <label style={styles.label}>Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              style={styles.input}
              required
            />
          </div>
          <button type="submit" disabled={loading} style={styles.button}>
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  );
}

const styles = {
  container: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: '#F4F4F4',
    fontFamily: "'Segoe UI', system-ui, -apple-system, sans-serif",
    padding: 20,
  },
  card: {
    background: '#FFFFFF',
    borderRadius: 16,
    padding: 40,
    width: '100%',
    maxWidth: 400,
    boxShadow: '0 4px 24px rgba(0,0,0,0.08)',
  },
  logo: {
    textAlign: 'center',
    marginBottom: 24,
  },
  title: {
    margin: 0,
    fontSize: 24,
    fontWeight: 700,
    color: '#004751',
    textAlign: 'center',
  },
  subtitle: {
    margin: '8px 0 24px',
    fontSize: 14,
    color: '#5A7A82',
    textAlign: 'center',
  },
  error: {
    background: '#FEF2F2',
    color: '#DC2626',
    padding: '12px 16px',
    borderRadius: 8,
    marginBottom: 16,
    fontSize: 14,
    textAlign: 'center',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: 16,
  },
  field: {
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
  },
  label: {
    fontSize: 14,
    fontWeight: 600,
    color: '#1A2A30',
  },
  input: {
    padding: '12px 14px',
    fontSize: 16,
    border: '1px solid #D1D9DD',
    borderRadius: 8,
    outline: 'none',
    transition: 'border-color 0.2s',
  },
  button: {
    padding: '14px 20px',
    fontSize: 16,
    fontWeight: 600,
    background: '#004751',
    color: '#FFFFFF',
    border: 'none',
    borderRadius: 8,
    cursor: 'pointer',
    marginTop: 8,
  },
};
