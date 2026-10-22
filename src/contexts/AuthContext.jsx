import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase.js'
import { errMsg } from '../lib/errors.js'
import { setMusicChoice } from '../lib/spaceSound.js'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  // undefined = chưa biết (đang khởi động), null = chưa đăng nhập
  const [session, setSession] = useState(undefined)
  // Gắn profile với userId để tránh hiển thị nhầm profile của phiên cũ
  const [profileState, setProfileState] = useState({ userId: null, profile: null, error: null })
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange((_event, s) => setSession(s ?? null))
    return () => data.subscription.unsubscribe()
  }, [])

  const userId = session?.user?.id ?? null

  // Tải hồ sơ (role, nhóm...) mỗi khi người dùng thay đổi
  useEffect(() => {
    if (!userId) return
    let active = true
    supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle()
      .then(({ data, error }) => {
        if (!active) return
        let message = null
        if (error) message = errMsg(error)
        else if (!data)
          message =
            'Tài khoản này chưa có hồ sơ trong bảng profiles. Hãy chạy lại supabase/schema.sql (phần tạo hồ sơ cho tài khoản có sẵn) – xem README.'
        else if (!['tutor', 'student'].includes(data.role)) message = `Vai trò không hợp lệ: ${data.role}`
        setProfileState({ userId, profile: message ? null : data, error: message })
      })
    return () => {
      active = false
    }
  }, [userId, reloadKey])

  const profileReady = !userId || profileState.userId === userId
  const value = {
    session,
    user: session?.user ?? null,
    profile: userId && profileReady ? profileState.profile : null,
    profileError: userId && profileReady ? profileState.error : null,
    loading: session === undefined || !profileReady,
    reloadProfile: () => {
      setProfileState({ userId: null, profile: null, error: null })
      setReloadKey((k) => k + 1)
    },
    signOut: () => {
      // Phiên mới thì hỏi lại "Bật nhạc nền không?" khi mở kính viễn vọng
      setMusicChoice(null)
      return supabase.auth.signOut()
    },
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth phải nằm trong AuthProvider')
  return ctx
}
