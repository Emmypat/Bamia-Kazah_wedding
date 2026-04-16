import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { login, confirmSignIn } from '../utils/auth';

export default function CoordinatorLogin() {
  const [view, setView] = useState('login'); // 'login' | 'newpassword'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [nameValue, setNameValue] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  async function handleLogin(e) {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const result = await login(email.trim(), password);
      if (result?.nextStep?.signInStep === 'CONFIRM_SIGN_IN_WITH_NEW_PASSWORD_REQUIRED') {
        setView('newpassword');
      } else {
        navigate('/coordinator/dashboard');
      }
    } catch (err) {
      setError(err.message || 'Login failed. Check your email and password.');
    } finally {
      setLoading(false);
    }
  }

  async function handleNewPassword(e) {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await confirmSignIn({
        challengeResponse: newPassword,
        options: { userAttributes: { name: nameValue.trim() || email.trim() } },
      });
      navigate('/coordinator/dashboard');
    } catch (err) {
      setError(err.message || 'Failed to set new password.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="page">
      <div style={styles.card}>
        <div style={styles.header}>
          <p style={styles.eyebrow}>BAMAI &amp; KAZAH</p>
          <h1 style={styles.title}>Registrar Login</h1>
          <p style={styles.subtitle}>
            {view === 'newpassword'
              ? 'Set a new password to continue'
              : 'Sign in with your coordinator credentials'}
          </p>
        </div>

        {view === 'login' && (
          <form onSubmit={handleLogin}>
            <div className="form-group">
              <label>Email Address</label>
              <input
                type="email"
                placeholder="coordinator@example.com"
                value={email}
                onChange={e => { setEmail(e.target.value); setError(''); }}
                required
              />
            </div>
            <div className="form-group">
              <label>Password</label>
              <input
                type="password"
                placeholder="Your password"
                value={password}
                onChange={e => { setPassword(e.target.value); setError(''); }}
                required
              />
            </div>
            {error && <div className="alert alert-error" style={{ marginBottom: '12px' }}>{error}</div>}
            <button type="submit" className="btn btn-primary" style={styles.fullBtn} disabled={loading}>
              {loading ? 'Signing in...' : 'Sign In →'}
            </button>
          </form>
        )}

        {view === 'newpassword' && (
          <form onSubmit={handleNewPassword}>
            <p style={styles.infoBox}>
              This is your first login. Please set a new permanent password.
            </p>
            <div className="form-group">
              <label>Your Full Name</label>
              <input
                type="text"
                placeholder="e.g. Halima Musa"
                value={nameValue}
                onChange={e => { setNameValue(e.target.value); setError(''); }}
                required
              />
            </div>
            <div className="form-group">
              <label>New Password</label>
              <input
                type="password"
                placeholder="Min 8 characters"
                value={newPassword}
                onChange={e => { setNewPassword(e.target.value); setError(''); }}
                required
              />
            </div>
            <div className="form-group">
              <label>Confirm Password</label>
              <input
                type="password"
                placeholder="Repeat new password"
                value={confirmPassword}
                onChange={e => { setConfirmPassword(e.target.value); setError(''); }}
                required
              />
            </div>
            {error && <div className="alert alert-error" style={{ marginBottom: '12px' }}>{error}</div>}
            <button type="submit" className="btn btn-primary" style={styles.fullBtn} disabled={loading}>
              {loading ? 'Setting password...' : 'Set Password & Continue →'}
            </button>
          </form>
        )}

        <p style={styles.footer}>
          Having trouble? Contact the wedding admin team.
        </p>
      </div>
    </div>
  );
}

const styles = {
  card: {
    background: 'white',
    borderRadius: '20px',
    padding: '40px 32px',
    border: '1px solid #EDE0D8',
    boxShadow: '0 4px 24px rgba(122,20,40,0.07)',
    maxWidth: '420px',
    margin: '0 auto',
  },
  header: { textAlign: 'center', marginBottom: '28px' },
  eyebrow: {
    fontSize: '10px', letterSpacing: '3px', textTransform: 'uppercase',
    color: '#C4956A', margin: '0 0 8px',
  },
  title: { fontSize: '26px', color: '#2D2020', margin: '0 0 6px' },
  subtitle: { fontSize: '13px', color: '#7A6060', margin: 0 },
  fullBtn: { width: '100%', justifyContent: 'center', padding: '14px', marginTop: '4px' },
  infoBox: {
    background: '#EFF6FF', color: '#1E3A5F', border: '1px solid #BFDBFE',
    borderRadius: '10px', padding: '12px 16px', fontSize: '13px',
    marginBottom: '16px',
  },
  footer: { textAlign: 'center', marginTop: '20px', fontSize: '12px', color: '#7A6060' },
};
