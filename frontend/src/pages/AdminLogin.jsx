import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { login, logout } from '../utils/auth';

export default function AdminLogin() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleLogin(e) {
    e.preventDefault();
    setLoading(true); setError('');
    try {
      await logout().catch(() => {});
      await login(form.email, form.password);
      navigate('/gallery');
    } catch (err) {
      setError(err.message || 'Login failed. Check your credentials.');
    } finally { setLoading(false); }
  }

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <div style={styles.cardHeader}>
          <div style={styles.shield}>🛡️</div>
          <h1 style={styles.title}>Admin Login</h1>
          <p style={styles.subtitle}>Wedding administrators only</p>
        </div>

        {error && <div className="alert alert-error">{error}</div>}

        <form onSubmit={handleLogin}>
          <div className="form-group">
            <label>Email</label>
            <input
              type="email"
              placeholder="admin@example.com"
              value={form.email}
              onChange={e => setForm({ ...form, email: e.target.value })}
              required
            />
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
            {loading ? 'Signing in...' : 'Sign In as Admin'}
          </button>
        </form>

        <p style={styles.note}>
          This page is for wedding administrators only. Guests should{' '}
          <a href="/register" style={{ color: '#7A1428', textDecoration: 'none', fontWeight: '600' }}>
            register here
          </a>.
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
    background: 'linear-gradient(160deg, #1a0a0e 0%, #2D1010 100%)',
  },
  card: {
    background: 'white', borderRadius: '20px',
    boxShadow: '0 8px 40px rgba(0,0,0,0.4)',
    padding: '40px', width: '100%', maxWidth: '420px',
    border: '1px solid #EDE0D8',
  },
  cardHeader: { textAlign: 'center', marginBottom: '28px' },
  shield: { fontSize: '40px', display: 'block', marginBottom: '12px' },
  title: { fontSize: '26px', color: '#2D2020', margin: '0 0 6px' },
  subtitle: { fontSize: '14px', color: '#7A6060', margin: 0 },
  fullBtn: { width: '100%', justifyContent: 'center', padding: '14px', marginTop: '4px' },
  note: { textAlign: 'center', marginTop: '20px', fontSize: '13px', color: '#7A6060', lineHeight: '1.6' },
};
