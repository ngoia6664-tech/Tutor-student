import { useState } from 'react'
import { Navigate } from 'react-router-dom'
import { supabase } from '../lib/supabase.js'
import { errMsg } from '../lib/errors.js'
import { useAuth } from '../contexts/AuthContext.jsx'
import Loading from '../components/Loading.jsx'
import ErrorBox from '../components/ErrorBox.jsx'
import ThemeToggle from '../components/ThemeToggle.jsx'
import Icon from '../components/Icon.jsx'

export default function Login() {
  const { session, profile, profileError, loading, signOut } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)

  if (loading) return <Loading full text="Đang kiểm tra đăng nhập..." />
  // Đã đăng nhập: chuyển thẳng tới trang theo vai trò
  if (session && profile) return <Navigate to={`/${profile.role}`} replace />

  async function handleSubmit(e) {
    e.preventDefault()
    setSubmitting(true)
    setError(null)
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password })
    if (error) setError(errMsg(error))
    setSubmitting(false)
  }

  return (
    <div className="login-wrap">
      <ThemeToggle className="login-theme" />
      <form className="card login-card" onSubmit={handleSubmit}>
        <h1 className="login-logo">
          <img className="logo-dark" src="/logo-dark.webp" alt="Study with Duy Anh" />
          <img className="logo-light" src="/logo-light.webp" alt="Study with Duy Anh" />
        </h1>
        <p className="muted">Đăng nhập bằng tài khoản được gia sư cấp.</p>

        {session && profileError && (
          <ErrorBox message={profileError}>
            <button type="button" className="btn btn-small btn-ghost" onClick={signOut}>
              <Icon name="logout" />
              Đăng xuất
            </button>
          </ErrorBox>
        )}
        <ErrorBox message={error} />

        <label className="field">
          <span>Email</span>
          <input type="email" autoComplete="username" required value={email} onChange={(e) => setEmail(e.target.value)} />
        </label>
        <label className="field">
          <span>Mật khẩu</span>
          <input
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </label>
        <button type="submit" className="btn btn-primary btn-block" disabled={submitting}>
          <Icon name="login" />
          {submitting ? 'Đang đăng nhập...' : 'Đăng nhập'}
        </button>
      </form>
    </div>
  )
}
