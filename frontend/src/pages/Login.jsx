import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { loginUser, useAuth } from '../utils/auth'
import toast from 'react-hot-toast'

export default function Login() {
  const navigate = useNavigate()
  const { refreshAuth } = useAuth()
  const [form, setForm] = useState({ email: '', password: '' })
  const [loading, setLoading] = useState(false)

  async function handleLogin(e) {
    e.preventDefault()
    setLoading(true)
    const result = await loginUser(form)
    setLoading(false)

    if (result.success) {
      await refreshAuth()
      toast.success('Welcome back! 👋')
      navigate('/gallery')
    } else {
      toast.error(result.message)
    }
  }

  return (
    <div className="page" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
      <div className="card" style={{ width: '100%', maxWidth: 420 }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ fontSize: 40, marginBottom: 8 }}>👋</div>
          <h1 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 32, fontWeight: 400, color: '#3a3a3a' }}>
            Welcome Back
          </h1>
          <p style={{ color: '#999', fontSize: 14, marginTop: 6 }}>Sign in to access your wedding photos</p>
        </div>

        <form onSubmit={handleLogin}>
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
              placeholder="Your password"
              value={form.password}
              onChange={e => setForm({ ...form, password: e.target.value })}
              required
            />
          </div>
          <button type="submit" className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }} disabled={loading}>
            {loading ? 'Signing in...' : 'Sign In →'}
          </button>
        </form>

        <p style={{ textAlign: 'center', marginTop: 24, fontSize: 14, color: '#999' }}>
          Don't have an account? <Link to="/register">Register here</Link>
        </p>
      </div>
    </div>
  )
}
