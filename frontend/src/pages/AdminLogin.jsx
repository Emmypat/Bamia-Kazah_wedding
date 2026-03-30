import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { login, logout, requestPasswordReset, confirmPasswordReset, confirmSignIn, getAccessToken } from '../utils/auth';

function decodeJwtGroups(token) {
  try {
    const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
    const groups = payload['cognito:groups'];
    if (!groups) return [];
    const str = Array.isArray(groups) ? groups.join(',') : String(groups).replace(/[\[\]]/g, '');
    return str.split(',').map(g => g.trim()).filter(Boolean);
  } catch { return []; }
}

async function redirectAfterLogin(navigate) {
  const token = await getAccessToken();
  const groups = token ? decodeJwtGroups(token) : [];
  if (groups.includes('coordinators') && !groups.includes('admins') && !groups.includes('superadmins')) {
    navigate('/coordinator/dashboard');
  } else {
    navigate('/gallery');
  }
}

export default function AdminLogin() {
  const navigate = useNavigate();
  // views: 'login' | 'newpassword' | 'forgot' | 'reset'
  const [view, setView] = useState('login');
  const [form, setForm] = useState({ email: '', password: '', code: '', newPassword: '', confirmPassword: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  function resetView(nextView) { setError(''); setSuccess(''); setView(nextView); }

  async function handleLogin(e) {
    e.preventDefault();
    setLoading(true); setError('');
    try {
      await logout().catch(() => {});
      const result = await login(form.email, form.password);
      if (result?.nextStep?.signInStep === 'CONFIRM_SIGN_IN_WITH_NEW_PASSWORD_REQUIRED') {
        setView('newpassword');
      } else {
        await redirectAfterLogin(navigate);
      }
    } catch (err) {
      setError(err.message || 'Login failed. Check your credentials.');
    } finally { setLoading(false); }
  }

  async function handleNewPassword(e) {
    e.preventDefault();
    if (form.newPassword !== form.confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    if (form.newPassword.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    setLoading(true); setError('');
    try {
      await confirmSignIn({ challengeResponse: form.newPassword });
      await redirectAfterLogin(navigate);
    } catch (err) {
      setError(err.message || 'Failed to set new password. Please try again.');
    } finally { setLoading(false); }
  }

  async function handleForgot(e) {
    e.preventDefault();
    setLoading(true); setError('');
    try {
      await requestPasswordReset(form.email);
      setSuccess(`A reset code was sent to ${form.email}. Check your inbox.`);
      setView('reset');
    } catch (err) {
      setError(err.message || 'Failed to send reset code. Check the email address.');
    } finally { setLoading(false); }
  }

  async function handleReset(e) {
    e.preventDefault();
    if (form.newPassword.length < 8) { setError('Password must be at least 8 characters.'); return; }
    setLoading(true); setError('');
    try {
      await confirmPasswordReset(form.email, form.code, form.newPassword);
      setSuccess('Password reset successfully! You can now sign in.');
      setView('login');
    } catch (err) {
      setError(err.message || 'Invalid or expired code. Please try again.');
    } finally { setLoading(false); }
  }

  const icons = { login: '🛡️', newpassword: '🔐', forgot: '📧', reset: '🔑' };
  const titles = { login: 'Admin Login', newpassword: 'Set New Password', forgot: 'Reset Password', reset: 'Enter New Password' };
  const subtitles = {
    login: 'Wedding administrators only',
    newpassword: 'Your temporary password has expired — please set a new one',
    forgot: 'Password reset code will be sent to the registered admin email',
    reset: 'Enter the code sent to the registered admin email',
  };

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <div style={styles.cardHeader}>
          <div style={styles.shield}>{icons[view]}</div>
          <h1 style={styles.title}>{titles[view]}</h1>
          <p style={styles.subtitle}>{subtitles[view]}</p>
        </div>

        {error && <div className="alert alert-error">{error}</div>}
        {success && <div style={styles.successAlert}>{success}</div>}

        {/* ── Login ── */}
        {view === 'login' && (
          <form onSubmit={handleLogin}>
            <div className="form-group">
              <label>Email</label>
              <input type="email" placeholder="Bamai Patrick" value={form.email}
                onChange={e => setForm({ ...form, email: e.target.value })} required />
            </div>
            <div className="form-group">
              <label>Password</label>
              <input type="password" placeholder="••••••••" value={form.password}
                onChange={e => setForm({ ...form, password: e.target.value })} required />
            </div>
            <button type="submit" className="btn btn-primary" style={styles.fullBtn} disabled={loading}>
              {loading ? 'Signing in...' : 'Sign In as Admin'}
            </button>
            <button type="button" onClick={() => resetView('forgot')} style={styles.linkBtn}>
              Forgot password?
            </button>
          </form>
        )}

        {/* ── Set new password (temp password expired) ── */}
        {view === 'newpassword' && (
          <form onSubmit={handleNewPassword}>
            <div className="form-group">
              <label>New Password</label>
              <input type="password" placeholder="Min 8 characters" value={form.newPassword}
                onChange={e => setForm({ ...form, newPassword: e.target.value })} required />
            </div>
            <div className="form-group">
              <label>Confirm New Password</label>
              <input type="password" placeholder="Repeat new password" value={form.confirmPassword}
                onChange={e => setForm({ ...form, confirmPassword: e.target.value })} required />
            </div>
            <button type="submit" className="btn btn-primary" style={styles.fullBtn} disabled={loading}>
              {loading ? 'Saving...' : 'Set Password & Sign In'}
            </button>
          </form>
        )}

        {/* ── Forgot ── */}
        {view === 'forgot' && (
          <form onSubmit={handleForgot}>
            <div className="form-group">
              <label>Admin Email</label>
              <input type="email" placeholder="Bamai Patrick" value={form.email}
                onChange={e => setForm({ ...form, email: e.target.value })} required />
            </div>
            <button type="submit" className="btn btn-primary" style={styles.fullBtn} disabled={loading}>
              {loading ? 'Sending...' : 'Send Reset Code'}
            </button>
            <button type="button" onClick={() => resetView('login')} style={styles.linkBtn}>
              ← Back to login
            </button>
          </form>
        )}

        {/* ── Reset ── */}
        {view === 'reset' && (
          <form onSubmit={handleReset}>
            <div className="form-group">
              <label>Admin Email</label>
              <input type="email" value={form.email}
                onChange={e => setForm({ ...form, email: e.target.value })} required />
            </div>
            <div className="form-group">
              <label>Reset Code</label>
              <input type="text" placeholder="6-digit code from email" value={form.code}
                onChange={e => setForm({ ...form, code: e.target.value })} required />
            </div>
            <div className="form-group">
              <label>New Password</label>
              <input type="password" placeholder="Min 8 characters" value={form.newPassword}
                onChange={e => setForm({ ...form, newPassword: e.target.value })} required />
            </div>
            <button type="submit" className="btn btn-primary" style={styles.fullBtn} disabled={loading}>
              {loading ? 'Resetting...' : 'Set New Password'}
            </button>
            <button type="button" onClick={() => resetView('forgot')} style={styles.linkBtn}>
              ← Resend code
            </button>
          </form>
        )}

        <p style={styles.note}>
          Guests should{' '}
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
  subtitle: { fontSize: '14px', color: '#7A6060', margin: 0, lineHeight: '1.5' },
  fullBtn: { width: '100%', justifyContent: 'center', padding: '14px', marginTop: '4px' },
  linkBtn: {
    width: '100%', marginTop: '10px', background: 'none',
    border: 'none', color: '#7A1428', fontSize: '13px',
    cursor: 'pointer', padding: '8px', textAlign: 'center', fontWeight: '500',
  },
  note: { textAlign: 'center', marginTop: '20px', fontSize: '13px', color: '#7A6060', lineHeight: '1.6' },
  successAlert: {
    background: '#D1FAE5', color: '#065F46', border: '1px solid #6EE7B7',
    borderRadius: '10px', padding: '12px 16px', marginBottom: '16px', fontSize: '14px',
  },
};
