import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { getCurrentUser, logout } from '../utils/auth';

export default function Navbar() {
  const [user, setUser] = useState(null);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    getCurrentUser().then(setUser);
  }, [location]); // Re-check auth on route change

  async function handleLogout() {
    await logout();
    setUser(null);
    navigate('/');
  }

  return (
    <nav style={styles.nav}>
      <div style={styles.inner}>
        {/* Logo */}
        <Link to="/" style={styles.logo}>💒 WeddingPhotos</Link>

        {/* Links */}
        <div style={styles.links}>
          {user ? (
            <>
              <Link to="/upload" style={styles.link}>Upload</Link>
              <Link to="/search" style={styles.link}>Find My Photos</Link>
              <Link to="/gallery" style={styles.link}>My Gallery</Link>
              <button onClick={handleLogout} style={styles.logoutBtn}>Sign Out</button>
            </>
          ) : (
            <Link to="/register" style={styles.link}>Sign In / Register</Link>
          )}
        </div>
      </div>
    </nav>
  );
}

const styles = {
  nav: {
    background: '#fff',
    boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
    position: 'sticky',
    top: 0,
    zIndex: 100,
    height: '64px',
    display: 'flex',
    alignItems: 'center',
  },
  inner: {
    maxWidth: '1100px',
    margin: '0 auto',
    padding: '0 20px',
    width: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  logo: {
    textDecoration: 'none',
    fontSize: '20px',
    color: '#c49a9a',
    fontFamily: 'Georgia, serif',
    fontWeight: 'bold',
  },
  links: {
    display: 'flex',
    alignItems: 'center',
    gap: '24px',
  },
  link: {
    textDecoration: 'none',
    color: '#666',
    fontSize: '15px',
    fontFamily: 'Georgia, serif',
    transition: 'color 0.2s',
  },
  logoutBtn: {
    background: 'none',
    border: '1px solid #d4a7a7',
    color: '#c49a9a',
    padding: '6px 16px',
    borderRadius: '20px',
    cursor: 'pointer',
    fontFamily: 'Georgia, serif',
    fontSize: '14px',
  },
};
