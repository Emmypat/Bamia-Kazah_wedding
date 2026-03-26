import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { loginWithPhone, logout } from '../utils/auth';

function isPhoneInput(value) {
  const clean = value.replace(/\s+/g, '');
  return /^(\+234|234|0)[789]\d{8,9}$/.test(clean) || /^0\d{10}$/.test(clean);
}

export default function Login() {
  const navigate = useNavigate();
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleLogin(e) {
    e.preventDefault();
    if (!isPhoneInput(phone)) {
      setError('Please enter a valid Nigerian phone number (e.g. 08012345678).');
      return;
    }
    setLoading(true); setError('');
    try {
      await logout().catch(() => {});
      await loginWithPhone(phone);
      navigate('/gallery');
    } catch (err) {
      if (err.name === 'NotAuthorizedException' || err.name === 'UserNotFoundException') {
        setError("Phone number not found. Please register first.");
      } else {
        setError(err.message || 'Sign in failed. Please try again.');
      }
    } finally { setLoading(false); }
  }

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <div style={styles.cardHeader}>
          <div style={styles.logo}>B &amp; K</div>
          <h1 style={styles.title}>Welcome Back</h1>
          <p style={styles.subtitle}>Enter your phone number to access your photos</p>
        </div>

        {error && <div className="alert alert-error">{error}</div>}

        <form onSubmit={handleLogin}>
          <div className="form-group">
            <label>Phone Number</label>
            <input
              type="text"
              placeholder="08012345678 or +2348012345678"
              value={phone}
              onChange={e => { setPhone(e.target.value); setError(''); }}
              required
            />
            {phone && (
              <span style={{ fontSize: '12px', marginTop: '4px', display: 'block',
                color: isPhoneInput(phone) ? '#166534' : '#7A6060' }}>
                {isPhoneInput(phone) ? '✓ Nigerian phone detected' : 'Enter a valid Nigerian number'}
              </span>
            )}
          </div>
          <button type="submit" className="btn btn-primary" style={styles.fullBtn} disabled={loading}>
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <p style={styles.switchLink}>
          New guest?{' '}
          <Link to="/register" style={styles.switchCta}>Register here</Link>
        </p>
        <p style={styles.adminLink}>
          Admin?{' '}
          <Link to="/admin-login" style={{ color: '#C4956A', fontSize: '12px', textDecoration: 'none' }}>
            Admin login
          </Link>
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
  adminLink: { textAlign: 'center', marginTop: '8px', fontSize: '13px', color: '#7A6060' },
};
