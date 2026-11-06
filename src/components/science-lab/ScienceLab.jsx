import { useEffect, useState, useRef } from 'react'
import { createPortal } from 'react-dom'
import Icon from '../Icon.jsx'
import { FrontPanda } from '../PandaArt.jsx'
import { playDoorCreak, playOpticChime, playBubbleSound, playClockTick } from './labSound.js'
import './scienceLab.css'

export default function ScienceLab({ onClose, onOpenSpace, initialWalkIn = true }) {
  // Trạng thái hoạt cảnh mở cửa bước vào
  const [walkIn, setWalkIn] = useState(initialWalkIn)
  const [doorOpen, setDoorOpen] = useState(false)
  const [lightGlow, setLightGlow] = useState(false)
  const [soundEnabled, setSoundEnabled] = useState(true)

  // Trạng thái tương tác trong phòng
  const [activeModal, setActiveModal] = useState(null) // 'pendulum' | 'chalkboard' | 'journal' | 'tubes' | null
  const [tubeColorIdx, setTubeColorIdx] = useState(0)
  const [pendulumLength, setPendulumLength] = useState(1.0)
  const [isZoomingSpace, setIsZoomingSpace] = useState(false)
  const [pandaMood, setPandaMood] = useState('teach') // 'teach' | 'cheer' | 'wait'
  const [pandaQuote, setPandaQuote] = useState('Chào mừng em đến với Phòng Nghiên Cứu!')
  const [showPandaBubble, setShowPandaBubble] = useState(true)

  const tubeColors = ['emerald', 'amber', 'cyan']

  // Tính chu kì con lắc: T = 2 * pi * sqrt(l / 9.8)
  const pendulumPeriod = (2 * Math.PI * Math.sqrt(pendulumLength / 9.8)).toFixed(2)

  // Diễn hoạt mở cửa bước vào phòng khi vừa bật
  useEffect(() => {
    if (!walkIn) return
    const t0 = setTimeout(() => {
      if (soundEnabled) playDoorCreak()
      setDoorOpen(true)
      setLightGlow(true)
    }, 180)

    const t1 = setTimeout(() => {
      setWalkIn(false)
    }, 2800)

    return () => {
      clearTimeout(t0)
      clearTimeout(t1)
    }
  }, [walkIn, soundEnabled])

  // Lắng nghe phím Esc để đóng popover hoặc thoát phòng
  useEffect(() => {
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        if (activeModal) {
          setActiveModal(null)
        } else if (typeof onClose === 'function') {
          onClose()
        }
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => {
      document.body.style.overflow = prevOverflow
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [activeModal, onClose])

  // Khi bấm vào Kính Thiên Văn: Hiệu ứng phóng vào thị kính quang học (Optical Iris Zoom)
  function handleLaunchSpace() {
    if (isZoomingSpace) return
    if (soundEnabled) playOpticChime()
    setIsZoomingSpace(true)

    setTimeout(() => {
      if (typeof onOpenSpace === 'function') {
        onOpenSpace()
      }
    }, 850)
  }

  // Tương tác với dàn ống nghiệm
  function handleTubeClick() {
    if (soundEnabled) playBubbleSound()
    setTubeColorIdx((prev) => (prev + 1) % tubeColors.length)
    setPandaMood('cheer')
    setPandaQuote('Phản ứng quang phổ học thành công rực rỡ!')
    setShowPandaBubble(true)
  }

  // Tương tác với con lắc
  function handlePendulumClick() {
    if (soundEnabled) playClockTick(false)
    setActiveModal('pendulum')
  }

  // Tương tác với chú Gấu Trúc
  function handlePandaClick() {
    const quotes = [
      'Vũ trụ bao la chứa hàng trăm tỉ thiên hà tuyệt đẹp!',
      'Chu kì con lắc chỉ phụ thuộc chiều dài l và gia tốc g.',
      'Hãy nhìn qua kính viễn vọng để ngắm vành đai Sao Thổ nhé!',
      'Hôm nay chúng ta sẽ khám phá định luật vạn vật hấp dẫn!',
    ]
    const nextQ = quotes[Math.floor(Math.random() * quotes.length)]
    setPandaQuote(nextQ)
    setPandaMood((m) => (m === 'teach' ? 'cheer' : 'teach'))
    setShowPandaBubble(true)
  }

  const content = (
    <div className="sci-lab-viewport" role="dialog" aria-label="Phòng Khoa Học & Nghiên Cứu Gác Mái">
      {/* 1. HOẠT CẢNH MỞ CỬA BƯỚC VÀO PHÒNG (CINEMATIC WALK-IN) */}
      {walkIn && (
        <div className="sci-walkin-cinematic">
          <div className="sci-door-portal">
            {/* Luồng sáng vàng bừng nở từ bên trong */}
            <div className={`sci-inner-golden-light ${lightGlow ? 'is-glowing' : ''}`} />

            {/* Chú Gấu Trúc đón khách */}
            <div className={`sci-panda-welcome ${doorOpen ? 'is-visible' : ''}`}>
              <FrontPanda pose="cheer" />
            </div>

            {/* Cánh cửa đôi gỗ sồi mở ra 3D */}
            <div className={`sci-door-leaf-left ${doorOpen ? 'is-opened' : ''}`}>
              <div className="sci-door-plate">PHÒNG KHOA HỌC</div>
            </div>
            <div className={`sci-door-leaf-right ${doorOpen ? 'is-opened' : ''}`} />
          </div>

          <div className="sci-walkin-subtitle">
            Giáo sư Gấu Trúc đang mở cửa vào Trạm Nghiên Cứu Thiên Văn...
          </div>
          <button
            type="button"
            className="sci-walkin-skip-btn"
            onClick={() => setWalkIn(false)}
          >
            Bỏ qua hoạt cảnh &rarr;
          </button>
        </div>
      )}

      {/* 2. THANH ĐIỀU HƯỚNG TRÊN CÙNG (COZY HUD TOPBAR) */}
      <header className="sci-hud-topbar">
        {onClose && (
          <button
            type="button"
            className="sci-exit-btn"
            onClick={onClose}
            title="Quay lại lớp học (Esc)"
          >
            <Icon name="arrow-left" />
            <span>&larr; Về Lớp Học</span>
          </button>
        )}

        <div className="sci-hud-right">
          <span className="sci-hud-badge">
            <span className="sci-hud-dot" />
            Trạm Thiên Văn Sẵn Sàng
          </span>

          <button
            type="button"
            className="sci-hud-icon-btn"
            onClick={() => setSoundEnabled((v) => !v)}
            title={soundEnabled ? 'Tắt âm thanh hiệu ứng' : 'Bật âm thanh hiệu ứng'}
            aria-label="Bật tắt âm thanh"
          >
            <Icon name={soundEnabled ? 'sound' : 'mute'} />
          </button>

          {onClose && (
            <button
              type="button"
              className="sci-hud-icon-btn"
              onClick={onClose}
              title="Đóng phòng nghiên cứu"
              aria-label="Đóng"
            >
              <Icon name="close" />
            </button>
          )}
        </div>
      </header>

      {/* 3. KHUNG CẢNH CĂN PHÒNG GÁC MÁI TOÀN MÀN HÌNH (PANORAMIC SCENE) */}
      <div className={`sci-room-stage ${isZoomingSpace ? 'is-zooming-lens' : ''}`}>
        {/* Tầng 1: Bầu trời sao đêm ngoài vòm kính */}
        <div className="sci-sky-backdrop">
          <div className="sci-stars-layer" />
          <div className="sci-shooting-star" />
          <div className="sci-dome-moon" />
        </div>

        {/* Tầng 2: Khung vòm kính đài thiên văn */}
        <div className="sci-glass-dome">
          <div className="sci-dome-ribs" />
        </div>

        {/* Tầng 3: Khung dầm gỗ gác mái và sàn gỗ phản quang */}
        <div className="sci-attic-structure">
          <div className="sci-beam-left" />
          <div className="sci-beam-ceiling" />
        </div>
        <div className="sci-attic-floor">
          <div className="sci-floor-planks" />
        </div>

        {/* Đèn trần thả xuống tỏa quầng sáng vàng ấm áp */}
        <div className="sci-ceiling-lamp">
          <div className="sci-lamp-wire" />
          <div className="sci-lamp-shade">
            <div className="sci-lamp-bulb" />
          </div>
          <div className="sci-lamp-light-cone" />
        </div>

        {/* --- HOTSPOT 1: KÍNH THIÊN VĂN KHỔNG LỒ (TELESCOPE) --- */}
        <div
          className="sci-telescope-spot"
          onClick={handleLaunchSpace}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === 'Enter' && handleLaunchSpace()}
          aria-label="Kính thiên văn khúc xạ: Bấm để quan sát không gian vũ trụ"
        >
          {/* Vệt sáng quang học từ ống kính chiếu lên bầu trời */}
          <div className="sci-telescope-beam-anim" />

          {/* Huy hiệu nổi chỉ dẫn thân thiện */}
          <div className="sci-telescope-pill">
            <Icon name="telescope" />
            <span>Kính Thiên Văn Khúc Xạ &bull; Bấm để vào Vũ Trụ &rarr;</span>
          </div>

          {/* Minh họa Kính thiên văn đồng thau cổ điển */}
          <svg viewBox="0 0 240 280" className="sci-telescope-svg" aria-hidden="true">
            {/* Chân kiềng 3 chân gỗ sồi viền đồng */}
            <line x1="120" y1="160" x2="35" y2="270" stroke="#3d2111" strokeWidth="10" strokeLinecap="round" />
            <line x1="120" y1="160" x2="205" y2="270" stroke="#3d2111" strokeWidth="10" strokeLinecap="round" />
            <line x1="120" y1="160" x2="120" y2="275" stroke="#221209" strokeWidth="8" strokeLinecap="round" />
            <line x1="60" y1="230" x2="180" y2="230" stroke="#78350f" strokeWidth="4" />

            {/* Trục tọa độ xích đạo bằng đồng thau */}
            <circle cx="120" cy="160" r="16" fill="#d97706" stroke="#92400e" strokeWidth="3" />
            <circle cx="120" cy="160" r="7" fill="#fef08a" />

            {/* Ống kính chính chĩa góc nghiêng 40 độ lên vòm trời */}
            <g transform="rotate(-38 120 160)">
              {/* Thị kính ngắm phía sau */}
              <rect x="25" y="152" width="22" height="16" rx="3" fill="#78350f" stroke="#451a03" strokeWidth="2" />
              <ellipse cx="25" cy="160" rx="3" ry="10" fill="#38bdf8" />

              {/* Ống đồng thau thân chính */}
              <rect x="47" y="146" width="160" height="28" rx="4" fill="#b45309" stroke="#78350f" strokeWidth="3" />
              <rect x="75" y="143" width="12" height="34" rx="2" fill="#f59e0b" />
              <rect x="145" y="143" width="12" height="34" rx="2" fill="#f59e0b" />

              {/* Vành thấu kính phản chiếu ánh trăng xanh biếc */}
              <path d="M205 140 L226 132 L226 188 L205 180 Z" fill="#92400e" stroke="#78350f" strokeWidth="2.5" />
              <ellipse cx="225" cy="160" rx="4" ry="27" fill="#38bdf8" />
            </g>
          </svg>
        </div>

        {/* --- HOTSPOT 2: BÀN THÍ NGHIỆM VÀ GIÁO SƯ GẤU TRÚC (WORKBENCH) --- */}
        <div className="sci-workbench-spot">
          {/* Chú Gấu Trúc thân thiện bên bàn */}
          <div
            className="sci-panda-assistant"
            onClick={handlePandaClick}
            title="Bấm để trò chuyện cùng Giáo sư Gấu Trúc"
          >
            {showPandaBubble && (
              <div className="sci-panda-bubble">
                {pandaQuote}
              </div>
            )}
            <FrontPanda pose={pandaMood} />
          </div>

          {/* Mặt bàn gỗ gác mái bóng đẹp */}
          <div className="sci-desk-wood" />

          {/* Dàn ống nghiệm sủi bọt phát sáng */}
          <div
            className="sci-tubes-rack"
            onClick={handleTubeClick}
            title="Bấm để thử nghiệm dung dịch quang phổ!"
          >
            <div className="sci-test-tube">
              <div className={`sci-tube-liquid ${tubeColors[tubeColorIdx]}`}>
                <div className="sci-bubble-dot" style={{ left: 4 }} />
              </div>
            </div>
            <div className="sci-test-tube">
              <div className={`sci-tube-liquid ${tubeColors[(tubeColorIdx + 1) % tubeColors.length]}`}>
                <div className="sci-bubble-dot" style={{ left: 8, animationDelay: '0.6s' }} />
              </div>
            </div>
            <div className="sci-test-tube">
              <div className={`sci-tube-liquid ${tubeColors[(tubeColorIdx + 2) % tubeColors.length]}`}>
                <div className="sci-bubble-dot" style={{ left: 5, animationDelay: '1.1s' }} />
              </div>
            </div>
          </div>

          {/* Con lắc đơn dao động điều hòa trên bàn */}
          <div
            className="sci-pendulum-desk"
            onClick={handlePendulumClick}
            title="Bấm để điều chỉnh thí nghiệm Con Lắc Đơn!"
          >
            <div className="sci-pendulum-stand">
              <div className="sci-pendulum-arm">
                <div className="sci-pendulum-bob" />
              </div>
            </div>
          </div>

          {/* Cuốn sổ tay nghiên cứu mở sẵn trên bàn */}
          <div
            className="sci-open-journal"
            onClick={() => setActiveModal('journal')}
            title="Bấm để mở Sổ Tay Nghiên Cứu của Gấu"
          >
            <div className="sci-journal-lines" />
          </div>
        </div>

        {/* --- HOTSPOT 3: BẢNG ĐEN CÔNG THỨC TRÊN TƯỜNG GỖ (CHALKBOARD) --- */}
        <div
          className="sci-chalkboard-spot"
          onClick={() => setActiveModal('chalkboard')}
          title="Bấm để phóng to Bảng Công Thức Vật Lý & Thiên Văn!"
        >
          <div className="sci-chalk-header">
            <span>BẢNG ĐEN PHÒNG THÍ NGHIỆM</span>
            <span>#01</span>
          </div>
          <div className="sci-chalk-content">
            <div className="sci-chalk-formula">T = 2&pi;&radic;(l / g)</div>
            <div className="sci-chalk-formula">F = G &times; (m&sub1;m&sub2; / r&sup2;)</div>
            <div className="sci-chalk-formula">E = m &times; c&sup2;</div>
          </div>
          <div className="sci-chalk-sketch">
            <Icon name="assignment" />
            <span>Chạm để khám phá chi tiết &rarr;</span>
          </div>
        </div>
      </div>

      {/* 4. HIỆU ỨNG THẤU KÍNH QUANG HỌC PHÓNG VÀO VŨ TRỤ (OPTICAL IRIS) */}
      <div className={`sci-optical-iris ${isZoomingSpace ? 'is-active' : ''}`}>
        <div className="sci-lens-flare" />
      </div>

      {/* 5. CÁC HỘP THOẠI CHI TIẾT TƯƠNG TÁC (DETAIL MODALS) */}

      {/* Modal Con Lắc Đơn */}
      {activeModal === 'pendulum' && (
        <div className="sci-modal-backdrop" onClick={() => setActiveModal(null)}>
          <div className="sci-parchment-card" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              className="sci-card-close"
              onClick={() => setActiveModal(null)}
              aria-label="Đóng"
            >
              <Icon name="close" />
            </button>

            <h3 className="m-0 text-lg font-bold text-amber-400 flex items-center gap-2">
              <Icon name="zap" /> Thí Nghiệm Tương Tác: Con Lắc Đơn
            </h3>
            <p className="text-sm text-stone-300 mt-2 mb-4 leading-relaxed">
              Theo định luật dao động điều hòa của Huygens, chu kì dao động <b>T</b> chỉ phụ thuộc vào chiều dài dây treo <b>l</b> và gia tốc trọng trường <b>g</b>, hoàn toàn không phụ thuộc vào khối lượng vật nặng!
            </p>

            <div className="p-4 rounded-xl bg-stone-900 border border-stone-700 space-y-3">
              <div className="flex justify-between items-center text-sm font-semibold">
                <span>Chiều dài dây treo (l):</span>
                <span className="text-amber-400 font-mono text-base">{pendulumLength} mét</span>
              </div>
              <input
                type="range"
                min="0.2"
                max="3.0"
                step="0.1"
                value={pendulumLength}
                onChange={(e) => setPendulumLength(parseFloat(e.target.value))}
                className="w-full accent-amber-500 cursor-pointer"
              />
              <div className="pt-2 flex justify-between items-center border-t border-stone-800 text-sm">
                <span>Chu kì tính toán (T):</span>
                <span className="font-mono text-lg font-bold text-emerald-400">{pendulumPeriod} giây</span>
              </div>
            </div>

            <div className="mt-4 flex justify-end">
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => setActiveModal(null)}
              >
                Hoàn thành quan sát
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Bảng Đen Công Thức */}
      {activeModal === 'chalkboard' && (
        <div className="sci-modal-backdrop" onClick={() => setActiveModal(null)}>
          <div className="sci-parchment-card" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              className="sci-card-close"
              onClick={() => setActiveModal(null)}
              aria-label="Đóng"
            >
              <Icon name="close" />
            </button>

            <h3 className="m-0 text-lg font-bold text-emerald-400 flex items-center gap-2">
              <Icon name="assignment" /> Bảng Đen Công Thức Vật Lý & Thiên Văn
            </h3>
            <p className="text-sm text-stone-300 mt-2 mb-4 leading-relaxed">
              Những phương trình nền tảng kết nối cơ học trên Trái Đất với chuyển động của các thiên thể trong vũ trụ:
            </p>

            <div className="space-y-3 text-sm">
              <div className="p-3 rounded-lg bg-stone-900 border border-stone-800">
                <div className="font-mono text-amber-300 font-bold">F = G &times; (m&sub1;m&sub2; / r&sup2;)</div>
                <div className="text-xs text-stone-400 mt-1">Định luật vạn vật hấp dẫn của Newton: Giữ cho các hành tinh quay quanh Mặt Trời trên quỹ đạo elip ổn định.</div>
              </div>
              <div className="p-3 rounded-lg bg-stone-900 border border-stone-800">
                <div className="font-mono text-amber-300 font-bold">&lambda; = v / f = c / f</div>
                <div className="text-xs text-stone-400 mt-1">Bước sóng ánh sáng: Giúp các nhà thiên văn phân tích quang phổ và thành phần hóa học của các vì sao xa xôi.</div>
              </div>
              <div className="p-3 rounded-lg bg-stone-900 border border-stone-800">
                <div className="font-mono text-amber-300 font-bold">E = m &times; c&sup2;</div>
                <div className="text-xs text-stone-400 mt-1">Hệ thức Einstein: Nguồn gốc năng lượng hạt nhân khổng lồ giúp Mặt Trời tỏa sáng hàng tỉ năm.</div>
              </div>
            </div>

            <div className="mt-4 flex justify-between items-center">
              <button
                type="button"
                className="btn btn-ghost text-xs"
                onClick={() => {
                  setActiveModal(null)
                  handleLaunchSpace()
                }}
              >
                🔭 Vào kính thiên văn xem thực tế
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => setActiveModal(null)}
              >
                Đã hiểu
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Sổ Tay Nghiên Cứu */}
      {activeModal === 'journal' && (
        <div className="sci-modal-backdrop" onClick={() => setActiveModal(null)}>
          <div className="sci-parchment-card" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              className="sci-card-close"
              onClick={() => setActiveModal(null)}
              aria-label="Đóng"
            >
              <Icon name="close" />
            </button>

            <h3 className="m-0 text-lg font-bold text-amber-400 flex items-center gap-2">
              <Icon name="book" /> Sổ Tay Nghiên Cứu Của Giáo Sư Gấu Trúc
            </h3>
            <p className="text-sm text-stone-300 mt-2 mb-3 leading-relaxed">
              "Khoa học không phải là những con số khô khan, mà là chiếc chìa khóa thần kỳ giúp chúng ta mở ra bí mật của các vì sao!"
            </p>

            <div className="p-3 rounded-xl bg-stone-900/90 border border-amber-900/50 space-y-2 text-xs">
              <div className="font-bold text-amber-300 uppercase tracking-wide">Mục Tiêu Quan Sát Tuần Này:</div>
              <ul className="m-0 pl-4 space-y-1 text-stone-300">
                <li>&bull; Quan sát vành đai băng đá của Sao Thổ qua kính viễn vọng.</li>
                <li>&bull; Khảo sát thời gian chu kì con lắc $T$ khi thay đổi chiều dài $l$.</li>
                <li>&bull; Giải thích hiện tượng lóa quang học khi ánh sáng đi qua thấu kính.</li>
              </ul>
            </div>

            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => {
                  setActiveModal(null)
                  handleLaunchSpace()
                }}
              >
                Vào ngắm vũ trụ cùng Gấu &rarr;
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )

  return createPortal(content, document.body)
}
