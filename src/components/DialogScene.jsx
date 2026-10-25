import { FrontPanda } from './PandaArt.jsx'

// Cảnh minh họa trong hộp thoại (components/DialogHost.jsx): gấu với biểu cảm hợp hành động + đồ vật bên cạnh.
// Chuyển động nhẹ do styles/dialog.css điều khiển qua các class dlg-*.
const STAR = 'M0 -6 L1.7 -1.7 L6 0 L1.7 1.7 L0 6 L-1.7 1.7 L-6 0 L-1.7 -1.7 Z' // ngôi sao lấp lánh 4 cánh

// Đăng xuất: cánh cửa hé mở, ánh sáng bên ngoài, biển EXIT
function Door() {
  return (
    <svg viewBox="0 0 80 110" aria-hidden="true">
      <defs>
        <linearGradient id="dlg-door-light" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#fef9c3" />
          <stop offset="1" stopColor="#fbbf24" />
        </linearGradient>
      </defs>
      <rect x="22" y="1" width="30" height="10" rx="2" fill="#16a34a" stroke="#14532d" strokeWidth="1" />
      <text x="37" y="8.6" textAnchor="middle" fontSize="7" fontWeight="800" fill="#fff" fontFamily="sans-serif">
        EXIT
      </text>
      <rect x="10" y="14" width="54" height="94" rx="3" fill="#78350f" />
      <rect x="15" y="19" width="44" height="89" fill="url(#dlg-door-light)" />
      {/* Ánh sáng hắt ra sàn */}
      <path d="M15 108 L59 108 L74 110 L4 110 Z" fill="#fde68a" opacity="0.6" />
      <g className="dlg-door-leaf">
        <path d="M15 19 L38 25 L38 102 L15 108 Z" fill="#b45309" stroke="#78350f" strokeWidth="1.5" strokeLinejoin="round" />
        <path d="M19 30 L34 33 L34 58 L19 57 Z M19 66 L34 67 L34 95 L19 99 Z" fill="none" stroke="#92400e" strokeWidth="1.2" />
        <circle cx="33" cy="64" r="2.4" fill="#facc15" stroke="#a16207" strokeWidth="0.8" />
      </g>
    </svg>
  )
}

// Hỏi nộp bài: tờ bài làm đang bay vào khay "Nộp bài"
function Inbox() {
  return (
    <svg viewBox="0 0 80 110" aria-hidden="true">
      <g className="dlg-paper">
        <g transform="rotate(-10 40 36)">
          <rect x="24" y="12" width="32" height="42" rx="2.5" fill="#fff" stroke="#a78bfa" strokeWidth="1.6" />
          <path d="M29 21 h22 M29 27 h22 M29 33 h16 M29 39 h20 M29 45 h12" stroke="#c4b5fd" strokeWidth="1.8" strokeLinecap="round" />
        </g>
      </g>
      <path d="M8 74 L72 74 L66 104 L14 104 Z" fill="#7c3aed" stroke="#4c1d95" strokeWidth="1.6" strokeLinejoin="round" />
      <path d="M4 70 h72 v6 h-72 z" fill="#a78bfa" stroke="#4c1d95" strokeWidth="1.4" />
      <text x="40" y="93" textAnchor="middle" fontSize="9" fontWeight="800" fill="#fff" fontFamily="sans-serif">
        NỘP BÀI
      </text>
    </svg>
  )
}

// Nộp xong: tờ bài có dấu tích xanh + sao lấp lánh
function GradedPaper() {
  return (
    <svg viewBox="0 0 80 110" aria-hidden="true">
      <g transform="rotate(6 40 60)">
        <rect x="14" y="22" width="48" height="64" rx="3" fill="#fff" stroke="#a78bfa" strokeWidth="1.6" />
        <path d="M21 33 h34 M21 40 h34 M21 47 h24" stroke="#ddd6fe" strokeWidth="2" strokeLinecap="round" />
        <path className="dlg-check" d="M24 64 L34 74 L54 52" fill="none" stroke="#16a34a" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
      </g>
      <path className="dlg-twinkle" transform="translate(68 18)" d={STAR} fill="#facc15" />
      <path className="dlg-twinkle dlg-twinkle-2" transform="translate(10 94) scale(0.8)" d={STAR} fill="#f472b6" />
      <path className="dlg-twinkle dlg-twinkle-3" transform="translate(72 96) scale(0.7)" d={STAR} fill="#22d3ee" />
    </svg>
  )
}

// Thùng rác (mở nắp khi hỏi xóa, đóng + lấp lánh khi đã xóa)
function Trash({ open }) {
  return (
    <svg viewBox="0 0 80 110" aria-hidden="true">
      {open && (
        <g className="dlg-warn">
          <path d="M62 4 L78 32 L46 32 Z" fill="#ef4444" stroke="#991b1b" strokeWidth="1.5" strokeLinejoin="round" />
          <path d="M62 13 V23" stroke="#fff" strokeWidth="3" strokeLinecap="round" />
          <circle cx="62" cy="28" r="1.8" fill="#fff" />
        </g>
      )}
      <g className={open ? 'dlg-lid is-open' : 'dlg-lid'}>
        <rect x="12" y="44" width="50" height="8" rx="3" fill="#94a3b8" stroke="#334155" strokeWidth="1.5" />
        <rect x="30" y="38" width="14" height="7" rx="2" fill="#94a3b8" stroke="#334155" strokeWidth="1.5" />
      </g>
      <path d="M16 56 L58 56 L54 106 L20 106 Z" fill="#64748b" stroke="#334155" strokeWidth="1.6" strokeLinejoin="round" />
      <path d="M27 64 L28.5 98 M37 64 V98 M47 64 L45.5 98" stroke="#cbd5e1" strokeWidth="2.4" strokeLinecap="round" />
      {!open && (
        <>
          <path className="dlg-twinkle" transform="translate(66 46)" d={STAR} fill="#facc15" />
          <path className="dlg-twinkle dlg-twinkle-2" transform="translate(8 34) scale(0.8)" d={STAR} fill="#a78bfa" />
          <path className="dlg-twinkle dlg-twinkle-3" transform="translate(70 84) scale(0.7)" d={STAR} fill="#22d3ee" />
        </>
      )}
    </svg>
  )
}

// scene → tư thế, biểu cảm gấu và đồ vật đi kèm
const SCENES = {
  logout: { pose: 'sit', face: 'sad', prop: <Door /> },
  submit: { pose: 'teach', face: 'normal', prop: <Inbox /> },
  submitted: { pose: 'cheer', face: 'happy', prop: <GradedPaper /> },
  delete: { pose: 'sit', face: 'serious', prop: <Trash open /> },
  deleted: { pose: 'cheer', face: 'happy', prop: <Trash open={false} /> },
}

// Không có scene: gấu theo pose truyền vào, kèm emoji (nếu có)
export default function DialogScene({ scene, pose = 'sit', emoji }) {
  const s = SCENES[scene]
  return (
    <>
      <div className={`dlg-scene ${s ? `is-${scene}` : ''}`} aria-hidden="true">
        <div className="dlg-scene-panda">
          <FrontPanda pose={s?.pose || pose} face={s?.face} />
        </div>
        {s && <div className="dlg-scene-prop">{s.prop}</div>}
      </div>
      {emoji && !s && <span className="dlg-emoji">{emoji}</span>}
    </>
  )
}
