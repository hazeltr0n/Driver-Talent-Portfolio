import { createContext, useContext, useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';

const AdminAuthContext = createContext(null);

export function useAdminAuth() {
  return useContext(AdminAuthContext);
}

export function AdminAuthProvider({ children }) {
  const [admin, setAdmin] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const token = localStorage.getItem('admin_token');
    if (!token) {
      setLoading(false);
      return;
    }

    try {
      const response = await fetch('/api/auth/admin/me', {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        setAdmin(data.admin);
      } else {
        // Token expired or invalid
        localStorage.removeItem('admin_token');
      }
    } catch (err) {
      console.error('Auth check failed:', err);
      localStorage.removeItem('admin_token');
    } finally {
      setLoading(false);
    }
  };

  const login = (token, adminData) => {
    localStorage.setItem('admin_token', token);
    setAdmin(adminData);
  };

  const logout = () => {
    localStorage.removeItem('admin_token');
    setAdmin(null);
    navigate('/admin/login');
  };

  const getAuthHeaders = () => {
    const token = localStorage.getItem('admin_token');
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  return (
    <AdminAuthContext.Provider value={{ admin, loading, login, logout, getAuthHeaders, checkAuth }}>
      {children}
    </AdminAuthContext.Provider>
  );
}

export default function AdminLayout({ children }) {
  const { admin, loading, logout } = useAdminAuth();
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    // Redirect to login if not authenticated (after loading)
    if (!loading && !admin && !location.pathname.includes('/login')) {
      navigate('/admin/login');
    }
  }, [loading, admin, location.pathname, navigate]);

  const navItems = [
    { path: '/admin', label: 'Dashboard', exact: true },
    { path: '/admin/drivers', label: 'Drivers' },
    { path: '/admin/employers', label: 'Employers' },
    { path: '/admin/requisitions', label: 'Requisitions' },
    { path: '/admin/submissions', label: 'Submissions' },
    { path: '/employer', label: 'Employer Portal', external: true },
  ];

  if (loading) {
    return (
      <div style={styles.loadingContainer}>
        <div style={styles.spinner} />
      </div>
    );
  }

  // Don't show layout for login page
  if (location.pathname.includes('/login')) {
    return children;
  }

  if (!admin) {
    return null;
  }

  const isActive = (item) => {
    if (item.exact) {
      return location.pathname === item.path;
    }
    return location.pathname.startsWith(item.path) && !item.external;
  };

  return (
    <div style={styles.container}>
      <nav style={styles.nav}>
        <div style={styles.navLeft}>
          <div style={styles.logo}>
            <img src="/fw-logo.svg" alt="FreeWorld" style={{ height: 32, width: 32 }} />
            <span style={styles.logoText}>Career Agent Portal</span>
          </div>
          <div style={styles.navLinks}>
            {navItems.map(item => (
              item.external ? (
                <a
                  key={item.path}
                  href={item.path}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    ...styles.navLink,
                    ...styles.navLinkExternal,
                  }}
                >
                  {item.label} ↗
                </a>
              ) : (
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
              )
            ))}
          </div>
        </div>
        <div style={styles.navRight}>
          <span style={styles.adminName}>{admin.name}</span>
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
  navLinkExternal: {
    borderLeft: '1px solid rgba(176, 205, 212, 0.3)',
    marginLeft: 8,
    paddingLeft: 16,
  },
  navRight: {
    display: 'flex',
    alignItems: 'center',
    gap: 16,
  },
  adminName: {
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
