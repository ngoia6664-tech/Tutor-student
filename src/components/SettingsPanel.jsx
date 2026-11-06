import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import Icon from './Icon.jsx'
import { PRESETS, performanceMode, prefersReducedMotion, resetSettings, updateSettings, useSettings } from '../lib/settings.js'
import { useTheme } from '../lib/theme.js'
import { useFocusTrap } from '../lib/useFocusTrap.js'

// Bảng Cài đặt (tải lười từ Layout, mở bằng nút bánh răng): hiệu năng, không gian lớp học, hình ảnh, âm thanh. Lưu trên máy này (lib/settings.js).
// Mở dạng bảng nổi, không chuyển trang → đang làm bài mở ra cũng không mất bài.
const MODES = [
  { id: 'full', label: 'Đầy đủ', desc: 'Mọi hiệu ứng' },
  { id: 'lite', label: 'Tối ưu', desc: 'Nhẹ máy, ít chuyển động' },
]

const DAY_WEATHER_OPTIONS = [
  { id: 'morning', label: '🌤️ Nắng sớm', desc: 'Sáng trong trẻo' },
  { id: 'sunset', label: '🌇 Nắng chiều', desc: 'Ấm áp hoài niệm' },
  { id: 'rainy', label: '🌧️ Mưa hiên', desc: 'Dịu mắt tập trung' },
  { id: 'auto', label: '🕒 Theo giờ', desc: 'Tự đổi sáng/chiều' },
]

const NIGHT_WEATHER_OPTIONS = [
  { id: 'morning', label: '🌙 Trăng trong', desc: 'Sáng thanh vắng' },
  { id: 'sunset', label: '✨ Trăng sao', desc: 'Bầu trời đầy sao' },
  { id: 'rainy', label: '🌧️ Mưa đêm', desc: 'Rì rào ngoài gác mái' },
  { id: 'auto', label: '🕒 Theo giờ', desc: 'Đồng bộ giờ thực' },
]

export default function SettingsPanel({ onClose }) {
  const s = useSettings()
  const theme = useTheme()
  const isLight = theme === 'light'
  const weatherOptions = isLight ? DAY_WEATHER_OPTIONS : NIGHT_WEATHER_OPTIONS
  const mode = performanceMode(s)
  const reduced = prefersReducedMotion()
  const panel = useFocusTrap(onClose)

  return createPortal(
    <div className="settings-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="settings-panel" role="dialog" aria-modal="true" aria-labelledby="settings-title" tabIndex={-1} ref={panel}>
        <div className="settings-head">
          <h2 id="settings-title">
            <Icon name="settings" size={20} /> Cài đặt
          </h2>
          <button type="button" className="btn btn-ghost theme-toggle" onClick={onClose} aria-label="Đóng" title="Đóng">
            <Icon name="close" />
          </button>
        </div>

        <section className="settings-section">
          <h3>Hiệu năng</h3>
          <div className="settings-modes" role="radiogroup" aria-label="Chế độ hiệu năng">
            {MODES.map((m) => (
              <button
                key={m.id}
                type="button"
                role="radio"
                aria-checked={mode === m.id}
                className={`settings-mode ${mode === m.id ? 'is-on' : ''}`}
                onClick={() => updateSettings(PRESETS[m.id])}
              >
                <strong>{m.label}</strong>
                <span>{m.desc}</span>
              </button>
            ))}
          </div>
          {mode === 'custom' && <p className="settings-note">Đang tùy chỉnh riêng từng mục bên dưới.</p>}
        </section>

        <section className="settings-section">
          <h3>{isLight ? 'Không gian lớp học ban ngày (Nắng ấm)' : 'Không gian lớp học ban đêm (Gác mái trăng rọi)'}</h3>
          <div className="settings-weathers" role="radiogroup" aria-label={isLight ? 'Không khí ngoài hiên lớp học' : 'Bầu trời đêm ngoài khung cửa gác mái'}>
            {weatherOptions.map((w) => (
              <button
                key={w.id}
                type="button"
                role="radio"
                aria-checked={s.classroomWeather === w.id}
                className={`settings-mode settings-weather-chip ${s.classroomWeather === w.id ? 'is-on' : ''}`}
                onClick={() => updateSettings({ classroomWeather: w.id })}
              >
                <strong>{w.label}</strong>
                <span>{w.desc}</span>
              </button>
            ))}
          </div>

          <label className="settings-range">
            <span className="settings-range-label">
              {isLight ? '☀ Độ nắng chiếu qua cửa sổ' : '🌙 Độ sáng trăng rọi qua cửa sổ'} <b>{s.sunIntensity}%</b>
            </span>
            <input
              type="range"
              min="20"
              max="140"
              step="5"
              value={s.sunIntensity}
              onChange={(e) => updateSettings({ sunIntensity: Number(e.target.value) })}
            />
          </label>

          <Toggle
            label="💡 Đèn chao thả trần"
            desc={isLight ? 'Bật quầng sáng vàng ấm trên trần (hoặc bấm trực tiếp vào đèn)' : 'Bật quầng sáng vàng tam giác rọi bàn học (hoặc bấm trực tiếp vào đèn)'}
            on={s.ceilingLamp}
            set={(v) => updateSettings({ ceilingLamp: v })}
          />
        </section>

        <section className="settings-section">
          <h3>Hình ảnh</h3>
          {reduced && <p className="settings-note">Thiết bị đang bật “Giảm chuyển động”: chuyển động không cần thiết đã tự giảm.</p>}
          <Toggle
            label="Background động"
            desc={isLight ? 'Nắng đung đưa, bụi phấn bay, đồng hồ & lá rơi' : 'Trăng rọi, chùm sáng đèn học tam giác, bụi sáng đêm & đồng hồ'}
            on={s.animatedBackground}
            set={(v) => updateSettings({ animatedBackground: v })}
          />
          <label className="settings-range">
            <span className="settings-range-label">
              {isLight ? '📄 Độ đặc trang giấy giáo án' : '📄 Độ đặc thẻ bàn học'} <b>{s.cardOpacity}%</b>
            </span>
            <input
              type="range"
              min="72"
              max="100"
              step="2"
              value={s.cardOpacity}
              onChange={(e) => updateSettings({ cardOpacity: Number(e.target.value) })}
            />
          </label>
          <Toggle label="Linh vật Panda" desc="Giáo sư Gấu Trúc ở góc màn hình" on={s.mascot} set={(v) => updateSettings({ mascot: v })} />
          <Toggle label="Animation của Panda" desc="Đi dạo, leo tre, đọc sách" on={s.mascotAnimation} disabled={!s.mascot} set={(v) => updateSettings({ mascotAnimation: v })} />
          <Toggle label="Hiệu ứng ăn mừng" desc="Pháo giấy khi nộp bài, ôn đúng" on={s.celebration} set={(v) => updateSettings({ celebration: v })} />
          <Toggle label="Hiệu ứng du hành" desc="Gấu lên tàu vũ trụ khi đổi địa điểm Kính thiên văn" on={s.travelAnimation} set={(v) => updateSettings({ travelAnimation: v })} />
        </section>

        <section className="settings-section">
          <h3>Âm thanh</h3>
          <Toggle label="Hiệu ứng âm thanh" desc="Tiếng gấu, kính viễn vọng, hành tinh" on={s.soundEffects} set={(v) => updateSettings({ soundEffects: v })} />
          <Toggle label="Nhạc nền" desc="Phát khi ngắm vũ trụ" on={s.music} set={(v) => updateSettings({ music: v })} />
          <label className={`settings-range ${s.music ? '' : 'is-disabled'}`}>
            <span className="settings-range-label">
              Âm lượng nhạc nền <b>{s.musicVolume}%</b>
            </span>
            <input
              type="range"
              min="0"
              max="100"
              step="5"
              value={s.musicVolume}
              disabled={!s.music}
              onChange={(e) => updateSettings({ musicVolume: Number(e.target.value) })}
              style={/** @type {import('react').CSSProperties} */ ({ '--vol': `${s.musicVolume}%` })}
            />
          </label>
        </section>

        <ResetButton />
      </div>
    </div>,
    document.body
  )
}

// Cả hàng là một công tắc: dễ bấm trên điện thoại
function Toggle({ label, desc, on, set, disabled = false }) {
  return (
    <button type="button" role="switch" aria-checked={on} className="settings-row" disabled={disabled} onClick={() => set(!on)}>
      <span className="settings-row-text">
        <span className="settings-row-label">{label}</span>
        {desc && <span className="settings-row-desc">{desc}</span>}
      </span>
      <span className={`settings-switch ${on ? 'is-on' : ''}`} aria-hidden="true" />
    </button>
  )
}

// Bấm lần đầu đổi thành "Bấm lần nữa để xác nhận" (3 giây), tránh bấm nhầm
function ResetButton() {
  const [confirm, setConfirm] = useState(false)
  useEffect(() => {
    if (!confirm) return
    const id = setTimeout(() => setConfirm(false), 3000)
    return () => clearTimeout(id)
  }, [confirm])
  return (
    <div className="settings-foot">
      <button
        type="button"
        className={`btn btn-small ${confirm ? 'btn-danger' : 'btn-ghost'}`}
        onClick={() => {
          if (!confirm) return setConfirm(true)
          resetSettings()
          setConfirm(false)
        }}
      >
        <Icon name="undo" /> {confirm ? 'Bấm lần nữa để khôi phục' : 'Khôi phục mặc định'}
      </button>
    </div>
  )
}
