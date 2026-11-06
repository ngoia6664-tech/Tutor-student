import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import Icon from '../Icon.jsx'
import { FrontPanda } from '../PandaArt.jsx'
import {
  playDoorCreak,
  playOpticChime,
  playBubbleSound,
  playClockTick,
  startLabAmbient,
  stopLabAmbient,
} from './labSound.js'
import './scienceLab.css'

// Hạt bụi vàng lơ lửng cố định trong ánh đèn phòng nghiên cứu
const LAB_DUST = Array.from({ length: 22 }, (_, i) => ({
  id: i,
  cx: 120 + ((i * 137) % 1360),
  cy: 90 + ((i * 89) % 660),
  r: 1.4 + (i % 3) * 0.8,
  dur: `${8 + (i % 7) * 1.5}s`,
  delay: `-${(i * 1.3).toFixed(1)}s`,
}))

// Màu dung dịch ống nghiệm khi bấm đổi phản ứng
const TUBE_PALETTES = [
  ['#10b981', '#f59e0b', '#06b6d4'],
  ['#a855f7', '#ec4899', '#38bdf8'],
  ['#f43f5e', '#eab308', '#22c55e'],
]

export default function ScienceLab({ onClose, onOpenSpace, initialWalkIn = true }) {
  // Hoạt cảnh mở cửa bước vào phòng
  const [walkIn, setWalkIn] = useState(initialWalkIn)
  const [doorOpen, setDoorOpen] = useState(false)
  const [lightGlow, setLightGlow] = useState(false)
  const [enteringRoom, setEnteringRoom] = useState(false)

  // Trạng thái tương tác trong phòng
  const [soundEnabled, setSoundEnabled] = useState(true)
  const [lampOn, setLampOn] = useState(true)
  const [activeModal, setActiveModal] = useState(null) // 'pendulum' | 'chalkboard' | 'journal' | 'bookshelf' | 'cabinet' | null
  const [tubePaletteIdx, setTubePaletteIdx] = useState(0)
  const [pendulumLength, setPendulumLength] = useState(1.0)
  const [isZoomingSpace, setIsZoomingSpace] = useState(false)
  const [pandaMood, setPandaMood] = useState('teach')
  const [pandaQuote, setPandaQuote] = useState(
    'Chào mừng em! Hãy bấm vào Kính thiên văn, Giá sách, Tủ mẫu vật hay Bàn thí nghiệm để khám phá nhé!'
  )

  const currentTubes = TUBE_PALETTES[tubePaletteIdx]
  const pendulumPeriod = (2 * Math.PI * Math.sqrt(pendulumLength / 9.8)).toFixed(2)

  // Khởi chạy hoạt cảnh mở cửa gỗ đôi 3D
  useEffect(() => {
    if (!walkIn) return
    const t0 = setTimeout(() => {
      if (soundEnabled) playDoorCreak()
      setDoorOpen(true)
      setLightGlow(true)
    }, 160)

    const t1 = setTimeout(() => {
      setEnteringRoom(true)
    }, 1750)

    const t2 = setTimeout(() => {
      setWalkIn(false)
      setEnteringRoom(false)
    }, 2400)

    return () => {
      clearTimeout(t0)
      clearTimeout(t1)
      clearTimeout(t2)
    }
  }, [walkIn, soundEnabled])

  // Nhạc nền môi trường phòng nghiên cứu (khi có file)
  useEffect(() => {
    if (soundEnabled) startLabAmbient()
    else stopLabAmbient()
    return () => stopLabAmbient()
  }, [soundEnabled])

  // Khóa cuộn trang & phím Esc
  useEffect(() => {
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        if (activeModal) setActiveModal(null)
        else if (typeof onClose === 'function') onClose()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => {
      document.body.style.overflow = prevOverflow
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [activeModal, onClose])

  // Bấm vào Kính Thiên Văn -> Phóng vào thị kính quang học (Optical Iris Zoom) -> Mở Vũ Trụ
  function handleLaunchSpace() {
    if (isZoomingSpace) return
    if (soundEnabled) playOpticChime()
    setIsZoomingSpace(true)
    setPandaMood('cheer')
    setPandaQuote('Chuẩn bị phóng tầm mắt qua thấu kính 1200mm tiến vào Vũ Trụ!')

    setTimeout(() => {
      if (typeof onOpenSpace === 'function') {
        onOpenSpace()
      }
    }, 820)
  }

  // Bấm vào bộ bình cầu & ống nghiệm trên bàn
  function handleChemistryClick() {
    if (soundEnabled) playBubbleSound()
    setTubePaletteIdx((prev) => (prev + 1) % TUBE_PALETTES.length)
    setPandaMood('cheer')
    setPandaQuote('Dung dịch phát quang đã đổi phổ màu! Các bọt khí đang sôi lăn tăn kìa!')
  }

  // Bấm vào đồng hồ quả lắc
  function handleClockClick() {
    if (soundEnabled) playClockTick()
    setPandaMood('teach')
    setPandaQuote(
      'Đồng hồ quả lắc chạy chính xác nhờ chu kì dao động T = 2π√(l/g) của Huygens năm 1656 đấy!'
    )
  }

  // Bấm vào đèn bàn / đèn trần để bật tắt ánh sáng ấm
  function handleLampToggle() {
    setLampOn((v) => !v)
    setPandaQuote(
      !lampOn
        ? 'Đã bật lại đèn bàn và đèn chùm ấm áp trong phòng nghiên cứu!'
        : 'Đã giảm đèn phòng để mắt làm quen với bóng tối khi ngắm sao đêm!'
    )
  }

  // Bấm vào Giáo sư Gấu Trúc
  function handlePandaClick() {
    const quotes = [
      'Trên kệ sách gỗ kia có cuốn "Principia" của Newton và bản đồ sao cổ đấy!',
      'Trong tủ gỗ nhiều ngăn kéo có cất mẫu thiên thạch sắt và đá mặt trăng!',
      'Mô hình Hệ Mặt Trời bằng đồng trên mặt tủ đang quay theo đúng định luật Kepler.',
      'Hãy bấm vào chiếc Kính Thiên Văn đồng thau lớn bên cửa vòm để bay ra Vũ Trụ nhé!',
    ]
    const next = quotes[Math.floor(Math.random() * quotes.length)]
    setPandaQuote(next)
    setPandaMood((m) => (m === 'teach' ? 'cheer' : 'teach'))
  }

  const content = (
    <div className="sci-lab-viewport" role="dialog" aria-label="Phòng Khoa Học & Nghiên Cứu Gác Mái">
      {/* =================================================================
          1. HOẠT CẢNH MỞ CỬA GỖ SỒI ĐÔI CHẠM KHẮC (WALK-IN OVERLAY)
          ================================================================= */}
      {walkIn && (
        <div className={`sci-walkin-cinematic ${enteringRoom ? 'is-entering' : ''}`}>
          <div className="sci-door-archway">
            <div className="sci-door-portal">
              <div className={`sci-inner-golden-light ${lightGlow ? 'is-glowing' : ''}`} />

              <div className={`sci-panda-welcome ${doorOpen ? 'is-visible' : ''}`}>
                <FrontPanda pose="cheer" />
              </div>

              <div className={`sci-door-leaf-left ${doorOpen ? 'is-opened' : ''}`}>
                <div className="sci-door-plate">PHÒNG KHOA HỌC</div>
              </div>
              <div className={`sci-door-leaf-right ${doorOpen ? 'is-opened' : ''}`} />
            </div>
          </div>

          <div className="sci-walkin-subtitle">
            Giáo sư Gấu Trúc đang mở cửa phòng nghiên cứu đón bạn...
          </div>
          <button
            type="button"
            className="sci-walkin-skip-btn"
            onClick={() => setWalkIn(false)}
          >
            Vào phòng ngay &rarr;
          </button>
        </div>
      )}

      {/* =================================================================
          2. THANH ĐIỀU HƯỚNG TRÊN CÙNG (HUD TOPBAR)
          ================================================================= */}
      <header className="sci-hud-topbar">
        {onClose && (
          <button
            type="button"
            className="sci-exit-btn"
            onClick={onClose}
            title="Quay lại lớp học (Esc)"
          >
            <Icon name="left" />
            <span>Về Lớp Học</span>
          </button>
        )}

        <div className="sci-hud-right">
          <span className="sci-hud-badge">
            <span className="sci-hud-dot" />
            Phòng Nghiên Cứu Thiên Văn
          </span>

          <button
            type="button"
            className="sci-hud-icon-btn"
            onClick={handleLampToggle}
            title={lampOn ? 'Tắt bớt đèn phòng để ngắm sao' : 'Bật sáng đèn phòng nghiên cứu'}
            aria-label="Đèn phòng"
          >
            <Icon name="zap" />
          </button>

          <button
            type="button"
            className="sci-hud-icon-btn"
            onClick={() => setSoundEnabled((v) => !v)}
            title={soundEnabled ? 'Tắt âm thanh' : 'Bật âm thanh'}
            aria-label="Âm thanh"
          >
            <Icon name={soundEnabled ? 'sound' : 'mute'} />
          </button>

          {onClose && (
            <button
              type="button"
              className="sci-hud-icon-btn"
              onClick={onClose}
              title="Đóng phòng khoa học"
              aria-label="Đóng"
            >
              <Icon name="close" />
            </button>
          )}
        </div>
      </header>

      {/* =================================================================
          3. KHUNG CẢNH CĂN PHÒNG MINH HỌA CHI TIẾT (1600x900 SVG PANORAMA)
          ================================================================= */}
      <div
        className={`sci-room-stage ${isZoomingSpace ? 'is-zooming-lens' : ''} ${
          !lampOn ? 'is-lamp-off' : ''
        }`}
      >
        <svg
          className="sci-scene-svg"
          viewBox="0 0 1600 900"
          preserveAspectRatio="xMidYMid slice"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            {/* Nền tường gỗ gác mái ấm áp */}
            <linearGradient id="sciWallGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#1e120b" />
              <stop offset="62%" stopColor="#2c1a10" />
              <stop offset="100%" stopColor="#1a0f09" />
            </linearGradient>

            {/* Sàn gỗ sồi ghép tấm */}
            <linearGradient id="sciFloorGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#26150b" />
              <stop offset="45%" stopColor="#1d1008" />
              <stop offset="100%" stopColor="#110904" />
            </linearGradient>

            {/* Bầu trời sao đêm ngoài cửa sổ vòm */}
            <radialGradient id="sciNightSky" cx="55%" cy="35%" r="70%">
              <stop offset="0%" stopColor="#1e295b" />
              <stop offset="48%" stopColor="#0f1738" />
              <stop offset="100%" stopColor="#050816" />
            </radialGradient>

            {/* Tinh vân tím hồng huyền ảo ngoài bầu trời */}
            <radialGradient id="sciNebulaGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#a855f7" stopOpacity="0.28" />
              <stop offset="55%" stopColor="#38bdf8" stopOpacity="0.12" />
              <stop offset="100%" stopColor="#000000" stopOpacity="0" />
            </radialGradient>

            {/* Quầng sáng Mặt Trăng */}
            <radialGradient id="sciMoonHalo" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#fef9c3" stopOpacity="0.95" />
              <stop offset="32%" stopColor="#fde047" stopOpacity="0.35" />
              <stop offset="100%" stopColor="#fde047" stopOpacity="0" />
            </radialGradient>

            {/* Ánh trăng xanh chiếu xiên qua cửa vòm xuống sàn */}
            <linearGradient id="sciMoonbeam" x1="0.8" y1="0" x2="0.2" y2="1">
              <stop offset="0%" stopColor="#93c5fd" stopOpacity="0.16" />
              <stop offset="60%" stopColor="#60a5fa" stopOpacity="0.06" />
              <stop offset="100%" stopColor="#60a5fa" stopOpacity="0" />
            </linearGradient>

            {/* Quầng sáng vàng ấm từ đèn chùm trần nhà */}
            <radialGradient id="sciCeilingLight" cx="50%" cy="0%" r="75%">
              <stop offset="0%" stopColor="#fde68a" stopOpacity="0.38" />
              <stop offset="45%" stopColor="#f59e0b" stopOpacity="0.14" />
              <stop offset="100%" stopColor="#f59e0b" stopOpacity="0" />
            </radialGradient>

            {/* Quầng sáng từ đèn bàn Banker's Lamp */}
            <radialGradient id="sciDeskLampGlow" cx="50%" cy="20%" r="65%">
              <stop offset="0%" stopColor="#fef08a" stopOpacity="0.45" />
              <stop offset="55%" stopColor="#f59e0b" stopOpacity="0.15" />
              <stop offset="100%" stopColor="#f59e0b" stopOpacity="0" />
            </radialGradient>

            {/* Chất liệu gỗ sồi cho tủ và kệ sách */}
            <linearGradient id="sciOakWood" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#3b2010" />
              <stop offset="50%" stopColor="#4f2c17" />
              <stop offset="100%" stopColor="#331b0d" />
            </linearGradient>

            <linearGradient id="sciDarkWood" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#2e180c" />
              <stop offset="100%" stopColor="#1a0d06" />
            </linearGradient>

            {/* Chất liệu đồng thau cổ điển */}
            <linearGradient id="sciBrass" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#fde68a" />
              <stop offset="45%" stopColor="#d97706" />
              <stop offset="100%" stopColor="#78350f" />
            </linearGradient>

            {/* Rèm nhung đỏ rượu vang */}
            <linearGradient id="sciVelvetCurtain" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#4c0519" />
              <stop offset="40%" stopColor="#881337" />
              <stop offset="75%" stopColor="#600a22" />
              <stop offset="100%" stopColor="#3b0413" />
            </linearGradient>

            {/* Mặt bảng phấn xanh rêu cổ điển */}
            <linearGradient id="sciChalkSlate" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#1b3b2b" />
              <stop offset="55%" stopColor="#132a1f" />
              <stop offset="100%" stopColor="#0d1f16" />
            </linearGradient>

            {/* Clip vùng bầu trời bên trong khung cửa sổ vòm lớn */}
            <clipPath id="sciArchWindowClip">
              <path d="M 960 560 L 960 280 A 260 230 0 0 1 1480 280 L 1480 560 Z" />
            </clipPath>
          </defs>

          {/* ===============================================================
              LỚP 1: TƯỜNG GỖ, LAMBRIS CHÂN TƯỜNG & SÀN GỖ GHÉP
              =============================================================== */}
          {/* Mảng tường chính */}
          <rect x="0" y="0" width="1600" height="630" fill="url(#sciWallGrad)" />

          {/* Các đường kẻ ván gỗ tường dọc mờ */}
          <g stroke="#140b06" strokeWidth="2" opacity="0.45">
            <line x1="160" y1="0" x2="160" y2="630" />
            <line x1="320" y1="0" x2="320" y2="630" />
            <line x1="480" y1="0" x2="480" y2="630" />
            <line x1="640" y1="0" x2="640" y2="630" />
            <line x1="800" y1="0" x2="800" y2="630" />
            <line x1="960" y1="0" x2="960" y2="630" />
            <line x1="1520" y1="0" x2="1520" y2="630" />
          </g>

          {/* Lambris gỗ ốp chân tường (Wainscoting panels) */}
          <rect x="0" y="470" width="1600" height="160" fill="#24130a" stroke="#472815" strokeWidth="3" />
          <rect x="0" y="464" width="1600" height="10" fill="#54301a" />
          <g fill="#1b0e07" stroke="#3d2212" strokeWidth="2">
            {Array.from({ length: 12 }, (_, i) => (
              <rect key={i} x={24 + i * 132} y="488" width="108" height="118" rx="3" />
            ))}
          </g>

          {/* Phào chân tường (Baseboard) */}
          <rect x="0" y="618" width="1600" height="16" fill="#150b05" stroke="#3b2110" strokeWidth="1.5" />

          {/* Sàn gỗ gác mái (630 -> 900) */}
          <rect x="0" y="630" width="1600" height="270" fill="url(#sciFloorGrad)" />

          {/* Đường ghép ván sàn gỗ theo phối cảnh tụ về tâm */}
          <g stroke="#120904" strokeWidth="2" opacity="0.65">
            <line x1="0" y1="670" x2="1600" y2="670" />
            <line x1="0" y1="718" x2="1600" y2="718" />
            <line x1="0" y1="774" x2="1600" y2="774" />
            <line x1="0" y1="840" x2="1600" y2="840" />
            <line x1="250" y1="630" x2="80" y2="900" />
            <line x1="500" y1="630" x2="390" y2="900" />
            <line x1="760" y1="630" x2="720" y2="900" />
            <line x1="1020" y1="630" x2="1060" y2="900" />
            <line x1="1280" y1="630" x2="1410" y2="900" />
          </g>

          {/* ===============================================================
              LỚP 2: KHUNG CỬA SỔ VÒM ĐÀI QUAN SÁT, BẦU TRỜI SAO & RÈM NHUNG
              =============================================================== */}
          <g clipPath="url(#sciArchWindowClip)">
            {/* Bầu trời đêm sâu thẳm */}
            <rect x="940" y="40" width="560" height="530" fill="url(#sciNightSky)" />

            {/* Dải tinh vân mờ ảo */}
            <ellipse cx="1180" cy="240" rx="220" ry="110" fill="url(#sciNebulaGlow)" transform="rotate(-22 1180 240)" />

            {/* Các ngôi sao lấp lánh ngoài bầu trời */}
            <g fill="#ffffff" className="sci-star-twinkle">
              <circle cx="1010" cy="180" r="1.8" />
              <circle cx="1065" cy="120" r="2.2" fill="#fde047" />
              <circle cx="1130" cy="95" r="1.5" />
              <circle cx="1210" cy="140" r="2.0" fill="#93c5fd" />
              <circle cx="1290" cy="88" r="1.6" />
              <circle cx="1390" cy="130" r="2.2" />
              <circle cx="1435" cy="210" r="1.5" />
              <circle cx="1030" cy="290" r="1.6" />
              <circle cx="1145" cy="260" r="2.1" />
              <circle cx="1260" cy="310" r="1.8" fill="#fbcfe8" />
              <circle cx="1370" cy="340" r="1.5" />
              <circle cx="1015" cy="420" r="1.9" />
              <circle cx="1195" cy="410" r="1.5" />
              <circle cx="1420" cy="435" r="2.0" fill="#bae6fd" />
            </g>

            {/* Chòm sao Bắc Đẩu (Ursa Major) nối nét mảnh */}
            <g stroke="rgba(147, 197, 253, 0.38)" strokeWidth="1.2" strokeDasharray="3 3" fill="#e0f2fe">
              <polyline points="1035,195 1075,182 1108,198 1142,212 1148,248 1192,254 1198,218 1142,212" fill="none" />
              <circle cx="1035" cy="195" r="2.5" />
              <circle cx="1075" cy="182" r="2.5" />
              <circle cx="1108" cy="198" r="2.5" />
              <circle cx="1142" cy="212" r="2.5" />
              <circle cx="1148" cy="248" r="2.5" />
              <circle cx="1192" cy="254" r="2.5" />
              <circle cx="1198" cy="218" r="2.5" />
            </g>

            {/* Sao băng vụt qua bầu trời */}
            <g className="sci-shooting-star-line">
              <line x1="1410" y1="120" x2="1290" y2="185" stroke="#ffffff" strokeWidth="2.2" strokeLinecap="round" />
              <circle cx="1290" cy="185" r="2.8" fill="#fef08a" />
            </g>

            {/* Mặt Trăng tròn tỏa hào quang */}
            <circle cx="1335" cy="195" r="95" fill="url(#sciMoonHalo)" />
            <circle cx="1335" cy="195" r="42" fill="#fef9c3" />
            <circle cx="1322" cy="182" r="7" fill="#fde047" opacity="0.45" />
            <circle cx="1348" cy="204" r="10" fill="#fde047" opacity="0.4" />
            <circle cx="1328" cy="212" r="5" fill="#fde047" opacity="0.35" />

            {/* Dãy núi xa mờ và hàng thông dưới chân trời */}
            <path d="M 950 560 L 950 500 Q 1060 455 1170 495 T 1380 475 L 1500 505 L 1500 560 Z" fill="#070d1f" />

            {/* Nan cửa sổ vòm bằng gỗ và đồng */}
            <g stroke="#2a160c" strokeWidth="8" fill="none">
              <line x1="1220" y1="50" x2="1220" y2="560" />
              <line x1="960" y1="310" x2="1480" y2="310" />
              <line x1="960" y1="440" x2="1480" y2="440" />
              <path d="M 1090 560 L 1090 280 A 130 120 0 0 1 1350 280 L 1350 560" strokeWidth="6" />
            </g>
          </g>

          {/* Khung vòm gỗ dày bao quanh cửa sổ */}
          <path
            d="M 960 560 L 960 280 A 260 230 0 0 1 1480 280 L 1480 560 Z"
            fill="none"
            stroke="#3d2211"
            strokeWidth="18"
          />
          <path
            d="M 960 560 L 960 280 A 260 230 0 0 1 1480 280 L 1480 560 Z"
            fill="none"
            stroke="#6b3d1e"
            strokeWidth="4"
          />

          {/* Luồng ánh trăng chiếu xiên từ cửa sổ vòm xuống sàn phòng */}
          <polygon points="980,560 1460,560 1320,890 680,890" fill="url(#sciMoonbeam)" />

          {/* Rèm nhung cổ điển vén sang hai bên cửa sổ vòm */}
          <g>
            {/* Rèm trái */}
            <path
              d="M 948 160 Q 1020 175 1035 280 Q 1015 390 968 430 Q 985 505 975 565 L 932 565 L 932 160 Z"
              fill="url(#sciVelvetCurtain)"
              stroke="#2e020d"
              strokeWidth="2"
            />
            {/* Dây buộc rèm vàng bên trái */}
            <path d="M 932 425 Q 960 438 974 426" stroke="#fbbf24" strokeWidth="5" fill="none" strokeLinecap="round" />
            <circle cx="968" cy="442" r="6" fill="#f59e0b" />

            {/* Rèm phải */}
            <path
              d="M 1492 160 Q 1420 175 1405 280 Q 1425 390 1472 430 Q 1455 505 1465 565 L 1508 565 L 1508 160 Z"
              fill="url(#sciVelvetCurtain)"
              stroke="#2e020d"
              strokeWidth="2"
            />
            {/* Dây buộc rèm vàng bên phải */}
            <path d="M 1508 425 Q 1480 438 1466 426" stroke="#fbbf24" strokeWidth="5" fill="none" strokeLinecap="round" />
            <circle cx="1472" cy="442" r="6" fill="#f59e0b" />
          </g>

          {/* Bệ cửa sổ gỗ dày (Window Sill) & Đồ vật trên bệ */}
          <rect x="935" y="556" width="570" height="20" rx="4" fill="#4f2c17" stroke="#291509" strokeWidth="2.5" />
          <rect x="948" y="576" width="544" height="12" fill="#331b0d" />

          {/* Chồng sách thiên văn & Đèn bão đồng trên bệ cửa sổ */}
          <g>
            {/* Chồng 3 cuốn sách nằm ngang */}
            <rect x="1005" y="542" width="68" height="14" rx="2" fill="#1e3a8a" stroke="#172554" strokeWidth="1.5" />
            <rect x="1009" y="545" width="60" height="8" fill="#fef3c7" />
            <rect x="1012" y="530" width="58" height="12" rx="2" fill="#7f1d1d" stroke="#450a0a" strokeWidth="1.5" />
            <rect x="1018" y="519" width="48" height="11" rx="2" fill="#065f46" stroke="#022c22" strokeWidth="1.5" />

            {/* Đèn bão cổ điển tỏa sáng ấm trên bệ cửa */}
            <circle cx="1415" cy="528" r="32" fill="url(#sciDeskLampGlow)" />
            <rect x="1401" y="546" width="28" height="10" rx="3" fill="url(#sciBrass)" />
            <path d="M 1405 546 L 1402 516 L 1428 516 L 1425 546 Z" fill="rgba(254, 240, 138, 0.35)" stroke="#d97706" strokeWidth="2" />
            <circle cx="1415" cy="534" r="7" fill="#fef08a" />
            <path d="M 1398 516 L 1432 516 L 1422 506 L 1408 506 Z" fill="url(#sciBrass)" />

            {/* Chậu cây nhỏ trên bệ cửa */}
            <polygon points="1340,556 1366,556 1362,534 1344,534" fill="#9a3412" stroke="#431407" strokeWidth="1.5" />
            <path d="M 1353 534 Q 1338 515 1330 524 Q 1342 508 1353 526 Q 1365 506 1375 522 Q 1366 515 1353 534 Z" fill="#15803d" />
          </g>

          {/* ===============================================================
              LỚP 3: GÓC TRÁI - GIÁ SÁCH GỖ KỊCH TRẦN, CÂY DÂY LEO & THANG GỖ
              =============================================================== */}
          <g
            className="sci-hotspot"
            onClick={() => setActiveModal('bookshelf')}
          >
            <title>Tủ sách Học thuật & Bản thảo Thiên văn (Bấm để xem)</title>

            {/* Thân tủ sách gỗ sồi cao kịch trần (x: 24..310, y: 58..628) */}
            <rect x="28" y="68" width="280" height="560" fill="url(#sciOakWood)" stroke="#1e0f07" strokeWidth="4" />
            {/* Đỉnh phào chỉ chạm khắc của tủ sách */}
            <polygon points="18,68 318,68 306,46 30,46" fill="#59321a" stroke="#241208" strokeWidth="2.5" />
            <rect x="24" y="62" width="288" height="10" fill="#704022" />

            {/* Lưng tủ tối màu bên trong 5 tầng kệ */}
            <rect x="42" y="82" width="252" height="96" fill="#160b05" />
            <rect x="42" y="190" width="252" height="98" fill="#160b05" />
            <rect x="42" y="300" width="252" height="98" fill="#160b05" />
            <rect x="42" y="410" width="252" height="98" fill="#160b05" />
            <rect x="42" y="520" width="252" height="94" fill="#160b05" />

            {/* --- TẦNG 1: Sách cổ đóng bìa da & Hộp đồng hồ cát --- */}
            <g>
              <rect x="48" y="96" width="22" height="82" rx="2" fill="#7f1d1d" />
              <rect x="51" y="106" width="16" height="4" fill="#fbbf24" />
              <rect x="72" y="102" width="18" height="76" rx="2" fill="#1e3a8a" />
              <rect x="92" y="90" width="26" height="88" rx="2" fill="#064e3b" />
              <rect x="96" y="102" width="18" height="5" fill="#fbbf24" />
              <rect x="120" y="106" width="19" height="72" rx="2" fill="#78350f" />
              <rect x="141" y="94" width="24" height="84" rx="2" fill="#581c87" />
              <rect x="167" y="100" width="20" height="78" rx="2" fill="#92400e" />
              {/* Sách nghiêng */}
              <rect x="195" y="102" width="21" height="76" rx="2" fill="#881337" transform="rotate(12 205 178)" />
              {/* Bình tinh thể phát sáng trên tầng 1 */}
              <rect x="242" y="122" width="32" height="56" rx="8" fill="rgba(56, 189, 248, 0.25)" stroke="#93c5fd" strokeWidth="1.5" />
              <polygon points="258,132 248,168 268,168" fill="#38bdf8" opacity="0.85" />
              <rect x="247" y="116" width="22" height="7" rx="2" fill="#78350f" />
            </g>

            {/* --- TẦNG 2: Quả địa cầu thiên văn bằng đồng & Sách --- */}
            <g>
              {/* Quả địa cầu thiên văn cổ (Celestial Globe) */}
              <circle cx="88" cy="238" r="28" fill="#0f2942" stroke="#38bdf8" strokeWidth="1.5" />
              <ellipse cx="88" cy="238" rx="28" ry="10" fill="none" stroke="#fbbf24" strokeWidth="2" transform="rotate(-24 88 238)" />
              <path d="M 88 204 A 34 34 0 0 1 88 272" fill="none" stroke="#d97706" strokeWidth="3.5" />
              <line x1="88" y1="272" x2="88" y2="286" stroke="#d97706" strokeWidth="4" />
              <path d="M 70 286 L 106 286 L 98 280 L 78 280 Z" fill="#b45309" />

              {/* Dãy sách bên phải tầng 2 */}
              <rect x="136" y="206" width="24" height="82" rx="2" fill="#7c2d12" />
              <rect x="162" y="198" width="28" height="90" rx="2" fill="#14532d" />
              <rect x="166" y="212" width="20" height="5" fill="#fde047" />
              <rect x="192" y="210" width="20" height="78" rx="2" fill="#1e1b4b" />
              <rect x="214" y="202" width="25" height="86" rx="2" fill="#7f1d1d" />
              <rect x="241" y="214" width="18" height="74" rx="2" fill="#b45309" />
              <rect x="261" y="204" width="24" height="84" rx="2" fill="#312e81" />
            </g>

            {/* --- TẦNG 3: Sách dày, Đồng hồ cát & Chậu cây thường xuân rủ xuống --- */}
            <g>
              <rect x="48" y="316" width="26" height="82" rx="2" fill="#065f46" />
              <rect x="76" y="324" width="20" height="74" rx="2" fill="#9a3412" />
              <rect x="98" y="310" width="28" height="88" rx="2" fill="#4c1d95" />
              <rect x="128" y="320" width="22" height="78" rx="2" fill="#831843" />

              {/* Đồng hồ cát bằng đồng (Hourglass) */}
              <rect x="166" y="338" width="32" height="5" fill="#d97706" />
              <rect x="166" y="392" width="32" height="5" fill="#d97706" />
              <line x1="170" y1="343" x2="170" y2="392" stroke="#b45309" strokeWidth="2" />
              <line x1="194" y1="343" x2="194" y2="392" stroke="#b45309" strokeWidth="2" />
              <polygon points="172,343 192,343 182,368 192,392 172,392 182,368" fill="rgba(254, 243, 199, 0.35)" stroke="#fde68a" strokeWidth="1.2" />
              <polygon points="175,388 189,388 182,374" fill="#fbbf24" />

              {/* Chậu cây thường xuân xanh mát rủ xuống kệ */}
              <polygon points="236,398 274,398 270,362 240,362" fill="#b45309" stroke="#78350f" strokeWidth="2" />
              <g fill="#16a34a">
                <circle cx="244" cy="356" r="11" />
                <circle cx="258" cy="350" r="13" />
                <circle cx="270" cy="358" r="10" />
                {/* Dây leo rủ xuống tầng dưới */}
                <path d="M 268 366 Q 282 395 272 425 Q 264 450 278 475" stroke="#15803d" strokeWidth="3" fill="none" />
                <circle cx="276" cy="388" r="6" fill="#22c55e" />
                <circle cx="270" cy="410" r="6.5" fill="#16a34a" />
                <circle cx="274" cy="434" r="6" fill="#22c55e" />
                <circle cx="269" cy="456" r="5.5" fill="#15803d" />
              </g>
            </g>

            {/* --- TẦNG 4 & 5: Toàn bộ sách học thuật & Cuộn giấy cổ --- */}
            <g>
              {Array.from({ length: 9 }, (_, i) => {
                const colors = ['#7f1d1d', '#1e3a8a', '#065f46', '#78350f', '#581c87', '#9a3412', '#1f2937', '#831843', '#365314']
                return (
                  <rect
                    key={i}
                    x={48 + i * 26}
                    y={422 + (i % 3) * 6}
                    width="23"
                    height={86 - (i % 3) * 6}
                    rx="2"
                    fill={colors[i]}
                  />
                )
              })}
              {Array.from({ length: 10 }, (_, i) => {
                const colors = ['#312e81', '#7c2d12', '#14532d', '#701a75', '#92400e', '#1e3a8a', '#7f1d1d', '#064e3b', '#5b21b6', '#78350f']
                return (
                  <rect
                    key={i}
                    x={48 + i * 24}
                    y={530 + (i % 2) * 8}
                    width="21"
                    height={84 - (i % 2) * 8}
                    rx="2"
                    fill={colors[i]}
                  />
                )
              })}
            </g>

            {/* Các thanh đợt kệ gỗ ngang */}
            <rect x="36" y="178" width="264" height="12" fill="#5c341b" stroke="#261308" strokeWidth="1.5" />
            <rect x="36" y="288" width="264" height="12" fill="#5c341b" stroke="#261308" strokeWidth="1.5" />
            <rect x="36" y="398" width="264" height="12" fill="#5c341b" stroke="#261308" strokeWidth="1.5" />
            <rect x="36" y="508" width="264" height="12" fill="#5c341b" stroke="#261308" strokeWidth="1.5" />

            {/* Chiếc thang gỗ thư viện dựa nghiêng vào giá sách */}
            <g stroke="#7c4722" strokeWidth="5" strokeLinecap="round">
              <line x1="68" y1="175" x2="26" y2="635" />
              <line x1="116" y1="175" x2="74" y2="635" />
              <line x1="63" y1="230" x2="111" y2="230" strokeWidth="4" />
              <line x1="57" y1="295" x2="105" y2="295" strokeWidth="4" />
              <line x1="51" y1="360" x2="99" y2="360" strokeWidth="4" />
              <line x1="45" y1="425" x2="93" y2="425" strokeWidth="4" />
              <line x1="39" y1="490" x2="87" y2="490" strokeWidth="4" />
              <line x1="33" y1="555" x2="81" y2="555" strokeWidth="4" />
            </g>
          </g>

          {/* ===============================================================
              LỚP 4: ĐỒNG HỒ QUẢ LẮC CỔ ĐIỂN (GRANDFATHER CLOCK)
              =============================================================== */}
          <g
            className="sci-hotspot"
            onClick={handleClockClick}
          >
            <title>Đồng hồ quả lắc Huygens (Bấm để xem giải thích)</title>

            {/* Chân đế đồng hồ */}
            <rect x="328" y="535" width="92" height="95" rx="3" fill="#3b2010" stroke="#1b0e07" strokeWidth="3" />
            <rect x="338" y="548" width="72" height="68" fill="#281509" stroke="#59321a" strokeWidth="2" />

            {/* Thân giữa đồng hồ có ô kính nhìn thấy quả lắc */}
            <rect x="338" y="275" width="72" height="260" fill="#472814" stroke="#1b0e07" strokeWidth="3" />
            <rect x="350" y="292" width="48" height="225" rx="24" fill="#120a05" stroke="#784421" strokeWidth="2.5" />

            {/* Quả lắc đồng đung đưa bên trong */}
            <g className="sci-clock-pendulum">
              <line x1="374" y1="296" x2="374" y2="450" stroke="#fbbf24" strokeWidth="3" />
              <circle cx="374" cy="458" r="16" fill="url(#sciBrass)" stroke="#fef08a" strokeWidth="1.5" />
            </g>

            {/* Đầu đồng hồ chạm vòm & Mặt số vàng cổ điển */}
            <path d="M 330 275 L 330 165 A 44 40 0 0 1 418 165 L 418 275 Z" fill="#3b2010" stroke="#1b0e07" strokeWidth="3" />
            <circle cx="374" cy="215" r="34" fill="#fef3c7" stroke="#b45309" strokeWidth="4" />
            <circle cx="374" cy="215" r="28" fill="none" stroke="#92400e" strokeWidth="1" strokeDasharray="3 5" />
            {/* Kim đồng hồ */}
            <line x1="374" y1="215" x2="374" y2="194" stroke="#1c1917" strokeWidth="3" strokeLinecap="round" />
            <line x1="374" y1="215" x2="391" y2="215" stroke="#1c1917" strokeWidth="2.2" strokeLinecap="round" />
            <circle cx="374" cy="215" r="3.5" fill="#b45309" />
          </g>

          {/* ===============================================================
              LỚP 5: BẢNG ĐEN PHẤN RÊU, BẢN ĐỒ SAO & TỦ GỖ NHIỀU NGĂN KÉO
              =============================================================== */}

          {/* --- BẢNG ĐEN CÔNG THỨC (CHALKBOARD HOTSPOT) --- */}
          <g
            className="sci-hotspot"
            onClick={() => setActiveModal('chalkboard')}
          >
            <title>Bảng đen Vật lý & Thiên văn (Bấm để xem chi tiết công thức)</title>

            {/* Khung gỗ sồi của bảng đen */}
            <rect x="446" y="88" width="320" height="215" rx="6" fill="#59321a" stroke="#241208" strokeWidth="3.5" />
            <rect x="458" y="100" width="296" height="191" rx="3" fill="url(#sciChalkSlate)" />

            {/* Máng để phấn và viên phấn màu */}
            <rect x="440" y="298" width="332" height="12" rx="3" fill="#704022" stroke="#241208" strokeWidth="2" />
            <rect x="510" y="293" width="22" height="5" rx="2" fill="#ffffff" />
            <rect x="542" y="293" width="18" height="5" rx="2" fill="#fde047" />
            <rect x="570" y="293" width="20" height="5" rx="2" fill="#fda4af" />
            <rect x="650" y="289" width="34" height="9" rx="2" fill="#b45309" />

            {/* Chữ viết phấn và hình vẽ quỹ đạo trên bảng */}
            <text x="474" y="126" fill="#a7f3d0" fontSize="12" fontWeight="700" fontFamily="monospace">
              CƠ HỌC THIÊN THỂ &amp; QUANG PHỔ
            </text>
            <line x1="474" y1="134" x2="736" y2="134" stroke="rgba(167,243,208,0.28)" strokeDasharray="4 4" />

            <text x="474" y="164" fill="#fef08a" fontSize="17" fontWeight="700" fontFamily="Georgia, serif">
              T = 2π √(l / g)
            </text>
            <text x="474" y="196" fill="#ffffff" fontSize="16" fontWeight="700" fontFamily="Georgia, serif">
              F = G · (m₁m₂ / r²)
            </text>
            <text x="474" y="228" fill="#bae6fd" fontSize="16" fontWeight="700" fontFamily="Georgia, serif">
              E = m · c²   |   λ = c / f
            </text>

            {/* Sơ đồ quỹ đạo Elip Kepler vẽ phấn bên phải bảng */}
            <ellipse
              cx="676"
              cy="192"
              rx="52"
              ry="32"
              fill="none"
              stroke="rgba(254, 240, 138, 0.75)"
              strokeWidth="1.8"
              strokeDasharray="4 3"
              transform="rotate(-14 676 192)"
            />
            <circle cx="658" cy="196" r="7" fill="#fde047" />
            <circle cx="722" cy="176" r="4.5" fill="#38bdf8" />

            {/* Đường sóng giao thoa ánh sáng dưới đáy bảng */}
            <path
              d="M 474 262 Q 492 246 510 262 T 546 262 T 582 262 T 618 262"
              fill="none"
              stroke="#6ee7b7"
              strokeWidth="2"
            />
            <text x="635" y="267" fill="#6ee7b7" fontSize="11" fontWeight="700">
              Bấm xem &rarr;
            </text>
          </g>

          {/* --- BẢN ĐỒ CHÒM SAO CỔ ĐÓNG KHUNG (VINTAGE STAR CHART) --- */}
          <g
            className="sci-hotspot"
            onClick={() => setActiveModal('bookshelf')}
          >
            <title>Bản đồ Chòm sao Cổ (Bấm để xem)</title>
            <rect x="786" y="102" width="136" height="176" rx="4" fill="#4f2c17" stroke="#1e0f07" strokeWidth="3" />
            <rect x="796" y="112" width="116" height="156" fill="#e7d3b0" />
            {/* Hai bán cầu sao trên bản đồ cổ */}
            <circle cx="854" cy="162" r="36" fill="#172554" stroke="#92400e" strokeWidth="2" />
            <circle cx="854" cy="162" r="26" fill="none" stroke="rgba(254,240,138,0.45)" strokeWidth="1" strokeDasharray="2 2" />
            <polyline points="838,154 852,146 866,158 858,174" fill="none" stroke="#fde047" strokeWidth="1.2" />
            <line x1="808" y1="214" x2="900" y2="214" stroke="#78350f" strokeWidth="2" />
            <line x1="808" y1="228" x2="884" y2="228" stroke="#92400e" strokeWidth="1.5" />
            <line x1="808" y1="242" x2="892" y2="242" stroke="#92400e" strokeWidth="1.5" />
          </g>

          {/* --- TỦ GỖ NHIỀU NGĂN KÉO & MÔ HÌNH HỆ MẶT TRỜI (APOTHECARY CABINET & ORRERY) --- */}
          <g
            className="sci-hotspot"
            onClick={() => setActiveModal('cabinet')}
          >
            <title>Tủ gỗ Mẫu vật Khoa học &amp; Mô hình Hệ Mặt Trời cơ khí (Bấm để mở tủ)</title>

            {/* Mô hình Hệ Mặt Trời cơ khí bằng đồng (Brass Orrery) đặt trên mặt tủ */}
            <g>
              {/* Đế gỗ & trụ đồng của Orrery */}
              <path d="M 556 418 L 624 418 L 614 406 L 566 406 Z" fill="#59321a" stroke="#241208" strokeWidth="1.5" />
              <rect x="586" y="362" width="8" height="44" fill="url(#sciBrass)" />
              {/* Vòng quỹ đạo đồng nghiêng */}
              <ellipse cx="590" cy="362" rx="56" ry="18" fill="none" stroke="#d97706" strokeWidth="2.5" />
              <ellipse cx="590" cy="362" rx="34" ry="11" fill="none" stroke="#fbbf24" strokeWidth="1.8" />
              {/* Mặt Trời vàng ở tâm */}
              <circle cx="590" cy="362" r="11" fill="url(#sciBrass)" />
              {/* Các hành tinh nhỏ trên tay đòn đồng */}
              <g className="sci-orrery-ring-1">
                <circle cx="556" cy="358" r="5" fill="#38bdf8" />
              </g>
              <g className="sci-orrery-ring-2">
                <circle cx="642" cy="366" r="6.5" fill="#f59e0b" />
              </g>
            </g>

            {/* Cân tiểu ly đồng & Bình mẫu khoáng thạch đặt trên mặt tủ gỗ */}
            <rect x="684" y="378" width="28" height="40" rx="5" fill="rgba(167, 243, 208, 0.22)" stroke="#6ee7b7" strokeWidth="1.5" />
            <polygon points="698,388 690,412 706,412" fill="#34d399" />
            <rect x="724" y="384" width="26" height="34" rx="4" fill="rgba(251, 191, 36, 0.22)" stroke="#fbbf24" strokeWidth="1.5" />
            <circle cx="737" cy="404" r="8" fill="#f59e0b" />

            {/* Thân Tủ Gỗ Nhiều Ngăn Kéo (x: 460..890, y: 418..630) */}
            <rect x="458" y="418" width="434" height="212" rx="4" fill="url(#sciOakWood)" stroke="#1b0e07" strokeWidth="3.5" />
            {/* Mặt gỗ dày trên đỉnh tủ */}
            <rect x="450" y="412" width="450" height="12" rx="3" fill="#6b3d1e" stroke="#241208" strokeWidth="2" />

            {/* 8 Ngăn kéo nhỏ phía trên có tay nắm đồng & nhãn phân loại */}
            {Array.from({ length: 4 }, (_, col) =>
              Array.from({ length: 2 }, (_, row) => {
                const dx = 474 + col * 102
                const dy = 434 + row * 42
                return (
                  <g key={`${col}-${row}`}>
                    <rect x={dx} y={dy} width="92" height="34" rx="2" fill="#381e0f" stroke="#1e0f07" strokeWidth="2" />
                    <rect x={dx + 32} y={dy + 8} width="28" height="10" rx="1" fill="#fef3c7" stroke="#92400e" strokeWidth="1" />
                    <path d={`M ${dx + 38} ${dy + 24} Q ${dx + 46} ${dy + 30} ${dx + 54} ${dy + 24}`} stroke="#fbbf24" strokeWidth="2.5" fill="none" />
                  </g>
                )
              })
            )}

            {/* 2 Khoang tủ kính phía dưới trưng bày đá thiên thạch & cuộn bản thảo */}
            <rect x="474" y="524" width="194" height="90" rx="3" fill="#170c06" stroke="#5c341b" strokeWidth="2.5" />
            <rect x="682" y="524" width="194" height="90" rx="3" fill="#170c06" stroke="#5c341b" strokeWidth="2.5" />
            {/* Đồ vật trong khoang kính */}
            <polygon points="515,602 532,576 550,602" fill="#a855f7" opacity="0.85" />
            <circle cx="595" cy="590" r="14" fill="#d97706" />
            <rect x="716" y="582" width="65" height="14" rx="6" fill="#fde68a" />
            <rect x="795" y="568" width="54" height="36" rx="3" fill="#7f1d1d" />
          </g>

          {/* ===============================================================
              LỚP 6: THẢM DỆT TRẢI SÀN CỔ ĐIỂN & KÍNH THIÊN VĂN ĐỒNG THAU LỚN
              =============================================================== */}

          {/* Thảm dệt tròn hoa văn cổ điển dưới chân kính thiên văn */}
          <g>
            <ellipse cx="1165" cy="805" rx="295" ry="68" fill="#581c1c" stroke="#d97706" strokeWidth="4" />
            <ellipse cx="1165" cy="805" rx="260" ry="56" fill="#7f1d1d" stroke="#fbbf24" strokeWidth="2" strokeDasharray="8 5" />
            <ellipse cx="1165" cy="805" rx="185" ry="38" fill="#1e3a5f" stroke="#fde68a" strokeWidth="2" />
            <ellipse cx="1165" cy="805" rx="95" ry="18" fill="#b45309" />
          </g>

          {/* --- KÍNH THIÊN VĂN ĐỒNG THAU KHỔNG LỒ (GIANT TELESCOPE HOTSPOT) --- */}
          <g
            className="sci-telescope-hotspot"
            onClick={handleLaunchSpace}
          >
            <title>Kính Thiên Văn Khúc Xạ Đồng Thau 1200mm (Bấm để phóng vào Vũ Trụ)</title>

            {/* Bóng đổ của chân kiềng trên thảm */}
            <ellipse cx="1175" cy="808" rx="145" ry="26" fill="rgba(0, 0, 0, 0.55)" />

            {/* Chân kiềng gỗ gụ 3 chân nẹp đồng */}
            <line x1="1170" y1="530" x2="1045" y2="800" stroke="#3b1d0e" strokeWidth="15" strokeLinecap="round" />
            <line x1="1170" y1="530" x2="1295" y2="800" stroke="#3b1d0e" strokeWidth="15" strokeLinecap="round" />
            <line x1="1170" y1="530" x2="1170" y2="812" stroke="#241107" strokeWidth="13" strokeLinecap="round" />
            {/* Mũi bọc đồng ở 3 chân */}
            <line x1="1056" y1="776" x2="1045" y2="800" stroke="#f59e0b" strokeWidth="15" strokeLinecap="round" />
            <line x1="1284" y1="776" x2="1295" y2="800" stroke="#f59e0b" strokeWidth="15" strokeLinecap="round" />
            <line x1="1170" y1="786" x2="1170" y2="812" stroke="#d97706" strokeWidth="13" strokeLinecap="round" />

            {/* Khay đồng tam giác đựng thị kính phụ ở giữa chân kiềng */}
            <line x1="1095" y1="685" x2="1245" y2="685" stroke="#b45309" strokeWidth="6" />
            <ellipse cx="1170" cy="685" rx="44" ry="10" fill="url(#sciBrass)" stroke="#451a03" strokeWidth="2" />

            {/* Cụm trục xích đạo & Thanh đối trọng (Equatorial Mount & Counterweight) */}
            <rect x="1152" y="485" width="36" height="52" rx="6" fill="#27272a" stroke="#78350f" strokeWidth="3" />
            <line x1="1170" y1="495" x2="1235" y2="575" stroke="#a1a1aa" strokeWidth="6" strokeLinecap="round" />
            <ellipse cx="1220" cy="556" rx="18" ry="10" fill="url(#sciBrass)" transform="rotate(-38 1220 556)" />
            <circle cx="1170" cy="490" r="24" fill="url(#sciBrass)" stroke="#451a03" strokeWidth="3" />
            <circle cx="1170" cy="490" r="10" fill="#fef3c7" />

            {/* Ống kính đồng thau chính xoay hướng lên cửa sổ vòm (-32 độ) */}
            <g transform="rotate(-32 1170 475)">
              {/* Vệt sáng sao thu vào vật kính */}
              <polygon
                points="1410,435 1620,385 1620,565 1410,515"
                fill="rgba(147, 197, 253, 0.16)"
              />

              {/* Cụm thị kính & Bánh răng lấy nét phía đuôi */}
              <rect x="955" y="463" width="34" height="24" rx="3" fill="#1c1917" stroke="#b45309" strokeWidth="2" />
              <rect x="988" y="456" width="38" height="38" rx="4" fill="url(#sciBrass)" stroke="#451a03" strokeWidth="2.5" />
              <circle cx="1006" cy="502" r="11" fill="#fbbf24" stroke="#78350f" strokeWidth="2.5" />

              {/* Thân ống đồng thau chính */}
              <rect x="1024" y="446" width="320" height="58" rx="6" fill="url(#sciBrass)" stroke="#451a03" strokeWidth="3" />
              {/* Các đai đồng gia cường trên thân ống */}
              <rect x="1095" y="441" width="18" height="68" rx="3" fill="#fef08a" stroke="#78350f" strokeWidth="2" />
              <rect x="1225" y="441" width="18" height="68" rx="3" fill="#fef08a" stroke="#78350f" strokeWidth="2" />

              {/* Loa chắn sương đầu vật kính (Dew Shield) & Thấu kính xanh */}
              <path d="M 1344 438 L 1412 430 L 1412 520 L 1344 512 Z" fill="#92400e" stroke="#451a03" strokeWidth="3" />
              <ellipse cx="1410" cy="475" rx="8" ry="44" fill="#38bdf8" stroke="#bae6fd" strokeWidth="2" />

              {/* Ống ngắm phụ (Finder Scope) gắn song song bên trên */}
              <line x1="1125" y1="444" x2="1125" y2="424" stroke="#78350f" strokeWidth="5" />
              <line x1="1205" y1="444" x2="1205" y2="424" stroke="#78350f" strokeWidth="5" />
              <rect x="1090" y="412" width="142" height="16" rx="4" fill="url(#sciBrass)" stroke="#451a03" strokeWidth="2" />
              <ellipse cx="1232" cy="420" rx="3" ry="8" fill="#38bdf8" />
            </g>
          </g>

          {/* ===============================================================
              LỚP 7: TIỀN CẢNH TRÁI - BÀN NGHIÊN CỨU CHI TIẾT CỦA GIÁO SƯ GẤU
              =============================================================== */}
          <g>
            {/* Bóng gầm bàn nghiên cứu trên sàn gỗ */}
            <ellipse cx="425" cy="865" rx="370" ry="28" fill="rgba(0, 0, 0, 0.7)" />

            {/* Chân bàn gỗ tiện cổ điển */}
            <rect x="105" y="705" width="32" height="165" rx="6" fill="#28140a" stroke="#120804" strokeWidth="2.5" />
            <rect x="715" y="705" width="32" height="165" rx="6" fill="#28140a" stroke="#120804" strokeWidth="2.5" />
            <rect x="148" y="720" width="22" height="130" rx="4" fill="#1b0d06" />
            <rect x="680" y="720" width="22" height="130" rx="4" fill="#1b0d06" />

            {/* Thân bàn gỗ sồi chạm nổi & 3 ngăn kéo có ổ khóa đồng */}
            <rect x="85" y="646" width="680" height="78" rx="6" fill="url(#sciOakWood)" stroke="#1b0e07" strokeWidth="3.5" />

            {/* Ngăn kéo trái */}
            <rect x="112" y="660" width="185" height="50" rx="3" fill="#331b0d" stroke="#1b0e07" strokeWidth="2" />
            <circle cx="204" cy="685" r="8" fill="url(#sciBrass)" />
            {/* Ngăn kéo giữa */}
            <rect x="318" y="660" width="214" height="50" rx="3" fill="#331b0d" stroke="#1b0e07" strokeWidth="2" />
            <rect x="415" y="676" width="20" height="18" rx="3" fill="url(#sciBrass)" />
            <circle cx="425" cy="684" r="3" fill="#1c1917" />
            {/* Ngăn kéo phải */}
            <rect x="552" y="660" width="185" height="50" rx="3" fill="#331b0d" stroke="#1b0e07" strokeWidth="2" />
            <circle cx="644" cy="685" r="8" fill="url(#sciBrass)" />

            {/* Mặt bàn gỗ dày & Tấm thảm da lót bàn màu xanh cổ điển */}
            <polygon points="65,648 785,648 755,616 95,616" fill="#5c341b" stroke="#241208" strokeWidth="3" />
            <polygon points="145,643 705,643 685,621 165,621" fill="#133829" stroke="#d97706" strokeWidth="1.5" />

            {/* --- ĐỒ ĐẠC TRÊN MẶT BÀN NGHIÊN CỨU --- */}

            {/* 1. Đèn bàn học cổ điển chụp xanh (Banker's Lamp) */}
            <g className="sci-hotspot" onClick={handleLampToggle}>
              <title>Đèn bàn Học giả (Bấm để Bật / Tắt đèn)</title>
              {lampOn && (
                <ellipse cx="145" cy="610" rx="115" ry="70" fill="url(#sciDeskLampGlow)" />
              )}
              <rect x="112" y="618" width="46" height="12" rx="4" fill="url(#sciBrass)" stroke="#451a03" strokeWidth="1.5" />
              <path d="M 135 618 L 135 552 Q 135 534 154 534" fill="none" stroke="#d97706" strokeWidth="6" strokeLinecap="round" />
              {/* Chụp đèn thủy tinh xanh lục bảo */}
              <path d="M 118 548 L 182 548 L 168 524 L 132 524 Z" fill="#059669" stroke="#064e3b" strokeWidth="2" />
              {lampOn && <ellipse cx="150" cy="550" rx="26" ry="6" fill="#fef08a" />}
            </g>

            {/* 2. Bình cầu đáy tròn đun trên đèn cồn & Giá 3 ống nghiệm sủi bọt */}
            <g className="sci-hotspot" onClick={handleChemistryClick}>
              <title>Bộ Chưng cất &amp; Ống nghiệm Quang phổ (Bấm để đổi phản ứng màu!)</title>

              {/* Đèn cồn & Chân kiềng đun bình cầu */}
              <rect x="316" y="608" width="34" height="18" rx="4" fill="url(#sciBrass)" stroke="#451a03" strokeWidth="1.5" />
              <g className="sci-burner-flame">
                <path d="M 333 606 Q 324 592 333 580 Q 342 592 333 606 Z" fill="#f59e0b" />
                <path d="M 333 605 Q 328 596 333 588 Q 338 596 333 605 Z" fill="#38bdf8" />
              </g>
              <line x1="308" y1="582" x2="358" y2="582" stroke="#78350f" strokeWidth="3" />
              <line x1="312" y1="582" x2="306" y2="626" stroke="#57534e" strokeWidth="3" />
              <line x1="354" y1="582" x2="360" y2="626" stroke="#57534e" strokeWidth="3" />

              {/* Bình cầu thủy tinh đáy tròn */}
              <rect x="327" y="518" width="12" height="24" fill="rgba(255,255,255,0.2)" stroke="#e2e8f0" strokeWidth="1.8" />
              <circle cx="333" cy="560" r="24" fill="rgba(255,255,255,0.14)" stroke="#e2e8f0" strokeWidth="2" />
              <path
                d="M 311 564 A 22 22 0 0 0 355 564 Z"
                fill={currentTubes[0]}
                opacity="0.88"
              />
              <circle cx="328" cy="568" r="3" fill="#ffffff" className="sci-liquid-bubble" />
              <circle cx="339" cy="572" r="2.5" fill="#ffffff" className="sci-liquid-bubble b2" />

              {/* Giá gỗ đựng 3 ống nghiệm phát sáng */}
              <rect x="378" y="614" width="92" height="12" rx="3" fill="#59321a" stroke="#241208" strokeWidth="1.5" />
              <rect x="382" y="576" width="84" height="6" rx="2" fill="#704022" />
              <line x1="386" y1="576" x2="386" y2="614" stroke="#4f2c17" strokeWidth="4" />
              <line x1="462" y1="576" x2="462" y2="614" stroke="#4f2c17" strokeWidth="4" />

              {[0, 1, 2].map((idx) => {
                const tx = 396 + idx * 22
                return (
                  <g key={idx}>
                    <rect
                      x={tx}
                      y="550"
                      width="14"
                      height="62"
                      rx="7"
                      fill="rgba(255,255,255,0.15)"
                      stroke="rgba(255,255,255,0.7)"
                      strokeWidth="1.5"
                    />
                    <rect
                      x={tx + 1.5}
                      y="572"
                      width="11"
                      height="38"
                      rx="5.5"
                      fill={currentTubes[idx]}
                    />
                    <circle
                      cx={tx + 7}
                      cy="598"
                      r="2.2"
                      fill="#fff"
                      className={`sci-liquid-bubble ${idx === 1 ? 'b2' : idx === 2 ? 'b3' : ''}`}
                    />
                  </g>
                )
              })}
            </g>

            {/* 3. Bộ thí nghiệm Con Lắc Đơn trên bàn (Pendulum Rig) */}
            <g className="sci-hotspot" onClick={() => setActiveModal('pendulum')}>
              <title>Thí nghiệm Con Lắc Đơn Dao Động Điều Hòa (Bấm để đo chu kì T)</title>
              <rect x="492" y="616" width="64" height="10" rx="3" fill="#4f2c17" stroke="#1e0f07" strokeWidth="1.5" />
              <polyline points="504,616 504,518 542,518" fill="none" stroke="url(#sciBrass)" strokeWidth="4.5" strokeLinecap="round" />
              <g className="sci-lab-pendulum">
                <line x1="538" y1="518" x2="538" y2="592" stroke="#fef08a" strokeWidth="2" />
                <circle cx="538" cy="596" r="9.5" fill="url(#sciBrass)" stroke="#fef08a" strokeWidth="1.5" />
              </g>
            </g>

            {/* 4. Sổ tay nghiên cứu mở sẵn, Lọ mực bút lông vũ & Tách trà nóng bốc khói */}
            <g className="sci-hotspot" onClick={() => setActiveModal('journal')}>
              <title>Sổ Tay Nghiên Cứu của Giáo sư Gấu Trúc (Bấm để đọc)</title>

              {/* Cuốn sổ da mở rộng trên mặt bàn */}
              <polygon points="572,632 668,632 658,596 582,596" fill="#78350f" stroke="#291509" strokeWidth="2" />
              <polygon points="576,628 620,628 616,598 584,598" fill="#fef3c7" stroke="#d97706" strokeWidth="1" />
              <polygon points="620,628 664,628 656,598 616,598" fill="#fef3c7" stroke="#d97706" strokeWidth="1" />
              <line x1="586" y1="608" x2="612" y2="608" stroke="#92400e" strokeWidth="1.5" />
              <line x1="584" y1="616" x2="612" y2="616" stroke="#92400e" strokeWidth="1.5" />
              <line x1="624" y1="608" x2="650" y2="608" stroke="#92400e" strokeWidth="1.5" />
              <line x1="624" y1="616" x2="652" y2="616" stroke="#92400e" strokeWidth="1.5" />

              {/* Lọ mực đồng & Bút lông vũ */}
              <rect x="678" y="604" width="20" height="20" rx="4" fill="#1e293b" stroke="#fbbf24" strokeWidth="1.5" />
              <path d="M 688 604 Q 702 568 718 558 Q 708 584 692 604 Z" fill="#fef3c7" stroke="#d97706" strokeWidth="1" />

              {/* Tách trà sứ nóng đang bốc khói mảnh */}
              <ellipse cx="728" cy="624" rx="18" ry="5" fill="#e2e8f0" stroke="#94a3b8" strokeWidth="1.5" />
              <path d="M 714 606 L 742 606 L 738 623 L 718 623 Z" fill="#f8fafc" stroke="#cbd5e1" strokeWidth="1.5" />
              <path d="M 741 609 Q 750 614 740 620" fill="none" stroke="#cbd5e1" strokeWidth="2.5" />
              <path d="M 724 600 Q 719 588 726 578" fill="none" stroke="rgba(255,255,255,0.55)" strokeWidth="2" strokeLinecap="round" className="sci-tea-steam" />
              <path d="M 733 602 Q 738 590 731 580" fill="none" stroke="rgba(255,255,255,0.45)" strokeWidth="2" strokeLinecap="round" className="sci-tea-steam s2" />
            </g>
          </g>

          {/* ===============================================================
              LỚP 8: KHUNG DẦM GỖ GÁC MÁI, ĐÈN CHÙM THẢ TRẦN & HẠT BỤI VÀNG
              =============================================================== */}
          {/* Kèo gỗ gác mái trên trần */}
          <polygon points="0,0 1600,0 1600,44 0,44" fill="#180d07" />
          <rect x="0" y="42" width="1600" height="8" fill="#3b2010" />
          <polygon points="0,44 220,44 0,210" fill="#23130a" stroke="#472814" strokeWidth="3" />
          <polygon points="1600,44 1380,44 1600,210" fill="#23130a" stroke="#472814" strokeWidth="3" />

          {/* Đèn thả trần chụp đồng cổ điển & Quầng sáng vàng ấm */}
          <g className="sci-hotspot" onClick={handleLampToggle}>
            <title>Đèn chùm Gác mái (Bấm để Bật / Tắt ánh sáng vàng)</title>
            {lampOn && (
              <polygon points="620,122 980,122 1260,880 340,880" fill="url(#sciCeilingLight)" pointerEvents="none" />
            )}
            <line x1="800" y1="44" x2="800" y2="104" stroke="#78350f" strokeWidth="4" />
            <path d="M 754 124 L 846 124 L 826 98 L 774 98 Z" fill="url(#sciBrass)" stroke="#451a03" strokeWidth="2" />
            {lampOn && (
              <ellipse cx="800" cy="126" rx="34" ry="10" fill="#fef08a" />
            )}
          </g>

          {/* Các hạt bụi vàng lơ lửng trong không gian phòng */}
          <g pointerEvents="none">
            {LAB_DUST.map((d) => (
              <circle
                key={d.id}
                cx={d.cx}
                cy={d.cy}
                r={d.r}
                fill="#fde68a"
                className="sci-dust-mote"
                style={{ '--dur': d.dur, '--delay': d.delay }}
              />
            ))}
          </g>
        </svg>

        {/* ===============================================================
            GIÁO SƯ GẤU TRÚC ĐỨNG SAU BÀN NGHIÊN CỨU & NÚT KÍNH THIÊN VĂN
            =============================================================== */}
        <div
          className="sci-panda-station"
          onClick={handlePandaClick}
          title="Bấm để trò chuyện cùng Giáo sư Gấu Trúc"
        >
          <div className="sci-panda-speech">{pandaQuote}</div>
          <FrontPanda pose={pandaMood} />
        </div>

        {/* Huy hiệu mời bấm vào Kính Thiên Văn */}
        <button
          type="button"
          className="sci-floating-callout"
          onClick={handleLaunchSpace}
        >
          <Icon name="telescope" />
          <span>Ngắm Bầu Trời Sao Qua Kính Thiên Văn &rarr;</span>
        </button>

        {/* Thanh phím tắt khám phá nhanh các góc trong phòng */}
        <div className="sci-room-hintbar" aria-label="Các góc khám phá trong phòng">
          <span>Khám phá đồ đạc trong phòng:</span>
          <button type="button" className="sci-hint-chip" onClick={() => setActiveModal('bookshelf')}>
            📚 Giá sách cổ
          </button>
          <button type="button" className="sci-hint-chip" onClick={() => setActiveModal('cabinet')}>
            🗄️ Tủ gỗ &amp; Hệ Mặt Trời
          </button>
          <button type="button" className="sci-hint-chip" onClick={() => setActiveModal('chalkboard')}>
            📝 Bảng đen công thức
          </button>
          <button type="button" className="sci-hint-chip" onClick={() => setActiveModal('pendulum')}>
            ⏱️ Con lắc đơn
          </button>
          <button type="button" className="sci-hint-chip" onClick={() => setActiveModal('journal')}>
            📖 Sổ tay của Gấu
          </button>
          <button type="button" className="sci-hint-chip" onClick={handleLaunchSpace}>
            🔭 Vào Vũ Trụ
          </button>
        </div>
      </div>

      {/* =================================================================
          4. HIỆU ỨNG THẤU KÍNH QUANG HỌC PHÓNG VÀO VŨ TRỤ (OPTICAL IRIS)
          ================================================================= */}
      <div className={`sci-optical-iris ${isZoomingSpace ? 'is-active' : ''}`}>
        <div className="sci-lens-flare" />
      </div>

      {/* =================================================================
          5. CÁC HỘP THOẠI KHÁM PHÁ ĐỒ ĐẠC TRONG PHÒNG (MODALS)
          ================================================================= */}

      {/* Modal 1: Giá sách gỗ kịch trần & Bản đồ sao */}
      {activeModal === 'bookshelf' && (
        <div className="sci-modal-backdrop" onClick={() => setActiveModal(null)}>
          <div className="sci-parchment-card" onClick={(e) => e.stopPropagation()}>
            <button type="button" className="sci-card-close" onClick={() => setActiveModal(null)} aria-label="Đóng">
              <Icon name="close" />
            </button>
            <h3 className="sci-modal-title">📚 Tủ Sách Học Thuật &amp; Bản Đồ Sao Cổ</h3>
            <p className="sci-modal-desc">
              Giá sách gỗ sồi kịch trần lưu giữ những trước tác vĩ đại nhất lịch sử Vật lý và Thiên văn học:
            </p>
            <div className="sci-modal-box">
              <div className="sci-modal-formula">1. Philosophiæ Naturalis Principia Mathematica (1687)</div>
              <div className="sci-modal-sub">
                Tác phẩm kinh điển của Isaac Newton đặt nền móng cho cơ học cổ điển và định luật vạn vật hấp dẫn, chứng minh lực giữ Mặt Trăng trên quỹ đạo cũng chính là lực làm quả táo rơi.
              </div>
            </div>
            <div className="sci-modal-box">
              <div className="sci-modal-formula">2. Sidereus Nuncius – Sứ Giả Các Vì Sao (Galileo, 1610)</div>
              <div className="sci-modal-sub">
                Những trang bản thảo đầu tiên ghi lại hình ảnh núi lửa trên Mặt Trăng và 4 vệ tinh lớn của Sao Mộc nhìn qua kính thiên văn khúc xạ.
              </div>
            </div>
            <div className="sci-modal-box">
              <div className="sci-modal-formula">3. Quả Địa Cầu Thiên Văn &amp; Đồng Hồ Cát</div>
              <div className="sci-modal-sub">
                Giúp xác định tọa độ xích kinh, xích vĩ của các chòm sao trước khi hướng ống kính thiên văn ra bầu trời đêm.
              </div>
            </div>
            <div className="sci-modal-actions">
              <button type="button" className="btn btn-primary" onClick={() => setActiveModal(null)}>
                Đóng tủ sách
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal 2: Tủ gỗ nhiều ngăn kéo & Mô hình Hệ Mặt Trời cơ khí */}
      {activeModal === 'cabinet' && (
        <div className="sci-modal-backdrop" onClick={() => setActiveModal(null)}>
          <div className="sci-parchment-card" onClick={(e) => e.stopPropagation()}>
            <button type="button" className="sci-card-close" onClick={() => setActiveModal(null)} aria-label="Đóng">
              <Icon name="close" />
            </button>
            <h3 className="sci-modal-title">🗄️ Tủ Gỗ Trưng Bày Mẫu Vật &amp; Mô Hình Orrery</h3>
            <p className="sci-modal-desc">
              Chiếc tủ gỗ 8 ngăn kéo của Giáo sư Gấu Trúc bảo quản các mẫu khoáng thạch quý và dụng cụ đo đạc:
            </p>
            <div className="sci-modal-box">
              <div className="sci-modal-formula">⚙️ Mô hình Hệ Mặt Trời cơ khí (Brass Orrery)</div>
              <div className="sci-modal-sub">
                Hệ thống bánh răng đồng mô phỏng chính xác tỉ lệ chu kì quay của Trái Đất, Sao Kim và Sao Hỏa quanh Mặt Trời theo định luật III Kepler: T² tỉ lệ thuận với bán trục lớn a³.
              </div>
            </div>
            <div className="sci-modal-box">
              <div className="sci-modal-formula">☄️ Ngăn kéo mẫu vật Thiên thạch &amp; Lăng kính</div>
              <div className="sci-modal-sub">
                Chứa các mảnh thiên thạch sắt-niken, lăng kính thủy tinh tán sắc ánh sáng trắng thành dải quang phổ 7 màu và bộ thị kính tiêu cự 25mm, 10mm.
              </div>
            </div>
            <div className="sci-modal-actions">
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => {
                  setActiveModal(null)
                  handleLaunchSpace()
                }}
              >
                🔭 Quan sát Hệ Mặt Trời thật
              </button>
              <button type="button" className="btn btn-primary" onClick={() => setActiveModal(null)}>
                Đóng ngăn tủ
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal 3: Bảng đen công thức */}
      {activeModal === 'chalkboard' && (
        <div className="sci-modal-backdrop" onClick={() => setActiveModal(null)}>
          <div className="sci-parchment-card" onClick={(e) => e.stopPropagation()}>
            <button type="button" className="sci-card-close" onClick={() => setActiveModal(null)} aria-label="Đóng">
              <Icon name="close" />
            </button>
            <h3 className="sci-modal-title">📝 Bảng Đen Công Thức Vật Lý &amp; Thiên Văn</h3>
            <p className="sci-modal-desc">
              Các phương trình cốt lõi được Giáo sư Gấu Trúc ghi chú trên bảng đá xanh:
            </p>
            <div className="sci-modal-box">
              <div className="sci-modal-formula">F = G · (m₁m₂ / r²)</div>
              <div className="sci-modal-sub">
                Định luật vạn vật hấp dẫn: Lực hút giữa hai thiên thể tỉ lệ thuận với tích khối lượng và tỉ lệ nghịch với bình phương khoảng cách giữa chúng.
              </div>
            </div>
            <div className="sci-modal-box">
              <div className="sci-modal-formula">λ = v / f = c / f</div>
              <div className="sci-modal-sub">
                Bước sóng bức xạ điện từ: Phân tích vạch phổ phát xạ giúp biết được nhiệt độ và thành phần nguyên tố của các ngôi sao cách xa hàng trăm năm ánh sáng.
              </div>
            </div>
            <div className="sci-modal-box">
              <div className="sci-modal-formula">E = m · c²</div>
              <div className="sci-modal-sub">
                Hệ thức Einstein giải thích nguồn năng lượng nhiệt hạch khổng lồ trong lõi Mặt Trời và các ngôi sao.
              </div>
            </div>
            <div className="sci-modal-actions">
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => {
                  setActiveModal(null)
                  handleLaunchSpace()
                }}
              >
                🔭 Vào kính thiên văn kiểm chứng
              </button>
              <button type="button" className="btn btn-primary" onClick={() => setActiveModal(null)}>
                Đã hiểu
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal 4: Thí nghiệm Con Lắc Đơn */}
      {activeModal === 'pendulum' && (
        <div className="sci-modal-backdrop" onClick={() => setActiveModal(null)}>
          <div className="sci-parchment-card" onClick={(e) => e.stopPropagation()}>
            <button type="button" className="sci-card-close" onClick={() => setActiveModal(null)} aria-label="Đóng">
              <Icon name="close" />
            </button>
            <h3 className="sci-modal-title">⏱️ Thí Nghiệm Tương Tác: Con Lắc Đơn</h3>
            <p className="sci-modal-desc">
              Thay đổi chiều dài dây treo <b>l</b> trên giá đồng để quan sát sự thay đổi của chu kì dao động điều hòa <b>T = 2π√(l/g)</b>:
            </p>
            <div className="sci-modal-box">
              <div className="sci-slider-row">
                <span>Chiều dài dây treo (l):</span>
                <strong style={{ color: '#fbbf24', fontSize: '1.05rem' }}>{pendulumLength.toFixed(1)} m</strong>
              </div>
              <input
                type="range"
                min="0.2"
                max="3.0"
                step="0.1"
                value={pendulumLength}
                onChange={(e) => setPendulumLength(parseFloat(e.target.value))}
                className="sci-range-input"
              />
              <div className="sci-slider-row" style={{ marginBottom: 0 }}>
                <span>Chu kì dao động (T) tại Trái Đất (g = 9,8 m/s²):</span>
                <strong style={{ color: '#34d399', fontSize: '1.15rem' }}>{pendulumPeriod} giây</strong>
              </div>
            </div>
            <div className="sci-modal-actions">
              <button type="button" className="btn btn-primary" onClick={() => setActiveModal(null)}>
                Hoàn thành thí nghiệm
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal 5: Sổ tay nghiên cứu của Giáo sư Gấu */}
      {activeModal === 'journal' && (
        <div className="sci-modal-backdrop" onClick={() => setActiveModal(null)}>
          <div className="sci-parchment-card" onClick={(e) => e.stopPropagation()}>
            <button type="button" className="sci-card-close" onClick={() => setActiveModal(null)} aria-label="Đóng">
              <Icon name="close" />
            </button>
            <h3 className="sci-modal-title">📖 Sổ Tay Nghiên Cứu Của Giáo Sư Gấu Trúc</h3>
            <p className="sci-modal-desc">
              <i>
                &ldquo;Mỗi đêm nhìn qua vòm kính gác mái này, mình lại thấy những định luật Vật lý trên trang giấy hiện lên sống động giữa các vì sao!&rdquo;
              </i>
            </p>
            <div className="sci-modal-box">
              <div className="sci-modal-formula">Nhật ký quan sát đêm nay:</div>
              <div className="sci-modal-sub">
                &bull; Bầu trời quang đãng, độ nhìn xa tuyệt vời để quan sát Hệ Mặt Trời và các hành tinh.<br />
                &bull; Bấm vào bình cầu trên bàn để thử phản ứng quang phổ phát sáng.<br />
                &bull; Bấm vào chiếc Kính Thiên Văn đồng thau lớn bên phải để bắt đầu chuyến du hành vũ trụ!
              </div>
            </div>
            <div className="sci-modal-actions">
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => {
                  setActiveModal(null)
                  handleLaunchSpace()
                }}
              >
                🔭 Nhìn qua Kính Thiên Văn ngay &rarr;
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )

  return createPortal(content, document.body)
}
