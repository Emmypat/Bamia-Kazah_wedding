import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { registerGuest, confirmRegistration, login } from '../utils/auth';

export default function Register() {
  const navigate = useNavigate();
  const [step, setStep] = useState('register'); // 'register' | 'confirm' | 'login'
  const [form, setForm] = useState({ name: '', email: '', password: '', code: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  function handleChange(e) {
    setForm({ ...form, [e.target.name]: e.target.value });
    setError('');
  }

  async function handleRegister(e) {
    e.preventDefault();
    setLoading(true); setError('');
    try {
      await registerGuest({ name: form.name, email: form.email, password: form.password });
      setMessage('Check your email for a 6-digit verification code.');
      setStep('confirm');
    } catch (err) {
      setError(err.message || 'Registration failed. Please try again.');
    } finally { setLoading(false); }
  }

  async function handleConfirm(e) {
    e.preventDefault();
    setLoading(true); setError('');
    try {
      await confirmRegistration(form.email, form.code);
      await login(form.email, form.password);
      navigate('/gallery');
    } catch (err) {
      setError(err.message || 'Verification failed. Please check the code.');
    } finally { setLoading(false); }
  }

  async function handleLogin(e) {
    e.preventDefault();
    setLoading(true); setError('');
    try {
      await login(form.email, form.password);
      navigate('/gallery');
    } catch (err) {
      setError(err.message || 'Login failed. Check your email and password.');
    } finally { setLoading(false); }
  }

  const titles = {
    register: 'Join the Celebration',
    confirm:  'Verify Your Email',
    login:    'Welcome Back',
  };
  const subtitles = {
    register: 'Create your guest account to upload and find your photos',
    confirm:  `We sent a code to ${form.email}`,
    login:    'Sign in to access your wedding photos',
  };

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        {/* Header */}
        <div style={styles.cardHeader}>
          <div style={styles.logo}>B &amp; K</div>
          <h1 style={styles.title}>{titles[step]}</h1>
          <p style={styles.subtitle}>{subtitles[step]}</p>
        </div>

        {/* Step indicators */}
        <div style={styles.steps}>
          {['register', 'confirm'].map((s, i) => (
            <React.Fragment key={s}>
              <div style={{ ...styles.stepDot, ...(step === s || (step === 'login' && i === 0) ? styles.stepDotActive : step === 'confirm' && i === 0 ? styles.stepDotDone : {}) }}>
                {step === 'confirm' && i === 0 ? '✓' : i + 1}
              </div>
              {i === 0 && <div style={{ ...styles.stepLine, ...(step === 'confirm' ? styles.stepLineDone : {}) }} />}
            </React.Fragment>
          ))}
        </div>

        {error   && <div className="alert alert-error">{error}</div>}
        {message && <div className="alert alert-success">{message}</div>}

        {/* Register */}
        {step === 'register' && (
          <form onSubmit={handleRegister}>
            <div className="form-group">
              <label>Your Name</label>
              <input name="name" placeholder="e.g. Sarah Johnson" value={form.name} onChange={handleChange} required />
            </div>
            <div className="form-group">
              <label>Email Address</label>
              <input name="email" type="email" placeholder="sarah@example.com" value={form.email} onChange={handleChange} required />
            </div>
            <div className="form-group">
              <label>Password (min 8 characters)</label>
              <input name="password" type="password" placeholder="••••••••" value={form.password} onChange={handleChange} required minLength={8} />
            </div>
            <button type="submit" className="btn btn-primary" style={styles.fullBtn} disabled={loading}>
              {loading ? 'Creating account...' : 'Create Account'}
            </button>
            <p style={styles.switchLink}>
              Already registered?{' '}
              <span style={styles.switchCta} onClick={() => { setStep('login'); setError(''); }}>Sign in</span>
            </p>
          </form>
        )}

        {/* Confirm */}
        {step === 'confirm' && (
          <form onSubmit={handleConfirm}>
            <div className="form-group" style={{ textAlign: 'center' }}>
              <label style={{ textAlign: 'center' }}>Verification Code</label>
              <input
                name="code"
                placeholder="123456"
                value={form.code}
                onChange={handleChange}
                required
                maxLength={6}
                style={{ letterSpacing: '10px', fontSize: '24px', textAlign: 'center', fontWeight: '700' }}
              />
            </div>
            <button type="submit" className="btn btn-primary" style={styles.fullBtn} disabled={loading}>
              {loading ? 'Verifying...' : 'Verify & Sign In'}
            </button>
            <p style={styles.switchLink}>
              Didn't get the code?{' '}
              <span style={styles.switchCta} onClick={() => { setStep('register'); setError(''); }}>Go back</span>
            </p>
          </form>
        )}

        {/* Login */}
        {step === 'login' && (
          <form onSubmit={handleLogin}>
            <div className="form-group">
              <label>Email Address</label>
              <input name="email" type="email" placeholder="sarah@example.com" value={form.email} onChange={handleChange} required />
            </div>
            <div className="form-group">
              <label>Password</label>
              <input name="password" type="password" placeholder="••••••••" value={form.password} onChange={handleChange} required />
            </div>
            <button type="submit" className="btn btn-primary" style={styles.fullBtn} disabled={loading}>
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
            <p style={styles.switchLink}>
              No account yet?{' '}
              <span style={styles.switchCta} onClick={() => { setStep('register'); setError(''); }}>Register here</span>
            </p>
          </form>
        )}
      </div>
    </div>
  );
}

const styles = {
  page: {
    minHeight: 'calc(100vh - 68px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '40px 16px',
    background: 'linear-gradient(160deg, #fff5f5 0%, #FDF6EE 100%)',
  },
  card: {
    background: 'white',
    borderRadius: '20px',
    boxShadow: '0 8px 40px rgba(122,20,40,0.12)',
    padding: '40px',
    width: '100%',
    maxWidth: '440px',
    border: '1px solid #EDE0D8',
  },
  cardHeader: { textAlign: 'center', marginBottom: '28px' },
  logo: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '52px',
    height: '52px',
    borderRadius: '50%',
    background: 'linear-gradient(135deg, #7A1428, #5C0F1E)',
    color: 'white',
    fontFamily: "'Cormorant Garamond', Georgia, serif",
    fontSize: '18px',
    fontWeight: '600',
    marginBottom: '16px',
  },
  title: { fontSize: '26px', color: '#2D2020', margin: '0 0 6px' },
  subtitle: { fontSize: '14px', color: '#7A6060', margin: 0 },
  steps: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '0',
    marginBottom: '28px',
  },
  stepDot: {
    width: '30px', height: '30px',
    borderRadius: '50%',
    background: '#EDE0D8',
    color: '#7A6060',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: '12px', fontWeight: '700',
  },
  stepDotActive: { background: '#7A1428', color: 'white' },
  stepDotDone: { background: '#5C3D2E', color: 'white' },
  stepLine: { width: '60px', height: '2px', background: '#EDE0D8' },
  stepLineDone: { background: '#5C3D2E' },
  fullBtn: { width: '100%', justifyContent: 'center', marginTop: '4px', padding: '14px' },
  switchLink: { textAlign: 'center', marginTop: '18px', fontSize: '14px', color: '#7A6060' },
  switchCta: { color: '#7A1428', cursor: 'pointer', fontWeight: '600' },
};
