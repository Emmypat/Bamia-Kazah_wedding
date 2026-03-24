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
  const [menuOpen, setMenuOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    setMenuOpen(false);
    getCurrentUser().then(async (u) => {
      setUser(u);
      if (u) {
        const token = await getAccessToken();
        setIsAdmin(token ? decodeJwtGroups(token).includes('admins') : false);
      } else {
        setIsAdmin(false);
      }
    });
  }, [location]);

  async function handleLogout() {
    await logout();
    setUser(null);
    setIsAdmin(false);
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
          {user ? (
            <>
              <Link to="/upload" style={styles.link}>Upload</Link>
              <Link to="/search" style={styles.link}>Find My Photos</Link>
              <Link to="/gallery" style={styles.link}>
                {isAdmin ? 'All Photos' : 'My Gallery'}
              </Link>
              {isAdmin && <span style={styles.adminBadge}>Admin</span>}
              <button onClick={handleLogout} style={styles.logoutBtn}>Sign Out</button>
            </>
          ) : (
            <>
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
          {user ? (
            <>
              <Link to="/upload" style={styles.mobileLink}>Upload</Link>
              <Link to="/search" style={styles.mobileLink}>Find My Photos</Link>
              <Link to="/gallery" style={styles.mobileLink}>{isAdmin ? 'All Photos' : 'My Gallery'}</Link>
              {isAdmin && <span style={{ ...styles.mobileLink, color: '#7A1428', fontWeight: 600 }}>Admin</span>}
              <button onClick={handleLogout} style={styles.mobileLogout}>Sign Out</button>
            </>
          ) : (
            <>
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
    fontSize: '10px',
    fontWeight: '700',
    letterSpacing: '1.5px',
    textTransform: 'uppercase',
    padding: '4px 12px',
    borderRadius: '20px',
    border: '1px solid #e8c0ca',
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
