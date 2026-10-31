// @ts-nocheck — nợ kiểu: xóa dòng này rồi chạy npm run typecheck để sửa
import { useEffect, useState } from 'react'
import Icon from './Icon.jsx'

// Gợi ý cài app lên màn hình chính.
// - Android / máy tính (Chrome, Edge): trình duyệt báo "beforeinstallprompt" → nút Cài app mở hộp thoại cài.
// - iPhone / iPad (Safari): không có hộp thoại, chỉ hướng dẫn Chia sẻ → Thêm vào MH chính.
// Ẩn khi đang chạy dạng app, hoặc người dùng đã bấm × (nhớ trên máy này).
const DISMISS_KEY = 'install-banner-dismissed'

const isStandalone = () => window.matchMedia?.('(display-mode: standalone)').matches || window.navigator.standalone === true
const isIos = () => /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)

function wasDismissed() {
  try {
    return localStorage.getItem(DISMISS_KEY) === '1'
  } catch {
    return false
  }
}

export default function InstallBanner() {
  const [prompt, setPrompt] = useState(null)
  const [hidden, setHidden] = useState(() => isStandalone() || wasDismissed())
  const ios = isIos()

  useEffect(() => {
    if (hidden) return
    const onPrompt = (e) => {
      e.preventDefault()
      setPrompt(e)
    }
    const onInstalled = () => setHidden(true)
    window.addEventListener('beforeinstallprompt', onPrompt)
    window.addEventListener('appinstalled', onInstalled)
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt)
      window.removeEventListener('appinstalled', onInstalled)
    }
  }, [hidden])

  if (hidden || (!prompt && !ios)) return null

  function dismiss() {
    try {
      localStorage.setItem(DISMISS_KEY, '1')
    } catch {
      // không lưu được thì chỉ ẩn trong lần mở này
    }
    setHidden(true)
  }

  async function install() {
    prompt.prompt()
    const { outcome } = await prompt.userChoice
    setPrompt(null)
    if (outcome === 'accepted') setHidden(true)
  }

  return (
    <div className="alert alert-info install-banner">
      <Icon name="down" />
      {prompt ? (
        <>
          <span className="install-text">Cài app lên màn hình chính để mở nhanh như app thật.</span>
          <button type="button" className="btn btn-primary btn-small" onClick={install}>
            Cài app
          </button>
        </>
      ) : (
        <span className="install-text">
          Cài app: bấm nút <b>Chia sẻ</b> (ô vuông có mũi tên lên) ở Safari, chọn <b>Thêm vào MH chính</b>.
        </span>
      )}
      <button type="button" className="btn btn-ghost btn-small" onClick={dismiss} aria-label="Ẩn gợi ý" title="Ẩn gợi ý">
        <Icon name="close" />
      </button>
    </div>
  )
}
