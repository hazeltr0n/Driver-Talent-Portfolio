import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function EmployerLogin() {
  const [email, setEmail] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email.trim()) return;

    setSending(true);
    setError(null);

    try {
      const response = await fetch('/api/auth/magic-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to send magic link');
      }

      setSent(true);

      // In development, auto-navigate if devLink is provided
      if (data.devLink) {
        console.log('Dev magic link:', data.devLink);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setSending(false);
    }
  };

  if (sent) {
    return (
      <div style={styles.page}>
        <div style={styles.card}>
          <div style={styles.logoSection}>
            <img src="/fw-logo.svg" alt="FreeWorld" style={{ height: 48, width: 48 }} />
            <h1 style={styles.title}>Check Your Email</h1>
          </div>
          <div style={styles.successMessage}>
            <div style={styles.successIcon}>✉️</div>
            <p style={styles.successText}>
              We sent a magic link to <strong>{email}</strong>
            </p>
            <p style={styles.successHint}>
              Click the link in the email to sign in. The link expires in 15 minutes.
            </p>
          </div>
          <button onClick={() => setSent(false)} style={styles.linkButton}>
            Use a different email
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <div style={styles.logoSection}>
          <img src="/fw-logo.svg" alt="FreeWorld" style={{ height: 48, width: 48 }} />
          <h1 style={styles.title}>Employer Portal</h1>
          <p style={styles.subtitle}>Sign in with your email</p>
        </div>

        {error && (
          <div style={styles.error}>{error}</div>
        )}

        <form onSubmit={handleSubmit} style={styles.form}>
          <div style={styles.inputGroup}>
            <label style={styles.label}>Email address</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@company.com"
              style={styles.input}
              autoFocus
              required
            />
          </div>

          <button
            type="submit"
            disabled={sending || !email.trim()}
            style={{
              ...styles.button,
              ...(sending ? styles.buttonDisabled : {}),
            }}
          >
            {sending ? 'Sending...' : 'Send Magic Link'}
          </button>
        </form>

        <p style={styles.footerText}>
          We'll send a magic link to your email address. No password needed.
        </p>
      </div>
    </div>
  );
}

const styles = {
  page: {
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #004751 0%, #006770 100%)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    fontFamily: "'Segoe UI', system-ui, -apple-system, sans-serif",
  },
  card: {
    background: '#FFFFFF',
    borderRadius: 16,
    padding: 40,
    width: '100%',
    maxWidth: 400,
    boxShadow: '0 20px 50px rgba(0,0,0,0.3)',
  },
  logoSection: {
    textAlign: 'center',
    marginBottom: 32,
  },
  title: {
    color: '#004751',
    fontSize: 24,
    fontWeight: 700,
    margin: '16px 0 8px',
    fontFamily: 'Georgia, serif',
  },
  subtitle: {
    color: '#5A7A82',
    fontSize: 14,
    margin: 0,
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: 16,
  },
  inputGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
  },
  label: {
    fontSize: 13,
    fontWeight: 600,
    color: '#1A2A30',
  },
  input: {
    padding: '12px 14px',
    fontSize: 15,
    border: '1px solid #D1D9DD',
    borderRadius: 8,
    outline: 'none',
    transition: 'border-color 0.2s',
  },
  button: {
    padding: '14px 20px',
    fontSize: 15,
    fontWeight: 600,
    background: '#004751',
    color: '#FFFFFF',
    border: 'none',
    borderRadius: 8,
    cursor: 'pointer',
    marginTop: 8,
  },
  buttonDisabled: {
    background: '#9CA3AF',
    cursor: 'not-allowed',
  },
  error: {
    background: '#FEF2F2',
    color: '#DC2626',
    padding: '12px 16px',
    borderRadius: 8,
    fontSize: 14,
    marginBottom: 16,
  },
  footerText: {
    color: '#9CA3AF',
    fontSize: 12,
    textAlign: 'center',
    marginTop: 24,
  },
  successMessage: {
    textAlign: 'center',
    padding: '20px 0',
  },
  successIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  successText: {
    color: '#1A2A30',
    fontSize: 15,
    margin: '0 0 8px',
  },
  successHint: {
    color: '#5A7A82',
    fontSize: 13,
    margin: 0,
  },
  linkButton: {
    background: 'none',
    border: 'none',
    color: '#004751',
    fontSize: 14,
    cursor: 'pointer',
    textDecoration: 'underline',
    marginTop: 16,
    display: 'block',
    width: '100%',
    textAlign: 'center',
  },
};
