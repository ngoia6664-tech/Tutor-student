import { useEffect, useRef, useState } from 'react'
import { useAuth } from '../contexts/AuthContext.jsx'
import GeoBoard from '../components/GeoBoard.jsx'
import Icon from '../components/Icon.jsx'
import ErrorBox from '../components/ErrorBox.jsx'
import { applyTemplate, COMMAND_TIPS, DRAW_MODES, figurePng, figureState, modeOf, setupView, TEMPLATES } from '../lib/geogebra.js'
import { deleteFigure, listFigures, saveFigure } from '../lib/figures.js'
import { formatDateTime } from '../lib/format.js'

// Chiều cao bảng vẽ: vừa màn hình, chừa chỗ cho thanh trên và thanh công cụ
function boardHeight(full) {
  const h = window.innerHeight
  if (full) return Math.max(360, h - 64)
  return Math.round(Math.min(720, Math.max(440, h - 290)))
}

// Trang "Vẽ hình" (gia sư và học sinh): hình phẳng, hình không gian, Oxyz bằng GeoGebra
export default function DrawPage() {
  const { profile } = useAuth()
  const [mode, setMode] = useState('plane')
  const [boardKey, setBoardKey] = useState(0)
  const [openGgb, setOpenGgb] = useState(null) // hình đang mở từ "Hình của tôi"
  const [currentId, setCurrentId] = useState(null)
  const [name, setName] = useState('')
  const [figures, setFigures] = useState(() => listFigures(profile.id))
  const [ready, setReady] = useState(false)
  const [full, setFull] = useState(false)
  const [height, setHeight] = useState(() => boardHeight(false))
  const [notice, setNotice] = useState(null)
  const [error, setError] = useState(null)
  const apiRef = useRef(null)
  const stageRef = useRef(null)

  const m = modeOf(mode)

  useEffect(() => {
    if (!notice) return
    const t = setTimeout(() => setNotice(null), 3500)
    return () => clearTimeout(t)
  }, [notice])

  // Toàn màn hình: theo dõi cả khi người dùng bấm Esc
  useEffect(() => {
    const onFs = () => {
      const on = document.fullscreenElement === stageRef.current
      setFull(on)
      setHeight(boardHeight(on))
    }
    const onResize = () => setHeight(boardHeight(document.fullscreenElement === stageRef.current))
    document.addEventListener('fullscreenchange', onFs)
    window.addEventListener('resize', onResize)
    return () => {
      document.removeEventListener('fullscreenchange', onFs)
      window.removeEventListener('resize', onResize)
    }
  }, [])

  const api = () => apiRef.current
  const hasContent = () => {
    try {
      return (api()?.getObjectNumber() || 0) > 0
    } catch {
      return false
    }
  }
  const okToDiscard = (msg) => !hasContent() || window.confirm(msg)

  function rebuild(nextMode, ggb = null) {
    apiRef.current = null
    setReady(false)
    setMode(nextMode)
    setOpenGgb(ggb)
    setBoardKey((k) => k + 1)
  }

  function switchMode(key) {
    if (key === mode) return
    if (!okToDiscard('Đổi kiểu bảng sẽ bỏ hình đang vẽ (nếu chưa lưu). Tiếp tục?')) return
    setCurrentId(null)
    setName('')
    rebuild(key)
  }

  function pickTemplate(tpl) {
    if (!api()) return
    if (!okToDiscard(`Dựng "${tpl.label}" sẽ thay hình đang vẽ. Tiếp tục?`)) return
    applyTemplate(api(), mode, tpl)
    setCurrentId(null)
    setName(tpl.label)
  }

  function clearAll() {
    if (!api() || !okToDiscard('Xóa hết hình đang vẽ?')) return
    api().newConstruction()
    setupView(api(), mode)
    setCurrentId(null)
    setName('')
  }

  async function save() {
    if (!api()) return
    setError(null)
    try {
      const ggb = await figureState(api())
      const thumb = figurePng(api(), 0.35)
      const fallback = `${m.label} ${new Date().toLocaleDateString('vi-VN')}`
      const { item, list } = saveFigure(profile.id, { id: currentId, name: name.trim() || fallback, mode, ggb, thumb })
      setFigures(list)
      setCurrentId(item.id)
      setName(item.name)
      setNotice(`Đã lưu "${item.name}" vào Hình của tôi.`)
    } catch (e) {
      setError(e.message)
    }
  }

  function downloadPng() {
    if (!api()) return
    const url = figurePng(api(), 2)
    if (!url) return setError('Chưa xuất được ảnh, hãy thử lại.')
    const a = document.createElement('a')
    a.href = url
    a.download = `${(name.trim() || 'hinh-ve').replace(/[\\/:*?"<>|]+/g, '-')}.png`
    a.click()
  }

  function openFigure(f) {
    if (!okToDiscard(`Mở "${f.name}" sẽ thay hình đang vẽ (nếu chưa lưu). Tiếp tục?`)) return
    setCurrentId(f.id)
    setName(f.name)
    rebuild(f.mode, f.ggb)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function removeFigure(f) {
    if (!window.confirm(`Xóa hình "${f.name}"?`)) return
    setFigures(deleteFigure(profile.id, f.id))
    if (currentId === f.id) setCurrentId(null)
  }

  async function copyCmd(cmd) {
    try {
      await navigator.clipboard.writeText(cmd)
      setNotice(`Đã chép "${cmd}". Dán vào ô Nhập của bảng vẽ rồi bấm Enter.`)
    } catch {
      setNotice(`Gõ "${cmd}" vào ô Nhập của bảng vẽ rồi bấm Enter.`)
    }
  }

  function toggleFull() {
    if (document.fullscreenElement) document.exitFullscreen?.()
    else stageRef.current?.requestFullscreen?.().catch(() => setError('Trình duyệt không cho mở toàn màn hình.'))
  }

  return (
    <div className="draw-page">
      <div className="page-head">
        <div>
          <h1>
            <span className="title-icon">
              <Icon name="shapes" />
            </span>
            Vẽ hình
          </h1>
          <p className="muted small page-sub">Kéo thả điểm, hình tự đổi theo. Hình không gian xoay được bằng chuột phải (hoặc hai ngón tay trên điện thoại).</p>
        </div>
      </div>

      <div className="draw-modes" role="tablist" aria-label="Kiểu bảng vẽ">
        {DRAW_MODES.map((x) => (
          <button
            key={x.key}
            type="button"
            role="tab"
            aria-selected={x.key === mode}
            className={x.key === mode ? 'draw-mode active' : 'draw-mode'}
            onClick={() => switchMode(x.key)}
          >
            <span className="draw-mode-icon">
              <Icon name={x.icon} size={20} />
            </span>
            <span className="draw-mode-text">
              <strong>{x.label}</strong>
              <span>{x.hint}</span>
            </span>
          </button>
        ))}
      </div>

      <div ref={stageRef} className={full ? 'card draw-stage is-full' : 'card draw-stage'}>
        <div className="draw-bar">
          <input
            className="draw-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Tên hình (vd. Bài 3 – chóp S.ABCD)"
            aria-label="Tên hình"
          />
          <div className="draw-actions">
            <button type="button" className="btn btn-small btn-icon" onClick={() => api()?.undo()} disabled={!ready} title="Hoàn tác" aria-label="Hoàn tác">
              <Icon name="undo" />
            </button>
            <button type="button" className="btn btn-small btn-icon" onClick={() => api()?.redo()} disabled={!ready} title="Làm lại" aria-label="Làm lại">
              <Icon name="redo" />
            </button>
            <button type="button" className="btn btn-small" onClick={clearAll} disabled={!ready} title="Xóa hết" aria-label="Xóa hết">
              <Icon name="trash" />
              <span className="btn-text">Xóa hết</span>
            </button>
            <button type="button" className="btn btn-small" onClick={downloadPng} disabled={!ready} title="Tải ảnh PNG" aria-label="Tải ảnh">
              <Icon name="download" />
              <span className="btn-text">Tải ảnh</span>
            </button>
            <button type="button" className="btn btn-small btn-icon" onClick={toggleFull} disabled={!ready} title={full ? 'Thu nhỏ' : 'Toàn màn hình'} aria-label={full ? 'Thu nhỏ' : 'Toàn màn hình'}>
              <Icon name={full ? 'minimize' : 'maximize'} />
            </button>
            <button type="button" className="btn btn-small btn-primary" onClick={save} disabled={!ready}>
              <Icon name="save" />
              {currentId ? 'Lưu' : 'Lưu hình'}
            </button>
          </div>
        </div>

        <div className="draw-templates">
          <span className="muted small">Dựng nhanh:</span>
          {TEMPLATES[mode].map((t) => (
            <button key={t.key} type="button" className="chip" onClick={() => pickTemplate(t)} disabled={!ready}>
              {t.label}
            </button>
          ))}
        </div>

        <ErrorBox message={error} />
        {notice && (
          <div className="draw-notice" role="status">
            <Icon name="check" /> {notice}
          </div>
        )}

        <GeoBoard
          key={`${mode}-${boardKey}`}
          mode={mode}
          ggb={openGgb}
          height={height}
          onReady={(a) => {
            apiRef.current = a
            setReady(true)
          }}
        />
      </div>

      <div className="draw-lower">
        <section className="card">
          <h2>
            <Icon name="folder" /> Hình của tôi <span className="muted small">({figures.length})</span>
          </h2>
          {figures.length === 0 ? (
            <p className="muted small">Bấm "Lưu hình" để giữ hình lại và mở ra sửa tiếp lúc khác. Hình lưu trên trình duyệt của máy này.</p>
          ) : (
            <div className="fig-grid">
              {figures.map((f) => (
                <div key={f.id} className={f.id === currentId ? 'fig-card active' : 'fig-card'}>
                  <button type="button" className="fig-open" onClick={() => openFigure(f)} title={`Mở "${f.name}"`}>
                    {f.thumb ? <img src={f.thumb} alt="" /> : <Icon name={modeOf(f.mode).icon} size={28} />}
                  </button>
                  <div className="fig-meta">
                    <div className="fig-name" title={f.name}>
                      {f.name}
                    </div>
                    <div className="muted small">
                      {modeOf(f.mode).label} · {formatDateTime(f.updated)}
                    </div>
                  </div>
                  <button type="button" className="btn btn-small btn-ghost btn-icon" onClick={() => removeFigure(f)} aria-label={`Xóa ${f.name}`} title="Xóa">
                    <Icon name="trash" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="card">
          <h2>
            <Icon name="info" /> Lệnh hay dùng
          </h2>
          <p className="muted small" style={{ marginTop: 0 }}>
            Bấm để chép lệnh, dán vào ô <b>Nhập</b> của bảng vẽ rồi Enter. Hoặc chọn công cụ tương ứng trên thanh công cụ (trung điểm, vuông góc, giao điểm…).
          </p>
          <ul className="cmd-list">
            {COMMAND_TIPS.map((c) => (
              <li key={c.cmd}>
                <button type="button" className="cmd-item" onClick={() => copyCmd(c.cmd)}>
                  <span>{c.name}</span>
                  <code>{c.cmd}</code>
                </button>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  )
}
