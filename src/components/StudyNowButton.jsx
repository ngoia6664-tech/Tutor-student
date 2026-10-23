import { useState } from 'react'
import { useAuth } from '../contexts/AuthContext.jsx'
import { setStudyChapter, useStudyChapterId } from '../lib/studyNow.js'
import { errMsg } from '../lib/errors.js'
import { mascotSay } from '../lib/celebrate.js'

// Nút "📍 Đánh dấu đang học" cho một chương (học sinh). Chương đó đã đánh dấu thì hiện nhãn thay cho nút.
export default function StudyNowButton({ chapterId }) {
  const { profile } = useAuth()
  const current = useStudyChapterId()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  if (!chapterId) return null
  if (current === chapterId) return <span className="badge badge-now">📍 Bạn đang học chương này</span>

  async function mark() {
    setBusy(true)
    setError('')
    try {
      await setStudyChapter(profile.id, chapterId, current)
      mascotSay('Đã ghi nhớ chương bạn đang học 📍 Cố lên nhé!')
    } catch (e) {
      setError(errMsg(e))
    } finally {
      setBusy(false)
    }
  }

  return (
    <span className="study-now-btn">
      <button type="button" className="btn btn-small" onClick={mark} disabled={busy} title="Lưu chương này là chương bạn đang học">
        📍 {busy ? 'Đang lưu…' : 'Đánh dấu đang học'}
      </button>
      {error && <span className="small" style={{ color: 'var(--danger)' }}>{error}</span>}
    </span>
  )
}
