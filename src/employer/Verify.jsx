import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useEmployerAuth } from './EmployerLayout';

export default function EmployerVerify() {
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState('verifying'); // verifying, success, error
  const [error, setError] = useState(null);
  const { login } = useEmployerAuth();
  const navigate = useNavigate();

  useEffect(() => {
    verifyToken();
  }, []);

  const verifyToken = async () => {
    const token = searchParams.get('token');
    const email = searchParams.get('email');

    if (!token || !email) {
      setStatus('error');
      setError('Invalid magic link. Please request a new one.');
      return;
    }

    try {
      const response = await fetch(`/api/auth/verify?token=${token}&email=${encodeURIComponent(email)}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Verification failed');
      }

      // Store token and employer data
      login(data.token, data.employer);
      setStatus('success');

      // Redirect to dashboard after brief delay
      setTimeout(() => {
        navigate('/employer');
      }, 1500);
    } catch (err) {
      setStatus('error');
      setError(err.message);
    }
  };

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <div style={styles.logoSection}>
          <img src="/fw-logo.svg" alt="FreeWorld" style={{ height: 48, width: 48 }} />
        </div>

        {status === 'verifying' && (
          <div style={styles.statusSection}>
            <div style={styles.spinner} />
            <h2 style={styles.statusTitle}>Verifying your login...</h2>
            <p style={styles.statusText}>Please wait while we sign you in.</p>
          </div>
        )}

        {status === 'success' && (
          <div style={styles.statusSection}>
            <div style={styles.successIcon}>✓</div>
            <h2 style={styles.statusTitle}>You're signed in!</h2>
            <p style={styles.statusText}>Redirecting to your dashboard...</p>
          </div>
        )}

        {status === 'error' && (
          <div style={styles.statusSection}>
            <div style={styles.errorIcon}>!</div>
            <h2 style={styles.statusTitle}>Verification Failed</h2>
            <p style={styles.errorText}>{error}</p>
            <button onClick={() => navigate('/employer/login')} style={styles.button}>
              Back to Login
            </button>
          </div>
        )}
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
    textAlign: 'center',
  },
  logoSection: {
    marginBottom: 32,
  },
  statusSection: {
    padding: '20px 0',
  },
  spinner: {
    width: 48,
    height: 48,
    border: '4px solid #E8ECEE',
    borderTopColor: '#004751',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
    margin: '0 auto 24px',
  },
  successIcon: {
    width: 56,
    height: 56,
    background: '#D1FAE5',
    color: '#059669',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 28,
    fontWeight: 700,
    margin: '0 auto 24px',
  },
  errorIcon: {
    width: 56,
    height: 56,
    background: '#FEE2E2',
    color: '#DC2626',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 28,
    fontWeight: 700,
    margin: '0 auto 24px',
  },
  statusTitle: {
    color: '#004751',
    fontSize: 20,
    fontWeight: 700,
    margin: '0 0 8px',
    fontFamily: 'Georgia, serif',
  },
  statusText: {
    color: '#5A7A82',
    fontSize: 14,
    margin: 0,
  },
  errorText: {
    color: '#DC2626',
    fontSize: 14,
    margin: '0 0 24px',
  },
  button: {
    padding: '12px 24px',
    fontSize: 14,
    fontWeight: 600,
    background: '#004751',
    color: '#FFFFFF',
    border: 'none',
    borderRadius: 8,
    cursor: 'pointer',
  },
};
