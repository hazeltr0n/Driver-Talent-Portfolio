import { Link, useLocation } from 'react-router-dom';

export default function AdminLayout({ children }) {
  const location = useLocation();

  const navItems = [
    { path: '/admin', label: 'Dashboard' },
    { path: '/admin/drivers', label: 'Drivers' },
    { path: '/admin/requisitions', label: 'Requisitions' },
    { path: '/admin/submissions', label: 'Submissions' },
  ];

  return (
    <div style={styles.container}>
      <nav style={styles.nav}>
        <div style={styles.logo}>
          <img src="/fw-logo.svg" alt="FreeWorld" style={{ height: 32, width: 32 }} />
          <span style={styles.logoText}>Career Agent Portal</span>
        </div>
        <div style={styles.navLinks}>
          {navItems.map(item => (
            <Link
              key={item.path}
              to={item.path}
              style={{
                ...styles.navLink,
                ...(location.pathname === item.path ? styles.navLinkActive : {}),
              }}
            >
              {item.label}
            </Link>
          ))}
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
  nav: {
    background: '#004751',
    padding: '12px 24px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 16,
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
  main: {
    padding: '24px',
    maxWidth: 1200,
    margin: '0 auto',
  },
};
