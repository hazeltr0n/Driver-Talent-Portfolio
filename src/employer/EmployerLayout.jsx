import { createContext, useContext, useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';

const AuthContext = createContext(null);

export function useEmployerAuth() {
  return useContext(AuthContext);
}

export function EmployerAuthProvider({ children }) {
  const [employer, setEmployer] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const token = localStorage.getItem('employer_token');
    if (!token) {
      setLoading(false);
      return;
    }

    try {
      const response = await fetch('/api/auth/me', {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        setEmployer(data.employer);
      } else {
        // Token expired or invalid
        localStorage.removeItem('employer_token');
      }
    } catch (err) {
      console.error('Auth check failed:', err);
      localStorage.removeItem('employer_token');
    } finally {
      setLoading(false);
    }
  };

  const login = (token, employerData) => {
    localStorage.setItem('employer_token', token);
    setEmployer(employerData);
  };

  const logout = () => {
    localStorage.removeItem('employer_token');
    setEmployer(null);
    navigate('/employer/login');
  };

  const getAuthHeaders = () => {
    const token = localStorage.getItem('employer_token');
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  return (
    <AuthContext.Provider value={{ employer, loading, login, logout, getAuthHeaders, checkAuth }}>
      {children}
    </AuthContext.Provider>
  );
}

export default function EmployerLayout({ children }) {
  const { employer, loading, logout } = useEmployerAuth();
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    // Redirect to login if not authenticated (after loading)
    if (!loading && !employer && !location.pathname.includes('/login') && !location.pathname.includes('/verify')) {
      navigate('/employer/login');
    }
  }, [loading, employer, location.pathname, navigate]);

  const navItems = [
    { path: '/employer', label: 'Dashboard', exact: true },
    { path: '/employer/jobs', label: 'Jobs' },
    { path: '/employer/drivers', label: 'Driver Feed' },
    { path: '/employer/submissions', label: 'Submissions' },
  ];

  if (loading) {
    return (
      <div style={styles.loadingContainer}>
        <div style={styles.spinner} />
      </div>
    );
  }

  // Don't show layout for login/verify pages
  if (location.pathname.includes('/login') || location.pathname.includes('/verify')) {
    return children;
  }

  if (!employer) {
    return null;
  }

  const isActive = (item) => {
    if (item.exact) {
      return location.pathname === item.path;
    }
    return location.pathname.startsWith(item.path);
  };

  return (
    <div style={styles.container}>
      <nav style={styles.nav}>
        <div style={styles.navLeft}>
          <div style={styles.logo}>
            <img src="/fw-logo.svg" alt="FreeWorld" style={{ height: 32, width: 32 }} />
            <span style={styles.logoText}>Employer Portal</span>
          </div>
          <div style={styles.navLinks}>
            {navItems.map(item => (
              <Link
                key={item.path}
                to={item.path}
                style={{
                  ...styles.navLink,
                  ...(isActive(item) ? styles.navLinkActive : {}),
                }}
              >
                {item.label}
              </Link>
            ))}
          </div>
        </div>
        <div style={styles.navRight}>
          <span style={styles.employerName}>{employer.name}</span>
          <button onClick={logout} style={styles.logoutButton}>Sign Out</button>
        </div>
      </nav>
      <main style={styles.main}>
        {children}
      </main>
    </div>
  );
}

const styles = {
  container: {
    minHeight: '100vh',
    background: '#F4F4F4',
    fontFamily: "'Segoe UI', system-ui, -apple-system, sans-serif",
  },
  loadingContainer: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: '#F4F4F4',
  },
  spinner: {
    width: 40,
    height: 40,
    border: '4px solid #E8ECEE',
    borderTopColor: '#004751',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
  },
  nav: {
    background: '#004751',
    padding: '12px 24px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 16,
  },
  navLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: 32,
  },
  logo: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
  },
  logoText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 600,
  },
  navLinks: {
    display: 'flex',
    gap: 8,
    flexWrap: 'wrap',
  },
  navLink: {
    color: '#B0CDD4',
    textDecoration: 'none',
    padding: '8px 16px',
    borderRadius: 6,
    fontSize: 14,
    fontWeight: 500,
    transition: 'all 0.2s',
  },
  navLinkActive: {
    background: 'rgba(205, 249, 92, 0.15)',
    color: '#CDF95C',
  },
  navRight: {
    display: 'flex',
    alignItems: 'center',
    gap: 16,
  },
  employerName: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 500,
  },
  logoutButton: {
    background: 'transparent',
    border: '1px solid rgba(255,255,255,0.3)',
    color: '#FFFFFF',
    padding: '6px 14px',
    borderRadius: 6,
    fontSize: 13,
    cursor: 'pointer',
  },
  main: {
    padding: '24px',
    maxWidth: 1200,
    margin: '0 auto',
  },
};
