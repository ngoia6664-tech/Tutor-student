import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import Icon from '../Icon.jsx'
import { FrontPanda } from '../PandaArt.jsx'
import './scienceLab.css'

const TARGETS = [
  {
    id: 'moon',
    name: 'Mặt Trăng (Moon)',
    icon: '🌕',
    dist: '384 400 km',
    phase: 'Trăng tròn 100%',
    note: 'Chi tiết các biển dung nham cổ và hố thiên thạch Tycho.',
  },
  {
    id: 'saturn',
    name: 'Sao Thổ (Saturn)',
    icon: '🪐',
    dist: '1.4 tỉ km',
    phase: 'Vành đai nghiêng 26°',
    note: 'Quan sát vành đai băng đá rực rỡ và mặt trăng Titan.',
  },
  {
    id: 'jupiter',
    name: 'Sao Mộc (Jupiter)',
    icon: '🌌',
    dist: '628 triệu km',
    phase: 'Vệt Đỏ Lớn đang quay',
    note: '4 vệ tinh Galileo (Io, Europa, Ganymede, Callisto).',
  },
  {
    id: 'orion',
    name: 'Tinh vân Lạp Hộ (M42)',
    icon: '✨',
    dist: '1 344 năm ánh sáng',
    phase: 'Vườn ươm sao trẻ',
    note: 'Đám mây bụi khí khổng lồ nơi các ngôi sao mới chào đời.',
  },
]

export default function ScienceLab({ onClose, onOpenSpace, initialWalkIn = true }) {
  const [tab, setTab] = useState('telescope') // 'telescope' | 'lab' | 'journal'
  const [walkIn, setWalkIn] = useState(initialWalkIn)
  const [doorOpen, setDoorOpen] = useState(false)
  const [pandaWalking, setPandaWalking] = useState(false)
  const [target, setTarget] = useState(TARGETS[0])
  const [pendulumLength, setPendulumLength] = useState(1.0) // mét

  // Tính chu kì con lắc T = 2π * √(l / 9.8)
  const pendulumPeriod = (2 * Math.PI * Math.sqrt(pendulumLength / 9.8)).toFixed(2)

  // Hoạt cảnh cửa mở & gấu bước vào phòng
  useEffect(() => {
    if (!walkIn) return
    const t1 = setTimeout(() => setDoorOpen(true), 250)
    const t2 = setTimeout(() => setPandaWalking(true), 650)
    const t3 = setTimeout(() => {
      setWalkIn(false)
      setDoorOpen(false)
      setPandaWalking(false)
    }, 2400)
    return () => {
      clearTimeout(t1)
      clearTimeout(t2)
      clearTimeout(t3)
    }
  }, [walkIn])

  // Khóa cuộn trang nền khi mở phòng khoa học & lắng nghe phím Esc để đóng
  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = (e) => {
      if (e.key === 'Escape' && typeof onClose === 'function') {
        onClose()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = prev
      window.removeEventListener('keydown', onKey)
    }
  }, [onClose])

  function replayWalkIn() {
    setDoorOpen(false)
    setPandaWalking(false)
    setWalkIn(true)
  }

  function handleTelescopeLaunch() {
    if (typeof onOpenSpace === 'function') {
      onOpenSpace()
    } else {
      alert('Đang mở Kính Thiên Văn thám hiểm Không Gian Vũ Trụ!')
    }
  }

  const content = (
    <div
      className="sci-root-overlay fixed inset-0 z-[9999] overflow-y-auto p-3 md:p-6 flex flex-col"
      style={{
        background: 'rgba(15, 12, 10, 0.94)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
      }}
    >
      <div className="max-w-4xl w-full mx-auto my-auto">
        <div className="science-lab">
          {/* 1. Modal hoạt cảnh: Gấu bước vào phòng */}
          {walkIn && (
            <div className="sci-walkin-overlay">
              <div className="sci-door-stage">
                <div className="sci-door-frame">
                  {/* Luồng sáng vàng rực từ bên trong phòng */}
                  <div className={`sci-door-light ${doorOpen ? 'is-shining' : ''}`} />
                  {/* Cánh cửa xoay bản lề */}
                  <div className={`sci-door-leaf ${doorOpen ? 'is-opened' : ''}`}>
                    <div className="sci-door-sign">Phòng Khoa Học</div>
                    <div className="sci-door-knob" />
                  </div>
                </div>

                {/* Chú gấu trúc bước qua cửa */}
                <div className={`sci-panda-walker ${pandaWalking ? 'is-walking' : ''}`}>
                  <FrontPanda pose="wait" />
                </div>
              </div>

              <div className="sci-walkin-caption">
                Giáo sư Gấu Trúc đang mở cửa vào Phòng Nghiên Cứu Khoa Học...
              </div>
              <button type="button" className="sci-walkin-skip" onClick={() => setWalkIn(false)}>
                Bỏ qua hoạt cảnh &rarr;
              </button>
            </div>
          )}

          {/* 2. Thanh đầu trang chuẩn UI của App */}
          <header className="sci-head">
            <div className="sci-title-group">
              <span className="sci-title-icon">
                <Icon name="telescope" />
              </span>
              <div>
                <h1 className="sci-title">Phòng Khoa Học & Nghiên Cứu</h1>
                <p className="sci-subtitle">
                  Trạm thiên văn gác mái • Khám phá quang học, bảng công thức vật lý & bầu trời sao
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="sci-status-pill">
                <span className="sci-status-dot" />
                Đài quan sát sẵn sàng
              </span>
              {onClose && (
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={onClose}
                  title="Đóng phòng khoa học"
                  aria-label="Đóng"
                >
                  <Icon name="close" />
                </button>
              )}
            </div>
          </header>

          {/* 3. Thanh Tab chế độ trong phòng */}
          <nav className="sci-tabs" aria-label="Các khu vực trong phòng">
            <button
              type="button"
              className={`sci-tab ${tab === 'telescope' ? 'active' : ''}`}
              onClick={() => setTab('telescope')}
            >
              <Icon name="telescope" />
              Đài Thiên Văn ({target.name.split(' ')[0]})
            </button>
            <button
              type="button"
              className={`sci-tab ${tab === 'lab' ? 'active' : ''}`}
              onClick={() => setTab('lab')}
            >
              <Icon name="assignment" />
              Bàn Thí Nghiệm & Bảng Đen
            </button>
            <button
              type="button"
              className={`sci-tab ${tab === 'journal' ? 'active' : ''}`}
              onClick={() => setTab('journal')}
            >
              <Icon name="book" />
              Sổ Tay Giáo Sư Gấu Trúc
            </button>
          </nav>

          {/* 4. Nội dung từng Tab */}
          {tab === 'telescope' && (
            <div className="sci-observatory-grid">
              {/* Card Kính Thiên Văn Trung Tâm */}
              <section className="sci-telescope-card">
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="badge badge-primary font-mono text-xs">
                      KHÚC XẠ QUANG HỌC &bull; TIÊU CỰ 1200mm
                    </span>
                    <span className="muted small font-mono">Bội giác 400x</span>
                  </div>

                  {/* Khung cửa sổ vòm ngắm trời đêm */}
                  <div className="sci-telescope-window">
                    <div className="sci-moon">
                      <div className="sci-moon-crater" style={{ top: 12, left: 16, width: 10, height: 10 }} />
                      <div className="sci-moon-crater" style={{ top: 26, left: 28, width: 14, height: 14 }} />
                    </div>

                    {/* Vệt sáng từ thấu kính chĩa lên bầu trời */}
                    <div className="sci-telescope-beam" />

                    {/* Hình kính thiên văn đồng thau cổ điển */}
                    <svg viewBox="0 0 170 160" className="sci-telescope-art">
                      {/* Chân kiềng gỗ */}
                      <line x1="85" y1="90" x2="35" y2="155" stroke="#452715" strokeWidth="6" strokeLinecap="round" />
                      <line x1="85" y1="90" x2="135" y2="155" stroke="#452715" strokeWidth="6" strokeLinecap="round" />
                      <line x1="85" y1="90" x2="85" y2="158" stroke="#27160c" strokeWidth="5" strokeLinecap="round" />
                      {/* Khớp xoay trục tọa độ */}
                      <circle cx="85" cy="90" r="10" fill="#d97706" stroke="#78350f" strokeWidth="2" />
                      <circle cx="85" cy="90" r="4" fill="#fef08a" />
                      {/* Ống kính chính chĩa góc nghiêng */}
                      <g transform="rotate(-34 85 90)">
                        <rect x="35" y="76" width="115" height="18" rx="3" fill="#b45309" stroke="#78350f" strokeWidth="2" />
                        <rect x="50" y="74" width="8" height="22" rx="1.5" fill="#f59e0b" />
                        <rect x="95" y="74" width="8" height="22" rx="1.5" fill="#f59e0b" />
                        <path d="M150 72 L162 67 L162 103 L150 98 Z" fill="#92400e" stroke="#78350f" strokeWidth="1.5" />
                        <ellipse cx="161" cy="85" rx="2" ry="17" fill="#38bdf8" />
                        <rect x="25" y="80" width="10" height="10" rx="2" fill="#78350f" />
                      </g>
                    </svg>
                  </div>

                  {/* Thông tin mục tiêu hiện tại */}
                  <div className="mb-4">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xl">{target.icon}</span>
                      <h3 className="m-0 text-base font-bold text-[var(--text)]">{target.name}</h3>
                    </div>
                    <p className="small muted m-0 leading-relaxed">{target.note}</p>
                    <div className="flex gap-4 mt-2 text-xs font-mono text-[var(--muted)]">
                      <span>Khoảng cách: <b className="text-[var(--text)]">{target.dist}</b></span>
                      <span>Trạng thái: <b className="text-[var(--primary)]">{target.phase}</b></span>
                    </div>
                  </div>
                </div>

                {/* Nút hành động chính: Nhìn qua kính thiên văn bay vào Vũ Trụ */}
                <button
                  type="button"
                  className="sci-launch-btn"
                  onClick={handleTelescopeLaunch}
                >
                  <Icon name="telescope" />
                  <span>Nhìn Qua Kính Thiên Văn &rarr; Vào Không Gian Vũ Trụ</span>
                </button>
              </section>

              {/* Cột danh sách mục tiêu quan sát */}
              <aside className="sci-targets-card">
                <div className="flex items-center justify-between border-b border-[var(--border)] pb-2">
                  <span className="font-bold text-sm text-[var(--text)]">Mục tiêu quan sát đêm nay</span>
                  <span className="badge badge-warn text-xs">4 thiên thể</span>
                </div>

                <div className="flex flex-col gap-2 mt-1">
                  {TARGETS.map((t) => (
                    <div
                      key={t.id}
                      className={`sci-target-item ${target.id === t.id ? 'is-selected' : ''}`}
                      onClick={() => setTarget(t)}
                    >
                      <span className="sci-target-icon">{t.icon}</span>
                      <div className="sci-target-info">
                        <div className="sci-target-name">{t.name}</div>
                        <div className="sci-target-meta">{t.phase} &bull; {t.dist}</div>
                      </div>
                      {target.id === t.id && (
                        <span className="badge badge-ok text-[11px]">Đang ngắm</span>
                      )}
                    </div>
                  ))}
                </div>

                <div className="mt-auto pt-3 border-t border-[var(--border)] text-xs text-[var(--muted)] flex items-center justify-between">
                  <span>Độ ẩm: 62% &bull; Tầm nhìn: Rất tốt</span>
                  <button
                    type="button"
                    className="btn btn-ghost text-xs py-1 px-2"
                    onClick={replayWalkIn}
                    title="Phát lại hoạt cảnh bước vào phòng"
                  >
                    🚪 Xem lại cửa vào
                  </button>
                </div>
              </aside>
            </div>
          )}

          {tab === 'lab' && (
            <div className="flex flex-col gap-4">
              {/* Bảng phấn công thức Thiên văn & Vật lý */}
              <section className="sci-board-card">
                <div className="sci-board-title">
                  <span>BẢNG ĐEN CÔNG THỨC VẬT LÝ & THIÊN VĂN</span>
                  <span className="text-xs font-mono opacity-80">PHÒNG THÍ NGHIỆM #01</span>
                </div>

                <div className="sci-formula-grid">
                  <div className="sci-formula-box">
                    <div className="sci-formula-math">T = 2&pi; &radic;(l / g)</div>
                    <div className="sci-formula-desc">
                      <b>Chu kì con lắc đơn:</b> Phụ thuộc vào chiều dài dây treo <i>l</i> và gia tốc trọng trường <i>g</i>. Không phụ thuộc vào khối lượng vật nặng!
                    </div>
                  </div>

                  <div className="sci-formula-box">
                    <div className="sci-formula-math">F = G &times; (m&sub1;m&sub2; / r&sup2;)</div>
                    <div className="sci-formula-desc">
                      <b>Định luật vạn vật hấp dẫn:</b> Lực hút giữa hai thiên thể tỉ lệ thuận với tích khối lượng và tỉ lệ nghịch với bình phương khoảng cách.
                    </div>
                  </div>

                  <div className="sci-formula-box">
                    <div className="sci-formula-math">&lambda; = v / f = c / f</div>
                    <div className="sci-formula-desc">
                      <b>Bước sóng ánh sáng:</b> Ánh sáng từ các vì sao truyền qua chân không vũ trụ với vận tốc <i>c &approx; 300 000 km/s</i>.
                    </div>
                  </div>

                  <div className="sci-formula-box">
                    <div className="sci-formula-math">E = m &times; c&sup2;</div>
                    <div className="sci-formula-desc">
                      <b>Hệ thức Einstein:</b> Nguồn gốc năng lượng hạt nhân phát sáng của Mặt Trời và các ngôi sao trong ngân hà.
                    </div>
                  </div>
                </div>
              </section>

              {/* Dụng cụ thí nghiệm mô phỏng con lắc đơn */}
              <section className="card p-4">
                <h3 className="text-base font-bold mb-2 flex items-center gap-2">
                  <Icon name="zap" /> Thí nghiệm tương tác: Con lắc đơn dao động điều hòa
                </h3>
                <p className="small muted mb-4">
                  Kéo thanh trượt để thay đổi chiều dài dây con lắc <b>l</b> và quan sát chu kì dao động <b>T</b> tương ứng.
                </p>

                <div className="flex items-center gap-4 flex-wrap bg-[var(--surface-2)] p-3 rounded-xl border border-[var(--border)]">
                  <label htmlFor="pendulumSlider" className="font-semibold text-sm">
                    Chiều dài dây l: <b className="text-[var(--primary)]">{pendulumLength} m</b>
                  </label>
                  <input
                    id="pendulumSlider"
                    type="range"
                    min="0.2"
                    max="3.0"
                    step="0.1"
                    value={pendulumLength}
                    onChange={(e) => setPendulumLength(parseFloat(e.target.value))}
                    className="flex-1 min-w-[180px]"
                  />
                  <div className="font-mono text-sm px-3 py-1 bg-[var(--surface)] border border-[var(--border-strong)] rounded-lg">
                    Chu kì tính toán: <b className="text-amber-400">{pendulumPeriod} giây</b>
                  </div>
                </div>
              </section>
            </div>
          )}

          {tab === 'journal' && (
            <div className="sci-journal-wrap">
              {/* Bục gấu giáo sư trúc */}
              <div className="sci-panda-stand">
                <div className="sci-panda-frame">
                  <FrontPanda pose="teach" />
                </div>
                <b className="mt-2 text-sm">Giáo sư Gấu Trúc</b>
                <span className="small muted">Chủ nhiệm Đài Quan Sát</span>
              </div>

              {/* Sổ tay ghi chép */}
              <div className="sci-journal-bubble">
                <div className="flex items-center justify-between border-b border-[var(--border)] pb-2">
                  <h3 className="m-0 text-base font-bold">Ghi Chép Hành Trình Nghiên Cứu</h3>
                  <span className="badge badge-primary text-xs">Cập nhật hôm nay</span>
                </div>

                <p className="leading-relaxed text-sm">
                  "Chào mừng các bạn học sinh đến với <b>Phòng Nghiên Cứu Khoa Học</b>! Căn phòng này được thiết kế để kết nối kiến thức Toán học, Vật lý và Thiên văn thành một thể thống nhất sinh động."
                </p>

                <div className="p-3 rounded-xl bg-[var(--surface-2)] border border-[var(--border)] text-sm space-y-2">
                  <div className="font-semibold text-[var(--primary)]">Nhiệm vụ tuần này của bạn:</div>
                  <ul className="m-0 pl-5 space-y-1 text-xs text-[var(--muted)]">
                    <li>&bull; Quan sát vành đai Sao Thổ qua kính thiên văn tiêu cự 1200mm.</li>
                    <li>&bull; Tính vận tốc thoát ly khỏi bề mặt Trái Đất theo công thức hấp dẫn.</li>
                    <li>&bull; Hoàn thành 3 câu trắc nghiệm dao động điều hòa để nhận Huy hiệu Nhà Khoa Học Trẻ.</li>
                  </ul>
                </div>

                <div className="pt-2 flex justify-end">
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={handleTelescopeLaunch}
                  >
                    <Icon name="telescope" />
                    Vào ngắm hệ sao cùng Gấu Trúc
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )

  return createPortal(content, document.body)
}

