import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import Icon from '../Icon.jsx'
import LabModal from './LabModals.jsx'
import { LAB_SPOTS, createLabScene } from './labScene.js'
import {
  playDoorCreak,
  stopDoorCreak,
  playOpticChime,
  playBubbleSound,
  startLabAmbient,
  stopLabAmbient,
} from './labSound.js'
import { getSettings } from '../../lib/settings.js'
import { openExplorerSound } from '../../lib/spaceSound.js'
import './scienceLab.css'

const WELCOME = 'Chào em! Chọn một món đồ, thầy sẽ đưa em lại gần. Kéo màn hình để nhìn quanh phòng.'
const PANDA_QUOTES = [
  'Trên giá sách kia có cuốn Principia của Newton và bản đồ sao cổ đấy!',
  'Trong tủ tám ngăn kéo có mẫu thiên thạch sắt và lăng kính tán sắc!',
  'Mô hình Hệ Mặt Trời bằng đồng trên mặt tủ quay theo đúng định luật Kepler.',
  'Ghé mắt vào kính thiên văn bên cửa vòm đi, đêm nay trời rất trong!',
]
// Màu dung dịch khi bấm đổi phản ứng: [bình cầu, ống 1, ống 2, ống 3]
const BREWS = [
  ['#10b981', '#f59e0b', '#38bdf8', '#ec4899'],
  ['#a855f7', '#ec4899', '#38bdf8', '#fbbf24'],
  ['#f43f5e', '#eab308', '#22c55e', '#60a5fa'],
]
const FLY_MS_TRAVEL = 750

/** Phòng Khoa học 3D: cửa gỗ mở, bước vào gác mái, bấm đồ vật thì camera bay đến.
 * Bấm kính thiên văn chỉ nhìn Hệ Mặt Trời qua thị kính; phải bấm thêm nút Du hành mới sang màn Vũ Trụ.
 * @param {{ onClose?: () => void, onOpenSpace?: () => void, initialWalkIn?: boolean, leaving?: boolean }} props */
export default function ScienceLab({ onClose, onOpenSpace, initialWalkIn = true, leaving = false }) {
  const hostRef = useRef(/** @type {HTMLDivElement | null} */ (null))
  /** @type {import('react').RefObject<ReturnType<typeof createLabScene> | null>} */
  const labRef = useRef(null)
  const spotEls = useRef(/** @type {Record<string, HTMLButtonElement | null>} */ ({}))
  const soundRef = useRef(getSettings().soundEffects)
  const brewIdx = useRef(0)

  // door: đang mở cửa · room: đứng trong phòng · moving: camera đang bay · focus: đứng trước đồ vật · scope: mắt trong kính · travel: lao đi
  const [view, setView] = useState(initialWalkIn ? 'door' : 'room')
  const [failed, setFailed] = useState(false)
  const [soundOn, setSoundOn] = useState(soundRef.current)
  const [lampOn, setLampOn] = useState(true)
  const [spot, setSpot] = useState(/** @type {string | null} */ (null))
  const [iris, setIris] = useState(false)
  const [quote, setQuote] = useState(WELCOME)

  useEffect(() => {
    const host = hostRef.current
    if (!host) return
    /** @type {ReturnType<typeof createLabScene>} */
    let lab
    try {
      lab = createLabScene(host, {
        spotEl: (id) => spotEls.current[id],
        onPick: (id) => pickRef.current(id),
      })
    } catch {
      setFailed(true)
      setView('room')
      return
    }
    labRef.current = lab
    if (initialWalkIn && !lab.calm) {
      lab.playDoor(
        () => {
          if (soundRef.current) playDoorCreak()
        },
        () => setView('room'),
      )
    } else {
      lab.startInRoom()
      setView('room')
    }
    return () => {
      stopDoorCreak()
      labRef.current = null
      lab.dispose()
    }
  }, [initialWalkIn])

  // Bật / tắt âm giữa chừng không được chạy lại hoạt cảnh mở cửa: chỉ dừng tiếng
  useEffect(() => {
    soundRef.current = soundOn
    if (!soundOn) stopDoorCreak()
    if (soundOn) startLabAmbient()
    else stopLabAmbient()
    return () => stopLabAmbient()
  }, [soundOn])

  function skipDoor() {
    stopDoorCreak()
    labRef.current?.skipDoor()
    setView('room')
  }

  /** @param {string} id */
  function pick(id) {
    const lab = labRef.current
    if (id === 'scope') return lookThroughScope()
    if (id === 'panda') {
      lab?.waveTo()
      setQuote(PANDA_QUOTES[Math.floor(Math.random() * PANDA_QUOTES.length)])
      return
    }
    if (failed) {
      setSpot(id)
      setView('focus')
      return
    }
    setView('moving')
    setQuote('')
    lab?.focus(id, () => {
      setSpot(id)
      setView('focus')
      if (id === 'desk') changeBrew()
    })
  }
  const pickRef = useRef(pick)
  pickRef.current = pick

  function changeBrew() {
    brewIdx.current = (brewIdx.current + 1) % BREWS.length
    labRef.current?.setBrew(BREWS[brewIdx.current])
    if (soundRef.current) playBubbleSound()
    setQuote('Dung dịch đã đổi màu phát quang! Bấm lần nữa để thử phản ứng khác.')
  }

  function backFromSpot() {
    const from = spot
    setSpot(null)
    if (failed) return setView('room')
    setView('moving')
    labRef.current?.home(from || '', () => {
      setView('room')
      setQuote('Còn món nào em muốn xem nữa không?')
    })
  }

  function lookThroughScope() {
    // Máy không có 3D thì không có gì để ngắm trong phòng: sang thẳng màn Vũ Trụ
    if (failed) return travel()
    // Tải sẵn màn Vũ Trụ để lúc bấm Du hành không phải chờ
    import('../SpaceExplorer.jsx').catch(() => {})
    if (soundRef.current) playOpticChime()
    setSpot(null)
    setQuote('')
    setView('moving')
    labRef.current?.enterScope(
      () => setIris(true),
      () => setView('scope'),
    )
  }

  function leaveScope() {
    setView('moving')
    labRef.current?.leaveScope(
      () => setIris(false),
      () => {
        setView('room')
        setQuote('Bầu trời đẹp chứ? Lúc nào muốn du hành thì lại ghé mắt vào kính nhé.')
      },
    )
  }

  function travel() {
    // iPhone chỉ cho phát nhạc ngay trong cú bấm, nên mở tiếng trước khi lao đi
    openExplorerSound()
    const lab = labRef.current
    if (!lab || lab.calm) return onOpenSpace?.()
    setView('travel')
    lab.rush()
    setTimeout(() => onOpenSpace?.(), FLY_MS_TRAVEL)
  }

  function toggleLamp() {
    const next = !lampOn
    setLampOn(next)
    labRef.current?.setLights(next)
    setQuote(next ? 'Đèn đã sáng trở lại.' : 'Tắt đèn đi, ánh trăng hiện rõ hơn hẳn.')
  }

  // Khóa cuộn trang + phím Esc lùi đúng một bước theo trạng thái hiện tại
  const escRef = useRef(() => {})
  escRef.current = () => {
    if (view === 'door') skipDoor()
    else if (view === 'focus') backFromSpot()
    else if (view === 'scope') leaveScope()
    else if (view === 'room') onClose?.()
  }
  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    /** @param {KeyboardEvent} e */
    const onKey = (e) => {
      if (e.key === 'Escape') escRef.current()
    }
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = prev
      window.removeEventListener('keydown', onKey)
    }
  }, [])

  const showCard = view === 'focus' && spot && spot !== 'desk'

  return createPortal(
    <div className={`sci-lab-viewport is-${view} ${failed ? 'is-flat' : ''} ${leaving ? 'is-leaving' : ''}`} role="dialog" aria-label="Phòng Khoa học">
      <div ref={hostRef} className="sci-stage" />

      <header className="sci-top">
        {onClose && (
          <button type="button" className="sci-tool" onClick={onClose} title="Về lớp học">
            <Icon name="left" />
            <span>Về lớp học</span>
          </button>
        )}
        <div className="sci-top-right">
          {view !== 'door' && view !== 'scope' && !failed && (
            <button type="button" className="sci-tool" onClick={toggleLamp} aria-label={lampOn ? 'Tắt đèn phòng' : 'Bật đèn phòng'} title={lampOn ? 'Tắt đèn phòng' : 'Bật đèn phòng'}>
              <Icon name="zap" />
            </button>
          )}
          <button type="button" className="sci-tool" onClick={() => setSoundOn((v) => !v)} aria-label={soundOn ? 'Tắt âm thanh' : 'Bật âm thanh'} title={soundOn ? 'Tắt âm thanh' : 'Bật âm thanh'}>
            <Icon name={soundOn ? 'sound' : 'mute'} />
          </button>
        </div>
      </header>

      <div className="sci-spots">
        {LAB_SPOTS.map((s) => (
          <button
            key={s.id}
            type="button"
            className="sci-spot"
            ref={(el) => {
              spotEls.current[s.id] = el
            }}
            onClick={() => pick(s.id)}
          >
            <i />
            <span>{s.label}</span>
          </button>
        ))}
      </div>

      {quote && view !== 'door' && view !== 'scope' && !showCard && <p className="sci-say" aria-live="polite">{quote}</p>}

      {view === 'door' && (
        <button type="button" className="sci-tool sci-skip" onClick={skipDoor}>
          Vào phòng ngay
        </button>
      )}

      {view === 'focus' && spot === 'desk' && (
        <div className="sci-desk-actions">
          <button type="button" className="sci-btn" onClick={changeBrew}>Đổi phản ứng</button>
          <button type="button" className="sci-btn sci-btn-line" onClick={backFromSpot} autoFocus>Lùi lại</button>
        </div>
      )}

      {showCard && <LabModal id={spot} onClose={backFromSpot} onScope={lookThroughScope} />}

      {/* Viền thị kính: khép lại quanh Hệ Mặt Trời, chưa rời khỏi phòng */}
      <div className={`sci-iris ${iris ? 'is-on' : ''} ${view === 'travel' ? 'is-open' : ''}`} />
      {view === 'travel' && <div className="sci-flash" />}

      {view === 'scope' && (
        <div className="sci-scope-panel">
          <h2>Hệ Mặt Trời</h2>
          <p>Tám hành tinh đang quay quanh Mặt Trời, càng xa càng chậm. Em muốn đến tận nơi xem không?</p>
          <div className="sci-note-actions">
            <button type="button" className="sci-btn" onClick={travel} autoFocus>
              Du hành tới đó để khám phá
            </button>
            <button type="button" className="sci-btn sci-btn-line" onClick={leaveScope}>
              Rời mắt khỏi kính
            </button>
          </div>
        </div>
      )}

      {failed && <p className="sci-flat-note">Máy này chưa bật được đồ họa 3D, nên phòng hiển thị dạng danh sách.</p>}
    </div>,
    document.body,
  )
}
