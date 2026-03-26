import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { registerOrLoginGuest, logout } from '../utils/auth';

function phoneToEmail(phone) {
  let digits = phone.replace(/\s+/g, '').replace(/^\+/, '');
  if (digits.startsWith('0')) digits = '234' + digits.slice(1);
  return `${digits}@weddingguest.ng`;
}

function isPhoneInput(value) {
  const clean = value.replace(/\s+/g, '');
  return /^(\+234|234|0)[789]\d{8,9}$/.test(clean) || /^0\d{10}$/.test(clean);
}

export default function Register() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', phone: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  function handleChange(e) {
    setForm({ ...form, [e.target.name]: e.target.value });
    setError('');
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!isPhoneInput(form.phone)) {
      setError('Please enter a valid Nigerian phone number (e.g. 08012345678).');
      return;
    }
    setLoading(true); setError('');
    const email = phoneToEmail(form.phone);
    try {
      await logout().catch(() => {});
      await registerOrLoginGuest({ name: form.name, email, phone: form.phone });
      navigate('/gallery');
    } catch (err) {
      setError(err.message || 'Registration failed. Please try again.');
    } finally { setLoading(false); }
  }

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <div style={styles.cardHeader}>
          <div style={styles.logo}>B &amp; K</div>
          <h1 style={styles.title}>Join the Celebration</h1>
          <p style={styles.subtitle}>Enter your name and phone number to get started</p>
        </div>

        {error && <div className="alert alert-error">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Your Name</label>
            <input
              name="name"
              placeholder="e.g. Sarah Johnson"
              value={form.name}
              onChange={handleChange}
              required
            />
          </div>
          <div className="form-group">
            <label>Phone Number</label>
            <input
              name="phone"
              placeholder="08012345678 or +2348012345678"
              value={form.phone}
              onChange={handleChange}
              required
            />
            {form.phone && (
              <span style={{ fontSize: '12px', marginTop: '4px', display: 'block',
                color: isPhoneInput(form.phone) ? '#166534' : '#7A6060' }}>
                {isPhoneInput(form.phone)
                  ? '✓ Phone number accepted'
                  : 'Enter a valid Nigerian number (e.g. 08012345678)'}
              </span>
            )}
          </div>
          <button type="submit" className="btn btn-primary" style={styles.fullBtn} disabled={loading}>
            {loading ? 'Getting you in...' : 'Get Started'}
          </button>
        </form>

        <p style={styles.switchLink}>
          Already joined?{' '}
          <Link to="/login" style={styles.switchCta}>Sign in here</Link>
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
    padding: '40px', width: '100%', maxWidth: '440px',
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
  fullBtn: { width: '100%', justifyContent: 'center', marginTop: '4px', padding: '14px' },
  switchLink: { textAlign: 'center', marginTop: '18px', fontSize: '14px', color: '#7A6060' },
  switchCta: { color: '#7A1428', fontWeight: '600', textDecoration: 'none' },
  adminLink: { textAlign: 'center', marginTop: '8px', fontSize: '13px', color: '#7A6060' },
};
