import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { login, logout } from '../utils/auth';

function isPhoneInput(value) {
  const clean = value.replace(/\s+/g, '');
  return /^(\+234|234|0)[789]\d{8,9}$/.test(clean) || /^0\d{10}$/.test(clean);
}

function normalizeContact(value) {
  if (isPhoneInput(value)) {
    let digits = value.replace(/\s+/g, '').replace(/^\+/, '');
    if (digits.startsWith('0')) digits = '234' + digits.slice(1);
    return `${digits}@weddingguest.ng`;
  }
  return value;
}

export default function Login() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ contact: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleLogin(e) {
    e.preventDefault();
    setLoading(true); setError('');
    try {
      await logout().catch(() => {});
      await login(normalizeContact(form.contact), form.password);
      navigate('/gallery');
    } catch (err) {
      setError(err.message || 'Login failed. Check your details and try again.');
    } finally { setLoading(false); }
  }

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <div style={styles.cardHeader}>
          <div style={styles.logo}>B &amp; K</div>
          <h1 style={styles.title}>Welcome Back</h1>
          <p style={styles.subtitle}>Sign in to access your wedding photos</p>
        </div>

        {error && <div className="alert alert-error">{error}</div>}

        <form onSubmit={handleLogin}>
          <div className="form-group">
            <label>Phone or Email</label>
            <input
              type="text"
              placeholder="08012345678 or sarah@example.com"
              value={form.contact}
              onChange={e => setForm({ ...form, contact: e.target.value })}
              required
            />
            {isPhoneInput(form.contact) && (
              <span style={{ fontSize: '12px', color: '#166534', marginTop: '4px', display: 'block' }}>
                ✓ Nigerian phone detected
              </span>
            )}
          </div>
          <div className="form-group">
            <label>Password</label>
            <input
              type="password"
              placeholder="••••••••"
              value={form.password}
              onChange={e => setForm({ ...form, password: e.target.value })}
              required
            />
          </div>
          <button type="submit" className="btn btn-primary" style={styles.fullBtn} disabled={loading}>
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <p style={styles.switchLink}>
          Don't have an account?{' '}
          <Link to="/register" style={styles.switchCta}>Register here</Link>
        </p>
      </div>
    </div>
  );
}

const styles = {
  page: {
    minHeight: 'calc(100vh - 68px)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    padding: '40px 16px',
    background: 'linear-gradient(160deg, #fff5f5 0%, #FDF6EE 100%)',
  },
  card: {
    background: 'white', borderRadius: '20px',
    boxShadow: '0 8px 40px rgba(122,20,40,0.12)',
    padding: '40px', width: '100%', maxWidth: '420px',
    border: '1px solid #EDE0D8',
  },
  cardHeader: { textAlign: 'center', marginBottom: '28px' },
  logo: {
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    width: '52px', height: '52px', borderRadius: '50%',
    background: 'linear-gradient(135deg, #7A1428, #5C0F1E)',
    color: 'white', fontFamily: "'Cormorant Garamond', Georgia, serif",
    fontSize: '18px', fontWeight: '600', marginBottom: '16px',
  },
  title: { fontSize: '26px', color: '#2D2020', margin: '0 0 6px' },
  subtitle: { fontSize: '14px', color: '#7A6060', margin: 0 },
  fullBtn: { width: '100%', justifyContent: 'center', padding: '14px', marginTop: '4px' },
  switchLink: { textAlign: 'center', marginTop: '20px', fontSize: '14px', color: '#7A6060' },
  switchCta: { color: '#7A1428', fontWeight: '600', textDecoration: 'none' },
};
