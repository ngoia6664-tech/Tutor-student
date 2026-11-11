import { useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { supabase } from '../lib/supabase.js'
import { errMsg } from '../lib/errors.js'
import { prefersReducedMotion } from '../lib/settings.js'
import { canAnimateClick, clearTransition, DASH_INTRO_KEY, markTransition, readTransition } from '../lib/authTransition.js'
import { useAuth } from '../contexts/AuthContext.jsx'
import Loading from '../components/Loading.jsx'
import ErrorBox from '../components/ErrorBox.jsx'
import ThemeToggle from '../components/ThemeToggle.jsx'
import Icon from '../components/Icon.jsx'

const ARRIVE_MS = 2300 // thẻ trượt vào + 4 đinh tán + gấu ló chào (khớp styles/auth.css)
const LEAVE_MS = 640
// Thời lượng các cảnh ngắn, hết thì về 'idle' (khớp styles/auth.css)
const PHASE_MS = { arrive: ARRIVE_MS, error: 480, success: 900 }
const EMAIL_KEY = 'login-email'
const readEmail = () => { try { return localStorage.getItem(EMAIL_KEY) || '' } catch { return '' } }

export default function Login() {
  const { session, profile, profileError, loading, signOut } = useAuth()
  const [email, setEmail] = useState(readEmail)
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)
  const [capsLock, setCapsLock] = useState(false)
  const [showForgot, setShowForgot] = useState(false)
  // Từ Trang chủ bấm Đăng nhập sang thì diễn cảnh vào; xong thì về 'idle' để hover/focus chạy bình thường
  const [phase, setPhase] = useState(() => (readTransition('login') ? 'arrive' : 'idle'))
  useEffect(clearTransition, [])

  useEffect(() => {
    if (!(phase in PHASE_MS)) return
    // Thành công: hết cảnh 'success' mới cho chuyển vào app (xem Navigate bên dưới)
    const t = setTimeout(() => setPhase(phase === 'success' ? 'done' : 'idle'), PHASE_MS[phase])
    return () => clearTimeout(t)
  }, [phase])

  // Chỉ hiện màn hình kiểm tra toàn trang khi đã có session đăng nhập cũ và đang lấy profile,
  // hoặc khi phase là 'done' mà profile mạng chậm chưa về kịp.
  // Khi đang diễn cảnh 'arrive' (từ Trang chủ sang) hoặc 'success' (đang trượt vào app): không chặn bằng Loading full để hoạt cảnh liền mạch.
  if (phase === 'done' && (!session || !profile)) {
    return <Loading full text="Đang vào không gian học tập..." />
  }
  if (loading && session && !profile && phase !== 'arrive' && phase !== 'success') {
    return <Loading full text="Đang kiểm tra đăng nhập..." />
  }
  // Đã đăng nhập: chuyển thẳng tới trang theo vai trò (khi không trong cảnh success đang diễn)
  if (session && profile && phase !== 'success') return <Navigate to={`/${profile.role}`} replace />

  async function handleSubmit(e) {
    e.preventDefault()
    setSubmitting(true)
    setError(null)
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password })
    setSubmitting(false)
    if (error) {
      setError(errMsg(error))
      if (!prefersReducedMotion()) setPhase('error')
      return
    }
    try {
      localStorage.setItem(EMAIL_KEY, email.trim())
      sessionStorage.removeItem(DASH_INTRO_KEY) // vào dashboard thì diễn màn xuất hiện
    } catch { /* không lưu được thì thôi */ }
    if (!prefersReducedMotion()) setPhase('success')
  }

  // Về Trang chủ: tháo đinh tán, thẻ trượt đi rồi mới chuyển trang
  function handleBack(e) {
    if (phase === 'leave' || !canAnimateClick(e)) return
    e.preventDefault()
    const href = e.currentTarget.href
    markTransition('home')
    setPhase('leave')
    setTimeout(() => window.location.assign(href), LEAVE_MS)
  }

  return (
    <div className={`login-wrap is-${phase}`}>
      <a href="/home.html" className="login-back" onClick={handleBack}>← Trang chủ</a>
      <ThemeToggle className="login-theme" />
      <div className="login-stage">
        <form className="card login-card" onSubmit={handleSubmit}>
          <span className="brass-rivet rivet-tl" aria-hidden="true" />
          <span className="brass-rivet rivet-tr" aria-hidden="true" />
          <span className="brass-rivet rivet-br" aria-hidden="true" />
          <span className="brass-rivet rivet-bl" aria-hidden="true" />
          <h1 className="login-logo">
            <img className="logo-dark" src="/logo-dark.svg?v=2" alt="Study with Duy Anh" />
            <img className="logo-light" src="/logo-light.svg?v=2" alt="Study with Duy Anh" />
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
            <div className="login-input">
              <Icon name="mail" />
              <input type="email" autoComplete="username" required value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
          </label>
          <label className="field">
            <span>Mật khẩu</span>
            <div className="login-input">
              <Icon name="lock" />
              <input
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => setCapsLock(e.getModifierState('CapsLock'))}
                onKeyUp={(e) => setCapsLock(e.getModifierState('CapsLock'))}
                onBlur={() => setCapsLock(false)}
                aria-describedby={capsLock ? 'login-caps' : undefined}
              />
              <button
                type="button"
                className="login-eye"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                aria-pressed={showPassword}
              >
                <Icon name={showPassword ? 'eyeOff' : 'eye'} />
              </button>
            </div>
            {capsLock && <small id="login-caps" className="login-caps" role="status">Đang bật Caps Lock</small>}
          </label>
          <div className="login-forgot">
            <button type="button" className="login-link" aria-expanded={showForgot} onClick={() => setShowForgot((v) => !v)}>
              Quên mật khẩu?
            </button>
            {showForgot && <p className="muted">Tài khoản do gia sư cấp: nhắn gia sư để được đặt lại mật khẩu.</p>}
          </div>
          <button type="submit" className="peek-btn btn btn-primary btn-block" disabled={submitting}>
            <span className="peek" aria-hidden="true" />
            {submitting ? 'Đang đăng nhập...' : 'Đăng nhập'}
            <Icon name="login" />
          </button>
        </form>
      </div>
    </div>
  )
}
