// @ts-nocheck — nợ kiểu: xóa dòng này rồi chạy npm run typecheck để sửa
import { useState } from 'react'
import Icon from '../Icon.jsx'
import { PLACES, placeAccess } from '../../lib/telescope.js'
import '../../styles/telescope.css'

// Bảng chọn điểm đến của Kính thiên văn (mở từ nút "Địa điểm" trong SpaceExplorer).
// Trạng thái mỗi thẻ lấy từ placeAccess (lib/telescope.js) — không tự tính mở khóa ở đây.
// Bấm thẻ chưa vào được: thẻ rung nhẹ + SpaceExplorer hiện lời giải thích (notice).
export default function PlacePicker({ current, shop, notice, onChoose, onClose }) {
  const [shake, setShake] = useState('')
  const rows = PLACES.map((p) => [p, placeAccess(p, shop)])
  const opened = rows.filter(([, a]) => a.state === 'open').length
  const data = shop?.data

  return (
    <div className="tpick" role="dialog" aria-modal="true" aria-label="Chọn điểm đến">
      <div className="tpick-box">
        <div className="tpick-head">
          <div>
            <h2>Chọn điểm đến</h2>
            <p className="tpick-sub">Mỗi chặng mở khi tổng Sao ⭐ tích lũy đủ mốc. Mở chặng không trừ Sao.</p>
          </div>
          <button type="button" className="btn btn-ghost theme-toggle" onClick={onClose} aria-label="Đóng">
            <Icon name="close" />
          </button>
        </div>

        <div className="tpick-status">
          {shop?.loading && !data ? (
            <span className="tpick-stars is-wait">Đang tải số Sao…</span>
          ) : shop?.error && !data ? (
            <span className="tpick-stars is-error">
              Không tải được số Sao
              <button type="button" className="btn btn-small btn-ghost" onClick={shop.reload}>
                <Icon name="refresh" /> Thử lại
              </button>
            </span>
          ) : data?.isTutor ? (
            <span className="tpick-stars">Gia sư: xem trước các địa điểm đã hoàn thiện</span>
          ) : (
            <span className="tpick-stars">
              ⭐ <b>{Number.isFinite(data?.stars) ? data.stars : '—'}</b> Sao
            </span>
          )}
          <span className="tpick-count">
            Đã mở {opened}/{PLACES.length} điểm đến
          </span>
        </div>

        {notice && (
          <p className="tpick-notice" role="status">
            {notice}
          </p>
        )}

        <ol className="tpick-list">
          {rows.map(([p, a], i) => (
            <li key={p.id}>
              <button
                type="button"
                className={`tpick-card is-${a.state}${p.id === current ? ' is-current' : ''}${shake === p.id ? ' is-shake' : ''}`}
                aria-disabled={a.state !== 'open'}
                onClick={() => {
                  if (a.state !== 'open') setShake(p.id)
                  onChoose(p, a)
                }}
                onAnimationEnd={() => setShake('')}
              >
                <span className="tpick-step">{i + 1}</span>
                <span className="tpick-emblem">
                  <PlaceEmblem id={p.id} />
                  {a.state !== 'open' && (
                    <span className="tpick-lock">
                      <Icon name="lock" size={13} />
                    </span>
                  )}
                </span>
                <span className="tpick-text">
                  <strong>{p.name}</strong>
                  <span className="tpick-dist">{p.distance}</span>
                  <span className="tpick-teaser">{p.teaser}</span>
                  <Status place={p} access={a} current={p.id === current} stars={data?.stars} />
                </span>
              </button>
            </li>
          ))}
        </ol>
      </div>
    </div>
  )
}

function Status({ place, access, current, stars }) {
  switch (access.state) {
    case 'open':
      return <span className="tpick-state is-open">{current ? 'Đang ở đây' : access.preview ? 'Xem trước ›' : 'Khám phá ›'}</span>
    case 'locked': {
      const pct = Math.min(100, Math.max(0, ((Number(stars) || 0) / access.need) * 100))
      return (
        <span className="tpick-state is-locked">
          Cần {access.need} ⭐ · còn thiếu {access.missing}
          <span className="tpick-bar" style={{ '--p': `${pct}%` }} aria-hidden="true" />
        </span>
      )
    }
    case 'soon':
      return (
        <span className="tpick-state is-soon">
          Chưa mở khóa · nội dung đang được xây dựng
          {place.stars > 0 && <span className="tpick-plan">Mốc dự kiến: {place.stars} ⭐</span>}
        </span>
      )
    case 'loading':
      return <span className="tpick-state is-wait">Đang kiểm tra Sao…</span>
    default:
      return <span className="tpick-state is-locked">Chưa mở khóa · chưa đọc được số Sao</span>
  }
}

// Hình đại diện nhỏ của từng địa điểm (SVG tĩnh, không filter)
function PlaceEmblem({ id }) {
  return (
    <svg viewBox="0 0 64 64" aria-hidden="true">
      {EMBLEMS[id] || <circle cx="32" cy="32" r="8" fill="#e9d5ff" />}
    </svg>
  )
}

const EMBLEMS = {
  'he-mat-troi': (
    <>
      <ellipse cx="32" cy="34" rx="25" ry="10" fill="none" stroke="#c4b5fd" strokeOpacity=".5" />
      <circle cx="32" cy="34" r="11" fill="#fbbf24" />
      <circle cx="32" cy="34" r="15" fill="#fbbf24" opacity=".2" />
      <circle cx="54" cy="31" r="4" fill="#60a5fa" />
      <circle cx="12" cy="39" r="3" fill="#f87171" />
    </>
  ),
  'alpha-centauri': (
    <>
      <circle cx="22" cy="24" r="16" fill="#fde68a" opacity=".18" />
      <circle cx="20" cy="22" r="9" fill="#fff1b8" />
      <circle cx="31" cy="30" r="7" fill="#ffc27a" />
      <path d="M36 36 54 50" stroke="#c4b5fd" strokeDasharray="2 3" />
      <circle cx="54" cy="50" r="4" fill="#ff7a5c" />
    </>
  ),
  'trappist-1': (
    <>
      <circle cx="32" cy="32" r="17" fill="#ff6a3d" opacity=".2" />
      <circle cx="32" cy="32" r="9" fill="#ff6a3d" />
      {[0, 1, 2, 3, 4, 5, 6].map((i) => {
        const a = -2.6 + i * 0.75
        const r = 13 + i * 2.6
        return <circle key={i} cx={32 + r * Math.cos(a)} cy={32 + r * Math.sin(a) * 0.8} r="2.4" fill={['#f4a582', '#d9a37c', '#e6c79c', '#6fa8dc', '#7cc8bd', '#9fb6ec', '#bba8dc'][i]} />
      })}
    </>
  ),
  'kepler-90': (
    <>
      {[12, 17, 22, 27].map((r) => (
        <ellipse key={r} cx="32" cy="32" rx={r + 2} ry={(r + 2) * 0.55} fill="none" stroke="#99f6e4" strokeOpacity=".35" />
      ))}
      <circle cx="32" cy="32" r="7" fill="#fff4dc" />
      <circle cx="46" cy="29" r="2.4" fill="#c9a27e" />
      <circle cx="13" cy="36" r="3" fill="#7fb2d9" />
      <circle cx="56" cy="38" r="4.6" fill="#e8c49a" />
      <circle cx="20" cy="22" r="2.6" fill="#9aa8e0" />
    </>
  ),
  sirius: (
    <>
      <circle cx="30" cy="32" r="15" fill="#bfdbfe" opacity=".2" />
      <path d="M30 10v44M8 32h44" stroke="#dbeafe" strokeWidth="1.5" strokeOpacity=".7" />
      <circle cx="30" cy="32" r="8" fill="#eff6ff" />
      <circle cx="50" cy="20" r="2.6" fill="#fff" />
    </>
  ),
  'cygnus-x1': (
    <>
      <ellipse cx="32" cy="34" rx="22" ry="7" fill="none" stroke="#fb923c" strokeWidth="4" strokeOpacity=".8" />
      <circle cx="32" cy="34" r="8" fill="#0b0716" stroke="#fdba74" strokeWidth="1.5" />
      <circle cx="52" cy="16" r="5" fill="#bfdbfe" />
    </>
  ),
  'crab-pulsar': (
    <>
      <path d="M14 22c8-10 26-12 36-2s6 26-8 30-30-4-30-14 2-14 2-14Z" fill="#f472b6" opacity=".22" />
      <path d="M20 12 44 52" stroke="#e0f2fe" strokeWidth="2" strokeOpacity=".8" />
      <circle cx="32" cy="32" r="3.5" fill="#fff" />
    </>
  ),
  'orion-nebula': (
    <>
      <ellipse cx="28" cy="30" rx="20" ry="14" fill="#f472b6" opacity=".3" />
      <ellipse cx="38" cy="36" rx="16" ry="11" fill="#5eead4" opacity=".28" />
      <circle cx="30" cy="32" r="2" fill="#fff" />
      <circle cx="36" cy="30" r="1.6" fill="#fff" />
      <circle cx="33" cy="36" r="1.4" fill="#fff" />
    </>
  ),
  andromeda: (
    <>
      <ellipse cx="32" cy="32" rx="26" ry="9" fill="#c4b5fd" opacity=".2" transform="rotate(-25 32 32)" />
      <ellipse cx="32" cy="32" rx="16" ry="5" fill="#e9d5ff" opacity=".45" transform="rotate(-25 32 32)" />
      <circle cx="32" cy="32" r="4" fill="#fff7ed" />
    </>
  ),
}
