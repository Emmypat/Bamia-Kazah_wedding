import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { getCurrentUser, logout, getAccessToken } from '../utils/auth';

function decodeJwtGroups(token) {
  try {
    const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
    const groups = payload['cognito:groups'];
    if (!groups) return [];
    const str = Array.isArray(groups) ? groups.join(',') : String(groups).replace(/[\[\]]/g, '');
    return str.split(',').map(g => g.trim()).filter(Boolean);
  } catch { return []; }
}

export default function Navbar() {
  const [user, setUser] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isCoordinator, setIsCoordinator] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    setMenuOpen(false);
    getCurrentUser().then(async (u) => {
      setUser(u);
      if (u) {
        const token = await getAccessToken();
        const groups = token ? decodeJwtGroups(token) : [];
        setIsAdmin(groups.includes('admins') || groups.includes('superadmins'));
        setIsCoordinator(groups.includes('coordinators'));
      } else {
        setIsAdmin(false);
        setIsCoordinator(false);
      }
    });
  }, [location]);

  async function handleLogout() {
    await logout();
    setUser(null);
    setIsAdmin(false);
    setIsCoordinator(false);
    navigate('/');
  }

  return (
    <nav style={styles.nav}>
      <div style={styles.inner}>
        <Link to="/" style={styles.logo}>
          <span style={styles.logoMain}>Bamai &amp; Kazah</span>
          <span style={styles.logoSub}>11 April 2026</span>
        </Link>

        {/* Desktop */}
        <div className="nav-desktop">
          {isCoordinator && !isAdmin ? (
            <>
              <Link to="/coordinator/dashboard" style={styles.link}>My Dashboard</Link>
              <button onClick={handleLogout} style={styles.logoutBtn}>Sign Out</button>
            </>
          ) : user ? (
            <>
              <Link to="/upload" style={styles.link}>Upload</Link>
              <Link to="/search" style={styles.link}>Find My Photos</Link>
              <Link to="/get-ticket" style={styles.link}>Get Ticket</Link>
              <Link to="/my-ticket" style={styles.link}>My Ticket</Link>
              <Link to="/gallery" style={styles.link}>
                {isAdmin ? 'All Photos' : 'My Gallery'}
              </Link>
              {isAdmin && (
                <>
                  <Link to="/admin/tickets" style={styles.adminBadge}>🎟️ Manage Tickets</Link>
                  <Link to="/admin/coordinators" style={styles.adminBadge}>👥 Coordinators</Link>
                  <Link to="/admin/scan" style={styles.adminScanBadge}>📷 Scan Tickets</Link>
                </>
              )}
              <button onClick={handleLogout} style={styles.logoutBtn}>Sign Out</button>
            </>
          ) : (
            <>
              <Link to="/get-ticket" style={styles.link}>🎟️ Get Ticket</Link>
              <Link to="/my-ticket" style={styles.link}>My Ticket</Link>
              <Link to="/login" style={styles.link}>Sign In</Link>
              <Link to="/register" className="btn btn-primary" style={styles.registerBtn}>Register</Link>
            </>
          )}
        </div>

        {/* Mobile hamburger */}
        <button className="nav-hamburger" onClick={() => setMenuOpen(o => !o)} aria-label="Menu">
          <span style={styles.bar} />
          <span style={styles.bar} />
          <span style={styles.bar} />
        </button>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div style={styles.mobileMenu}>
          {isCoordinator && !isAdmin ? (
            <>
              <Link to="/coordinator/dashboard" style={styles.mobileLink}>My Dashboard</Link>
              <button onClick={handleLogout} style={styles.mobileLogout}>Sign Out</button>
            </>
          ) : user ? (
            <>
              <Link to="/upload" style={styles.mobileLink}>Upload</Link>
              <Link to="/search" style={styles.mobileLink}>Find My Photos</Link>
              <Link to="/get-ticket" style={styles.mobileLink}>🎟️ Get Ticket</Link>
              <Link to="/my-ticket" style={styles.mobileLink}>My Ticket</Link>
              <Link to="/gallery" style={styles.mobileLink}>{isAdmin ? 'All Photos' : 'My Gallery'}</Link>
              {isAdmin && (
                <>
                  <Link to="/admin/tickets" style={{ ...styles.mobileLink, color: '#7A1428', fontWeight: 700, background: '#FDF0F3', borderLeft: '3px solid #7A1428' }}>🎟️ Manage Tickets</Link>
                  <Link to="/admin/coordinators" style={{ ...styles.mobileLink, color: '#7A1428', fontWeight: 700, background: '#FDF0F3', borderLeft: '3px solid #7A1428' }}>👥 Coordinators</Link>
                  <Link to="/admin/scan" style={{ ...styles.mobileLink, color: '#5C0F1E', fontWeight: 700, background: '#F7EDE0', borderLeft: '3px solid #C4956A' }}>📷 Scan Tickets</Link>
                </>
              )}
              <button onClick={handleLogout} style={styles.mobileLogout}>Sign Out</button>
            </>
          ) : (
            <>
              <Link to="/get-ticket" style={styles.mobileLink}>🎟️ Get Ticket</Link>
              <Link to="/my-ticket" style={styles.mobileLink}>My Ticket</Link>
              <Link to="/login" style={styles.mobileLink}>Sign In</Link>
              <Link to="/register" style={styles.mobileLink}>Register</Link>
            </>
          )}
        </div>
      )}
    </nav>
  );
}

const styles = {
  nav: {
    background: 'white',
    boxShadow: '0 1px 12px rgba(122,20,40,0.08)',
    position: 'sticky',
    top: 0,
    zIndex: 100,
    borderBottom: '1px solid #EDE0D8',
  },
  inner: {
    maxWidth: '1100px',
    margin: '0 auto',
    padding: '0 24px',
    height: '68px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  logo: { textDecoration: 'none', display: 'flex', flexDirection: 'column', lineHeight: 1.2 },
  logoMain: {
    fontFamily: "'Cormorant Garamond', Georgia, serif",
    fontSize: '20px',
    fontWeight: '600',
    color: '#7A1428',
    letterSpacing: '0.5px',
  },
  logoSub: {
    fontSize: '10px',
    letterSpacing: '2px',
    textTransform: 'uppercase',
    color: '#C4956A',
  },
  link: { textDecoration: 'none', color: '#5C3D2E', fontSize: '14px', fontWeight: '500', transition: 'color 0.2s' },
  registerBtn: { padding: '8px 22px', fontSize: '14px' },
  adminBadge: {
    background: '#F5E6E9',
    color: '#7A1428',
    fontSize: '11px',
    fontWeight: '700',
    padding: '5px 12px',
    borderRadius: '20px',
    border: '1px solid #e8c0ca',
    textDecoration: 'none',
  },
  adminScanBadge: {
    background: '#2D1010',
    color: '#C4956A',
    fontSize: '11px',
    fontWeight: '700',
    padding: '5px 12px',
    borderRadius: '20px',
    border: '1px solid #5C1A28',
    textDecoration: 'none',
  },
  logoutBtn: {
    background: 'none',
    border: '1px solid #7A1428',
    color: '#7A1428',
    padding: '6px 18px',
    borderRadius: '20px',
    cursor: 'pointer',
    fontSize: '13px',
    fontWeight: '500',
  },
  bar: { display: 'block', width: '22px', height: '2px', background: '#7A1428', borderRadius: '2px' },
  mobileMenu: {
    display: 'flex',
    flexDirection: 'column',
    borderTop: '1px solid #EDE0D8',
    background: 'white',
  },
  mobileLink: {
    display: 'block',
    padding: '14px 24px',
    textDecoration: 'none',
    color: '#5C3D2E',
    fontSize: '15px',
    borderBottom: '1px solid #F7EDE0',
    fontWeight: '500',
  },
  mobileLogout: {
    background: 'none',
    border: 'none',
    textAlign: 'left',
    padding: '14px 24px',
    color: '#7A1428',
    fontSize: '15px',
    cursor: 'pointer',
    fontWeight: '500',
  },
};
