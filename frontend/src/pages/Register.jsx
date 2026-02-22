import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { registerUser, confirmRegistration } from '../utils/auth'
import toast from 'react-hot-toast'

export default function Register() {
  const navigate = useNavigate()
  const [step, setStep] = useState('register') // 'register' | 'confirm'
  const [loading, setLoading] = useState(false)
  const [email, setEmail] = useState('')
  const [form, setForm] = useState({ name: '', email: '', password: '' })
  const [code, setCode] = useState('')

  async function handleRegister(e) {
    e.preventDefault()
    setLoading(true)
    const result = await registerUser(form)
    setLoading(false)

    if (result.success) {
      setEmail(form.email)
      if (result.needsConfirmation) {
        setStep('confirm')
        toast.success('Check your email for a verification code!')
      } else {
        toast.success('Account created! Please sign in.')
        navigate('/login')
      }
    } else {
      toast.error(result.message)
    }
  }

  async function handleConfirm(e) {
    e.preventDefault()
    setLoading(true)
    const result = await confirmRegistration({ email, code })
    setLoading(false)

    if (result.success) {
      toast.success('Email verified! You can now sign in.')
      navigate('/login')
    } else {
      toast.error(result.message)
    }
  }

  return (
    <div className="page" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
      <div className="card" style={{ width: '100%', maxWidth: 420 }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ fontSize: 40, marginBottom: 8 }}>💒</div>
          <h1 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 32, fontWeight: 400, color: '#3a3a3a' }}>
            {step === 'register' ? 'Join the Album' : 'Verify Email'}
          </h1>
          <p style={{ color: '#999', fontSize: 14, marginTop: 6 }}>
            {step === 'register'
              ? 'Create your guest account to upload and view photos'
              : `We sent a code to ${email}`}
          </p>
        </div>

        {step === 'register' ? (
          <form onSubmit={handleRegister}>
            <div className="form-group">
              <label>Your Name</label>
              <input
                type="text"
                placeholder="Sarah Johnson"
                value={form.name}
                onChange={e => setForm({ ...form, name: e.target.value })}
                required
              />
            </div>
            <div className="form-group">
              <label>Email Address</label>
              <input
                type="email"
                placeholder="sarah@example.com"
                value={form.email}
                onChange={e => setForm({ ...form, email: e.target.value })}
                required
              />
            </div>
            <div className="form-group">
              <label>Password</label>
              <input
                type="password"
                placeholder="At least 8 characters"
                value={form.password}
                onChange={e => setForm({ ...form, password: e.target.value })}
                minLength={8}
                required
              />
            </div>
            <button type="submit" className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }} disabled={loading}>
              {loading ? 'Creating account...' : 'Create Account →'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleConfirm}>
            <div className="form-group">
              <label>Verification Code</label>
              <input
                type="text"
                placeholder="123456"
                value={code}
                onChange={e => setCode(e.target.value)}
                maxLength={6}
                required
                style={{ textAlign: 'center', fontSize: 24, letterSpacing: 8 }}
              />
            </div>
            <button type="submit" className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }} disabled={loading}>
              {loading ? 'Verifying...' : 'Verify Email →'}
            </button>
          </form>
        )}

        <p style={{ textAlign: 'center', marginTop: 24, fontSize: 14, color: '#999' }}>
          Already have an account? <Link to="/login">Sign in</Link>
        </p>
      </div>
    </div>
  )
}
