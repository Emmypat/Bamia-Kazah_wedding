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
    setLoading(true);
    setError('');
    try {
      await registerGuest({ name: form.name, email: form.email, password: form.password });
      setMessage('Check your email for a verification code!');
      setStep('confirm');
    } catch (err) {
      setError(err.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  async function handleConfirm(e) {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await confirmRegistration(form.email, form.code);
      await login(form.email, form.password);
      navigate('/upload');
    } catch (err) {
      setError(err.message || 'Verification failed. Please check the code.');
    } finally {
      setLoading(false);
    }
  }

  async function handleLogin(e) {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await login(form.email, form.password);
      navigate('/upload');
    } catch (err) {
      setError(err.message || 'Login failed. Check your email and password.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="page" style={{ maxWidth: '480px' }}>
      <div className="card">
        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <div style={{ fontSize: '40px' }}>💒</div>
          <h1 style={styles.title}>
            {step === 'login' ? 'Welcome Back' : step === 'confirm' ? 'Verify Email' : 'Join the Celebration'}
          </h1>
          <p style={styles.subtitle}>
            {step === 'login'
              ? 'Sign in to access your photos'
              : step === 'confirm'
              ? 'Enter the code we sent to your email'
              : 'Register to upload and find your photos'}
          </p>
        </div>

        {error && <div className="alert alert-error">{error}</div>}
        {message && <div className="alert alert-success">{message}</div>}

        {/* Register Form */}
        {step === 'register' && (
          <form onSubmit={handleRegister}>
            <div className="form-group">
              <label>Your Name</label>
              <input name="name" placeholder="Sarah Johnson" value={form.name} onChange={handleChange} required />
            </div>
            <div className="form-group">
              <label>Email Address</label>
              <input name="email" type="email" placeholder="sarah@example.com" value={form.email} onChange={handleChange} required />
            </div>
            <div className="form-group">
              <label>Password (min 8 characters)</label>
              <input name="password" type="password" placeholder="••••••••" value={form.password} onChange={handleChange} required minLength={8} />
            </div>
            <button type="submit" className="btn-primary" style={{ width: '100%' }} disabled={loading}>
              {loading ? 'Creating account...' : 'Create Account →'}
            </button>
            <p style={styles.switchLink}>
              Already registered?{' '}
              <span style={styles.link} onClick={() => setStep('login')}>Sign in</span>
            </p>
          </form>
        )}

        {/* Confirm Form */}
        {step === 'confirm' && (
          <form onSubmit={handleConfirm}>
            <div className="form-group">
              <label>Verification Code</label>
              <input name="code" placeholder="123456" value={form.code} onChange={handleChange} required maxLength={6} style={{ letterSpacing: '8px', fontSize: '20px', textAlign: 'center' }} />
            </div>
            <button type="submit" className="btn-primary" style={{ width: '100%' }} disabled={loading}>
              {loading ? 'Verifying...' : 'Verify & Sign In →'}
            </button>
          </form>
        )}

        {/* Login Form */}
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
            <button type="submit" className="btn-primary" style={{ width: '100%' }} disabled={loading}>
              {loading ? 'Signing in...' : 'Sign In →'}
            </button>
            <p style={styles.switchLink}>
              No account?{' '}
              <span style={styles.link} onClick={() => setStep('register')}>Register here</span>
            </p>
          </form>
        )}
      </div>
    </div>
  );
}

const styles = {
  title: { fontSize: '24px', fontWeight: '400', margin: '8px 0 4px', color: '#3a3a3a' },
  subtitle: { fontSize: '14px', color: '#888', margin: 0 },
  switchLink: { textAlign: 'center', marginTop: '16px', fontSize: '14px', color: '#888' },
  link: { color: '#c49a9a', cursor: 'pointer', textDecoration: 'underline' },
};
