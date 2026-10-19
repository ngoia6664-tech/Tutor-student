import { useEffect, useRef, useState } from 'react'
import { loadGeoGebra, modeOf, setupView } from '../lib/geogebra.js'
import Icon from './Icon.jsx'

let seq = 0

// Bảng vẽ GeoGebra. Muốn đổi kiểu bảng (phẳng ↔ không gian) hoặc mở hình khác thì đổi `key` để dựng lại.
// mode: 'plane' | 'space' | 'oxyz'; ggb: hình đã lưu (base64) để mở lại; onReady(api) khi bảng sẵn sàng.
export default function GeoBoard({ mode = 'plane', ggb = null, height = 560, onReady, compact = false }) {
  const wrapRef = useRef(null)
  const apiRef = useRef(null)
  const [id] = useState(() => `ggb-${++seq}`)
  const [state, setState] = useState('loading') // loading | ready | error
  const [error, setError] = useState(null)
  const [attempt, setAttempt] = useState(0)
  const readyRef = useRef(onReady)
  const heightRef = useRef(height)
  heightRef.current = height
  readyRef.current = onReady

  useEffect(() => {
    let cancelled = false
    const host = wrapRef.current
    setState('loading')
    setError(null)
    const m = modeOf(mode)
    loadGeoGebra()
      .then((GGBApplet) => {
        if (cancelled || !host) return
        host.innerHTML = `<div id="${id}"></div>`
        const width = Math.max(300, Math.floor(host.clientWidth))
        const params = {
          appName: m.app,
          width,
          height: heightRef.current,
          language: 'vi',
          showToolBar: true,
          showAlgebraInput: true,
          showMenuBar: false,
          showResetIcon: false,
          enableRightClick: true,
          enableShiftDragZoom: true,
          showZoomButtons: true,
          showFullscreenButton: false,
          enableUndoRedo: true,
          useBrowserForJS: false,
          borderColor: 'transparent',
          borderRadius: 0,
          ...(ggb ? { ggbBase64: ggb } : {}),
          appletOnLoad: (api) => {
            if (cancelled) return
            apiRef.current = api
            // Hình không gian kiểu lớp 11: ẩn trục, lưới, mặt phẳng xOy (hình đã lưu giữ nguyên cài đặt của nó)
            if (!ggb) setupView(api, mode)
            setState('ready')
            readyRef.current?.(api)
          },
        }
        new GGBApplet(params, true).inject(id)
      })
      .catch((e) => {
        if (cancelled) return
        setError(e.message)
        setState('error')
      })
    return () => {
      cancelled = true
      apiRef.current = null
      if (host) host.innerHTML = ''
    }
    // ggb chỉ dùng lúc dựng; đổi hình thì đổi key ở nơi dùng
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, attempt, id])

  // Co giãn theo khung (xoay điện thoại, đổi cỡ cửa sổ)
  useEffect(() => {
    const host = wrapRef.current
    if (!host || typeof ResizeObserver === 'undefined') return
    let last = 0
    const ro = new ResizeObserver(([entry]) => {
      const w = Math.floor(entry.contentRect.width)
      if (!apiRef.current || Math.abs(w - last) < 4) return
      last = w
      try {
        apiRef.current.setSize(Math.max(300, w), heightRef.current)
      } catch {
        // bảng đang dựng lại
      }
    })
    ro.observe(host)
    return () => ro.disconnect()
  }, [])

  // Đổi chiều cao (vd. toàn màn hình) chỉ co giãn bảng, không dựng lại nên không mất hình
  useEffect(() => {
    const host = wrapRef.current
    if (!apiRef.current || !host) return
    try {
      apiRef.current.setSize(Math.max(300, Math.floor(host.clientWidth)), height)
    } catch {
      // bỏ qua
    }
  }, [height])

  return (
    <div className={compact ? 'geo-board compact' : 'geo-board'} style={{ minHeight: height }}>
      <div ref={wrapRef} className="geo-host" />
      {state === 'loading' && (
        <div className="geo-overlay">
          <span className="spinner" aria-hidden="true" />
          <span>Đang mở bảng vẽ GeoGebra…</span>
        </div>
      )}
      {state === 'error' && (
        <div className="geo-overlay">
          <Icon name="alert" />
          <span>{error}</span>
          <button type="button" className="btn btn-small" onClick={() => setAttempt((n) => n + 1)}>
            Thử lại
          </button>
        </div>
      )}
    </div>
  )
}
