import { useEffect, useState } from 'react'
import Icon from '../Icon.jsx'
import { DEFAULT_LENGTH, EARTH_G, MOON_G, clockRate, clockSpeedText, pendulumPeriod } from '../../lib/pendulum.js'
import {
  FLAME_SALTS,
  ORRERY_PLANETS,
  SOLAR_LINES,
  SPECTRUM_FROM,
  SPECTRUM_TO,
  gravityDrop,
  keplerRatio,
  massEnergyJ,
  solarMatches,
  spectrumX,
  tntTons,
  viNumber,
  wavelengthColor,
  wavelengthNm,
} from '../../lib/labPhysics.js'

/** @typedef {ReturnType<typeof import('./labScene.js').createLabScene> | null} Lab */

const comma = (/** @type {number} */ n, digits = 2) => n.toFixed(digits).replace('.', ',')

/** Hàng nút chọn một trong nhiều.
 * @param {{ label: string, items: { id: any, text: string }[], value: any, onPick: (id: any) => void }} props */
function Choice({ label, items, value, onPick }) {
  return (
    <div className="sci-seg" role="group" aria-label={label}>
      {items.map((it) => (
        <button key={it.id} type="button" aria-pressed={it.id === value} onClick={() => onPick(it.id)}>{it.text}</button>
      ))}
    </div>
  )
}

/** @param {{ label: string, value: string }} props */
const Fact = ({ label, value }) => (
  <div className="sci-slider-row sci-period">
    <span>{label}</span>
    <strong>{value}</strong>
  </div>
)

/** Đồng hồ: đổi dây hoặc đổi nơi đặt, con lắc và kim trong cảnh đổi theo. @param {{ lab: Lab }} props */
function ClockPanel({ lab }) {
  const [length, setLength] = useState(DEFAULT_LENGTH)
  const [g, setG] = useState(EARTH_G)
  useEffect(() => lab?.setPendulum(length, g), [lab, length, g])
  return (
    <>
      <p>Mỗi nhịp lắc đẩy kim giây đi một nấc, nên T = 2π√(l/g) quyết định đồng hồ nhanh hay chậm. Thử kéo dài dây rồi nhìn quả lắc và kim giây trong tủ.</p>
      <div className="sci-modal-box">
        <label className="sci-slider-row" htmlFor="sci-pendulum-length">
          <span>Chiều dài dây (l)</span>
          <strong>{comma(length)} m</strong>
        </label>
        <input id="sci-pendulum-length" type="range" min="0.25" max="1.5" step="0.01" value={length} onChange={(e) => setLength(parseFloat(e.target.value))} className="sci-range-input" />
        <Choice
          label="Nơi đặt đồng hồ"
          value={g}
          onPick={setG}
          items={[{ id: EARTH_G, text: 'Trái Đất (g = 9,8)' }, { id: MOON_G, text: 'Mặt Trăng (g = 1,62)' }]}
        />
        <Fact label="Chu kì T" value={`${comma(pendulumPeriod(length, g))} giây`} />
        <p className="sci-speed">{clockSpeedText(clockRate(length, g))}</p>
      </div>
    </>
  )
}

const BOOKS = [
  {
    title: 'Principia (Newton, 1687)',
    ask: 'Vì sao Mặt Trăng không rơi xuống?',
    text: 'Lực làm quả táo rơi cũng là lực giữ Mặt Trăng. Mặt Trăng thực ra vẫn đang rơi, nhưng nó bay ngang đủ nhanh nên không bao giờ chạm đất: như viên đạn bắn thật mạnh trong hình bên.',
  },
  {
    title: 'Sidereus Nuncius (Galileo, 1610)',
    ask: 'Có phải mọi thứ đều quay quanh Trái Đất?',
    text: 'Tháng 1 năm 1610, Galileo thấy 4 chấm sáng đổi chỗ mỗi đêm quanh Sao Mộc. Chúng là vệ tinh của Sao Mộc, nên không phải vật nào cũng quay quanh Trái Đất. Ông cũng thấy Mặt Trăng có núi và miệng hố.',
  },
  {
    title: 'Bản đồ sao',
    ask: 'Làm sao tìm được một ngôi sao?',
    text: 'Sao có toạ độ xích kinh, xích vĩ, giống kinh độ và vĩ độ trên Trái Đất. Kéo dài đường nối hai sao cuối gàu Bắc Đẩu sẽ gặp Sao Bắc Cực, gần như đứng yên trên bầu trời đêm.',
  },
]

/** Giá sách: chọn cuốn nào, cuốn đó tự rút ra và mở trước mắt. @param {{ lab: Lab }} props */
function ShelfPanel({ lab }) {
  const [i, setI] = useState(0)
  useEffect(() => lab?.parts.shelf.pickBook(i), [lab, i])
  const b = BOOKS[i]
  return (
    <>
      <Choice label="Chọn sách" value={i} onPick={setI} items={[{ id: 0, text: 'Newton' }, { id: 1, text: 'Galileo' }, { id: 2, text: 'Bản đồ sao' }]} />
      <div className="sci-modal-box">
        <strong>{b.ask}</strong>
        <span>{b.text}</span>
      </div>
    </>
  )
}

const BOARD_MODES = [
  { id: 'gravity', text: 'Hấp dẫn', min: 1.5, max: 4, step: 0.5, start: 2 },
  { id: 'wave', text: 'Bước sóng', min: 400, max: 780, step: 10, start: 500 },
  { id: 'energy', text: 'E = mc²', min: 1, max: 10, step: 1, start: 1 },
]

/** Bảng đen: kéo số, hình trên bảng vẽ lại ngay. @param {{ lab: Lab }} props */
function BoardPanel({ lab }) {
  const [mode, setMode] = useState('gravity')
  const conf = BOARD_MODES.find((m) => m.id === mode) ?? BOARD_MODES[0]
  const [values, setValues] = useState(() => Object.fromEntries(BOARD_MODES.map((m) => [m.id, m.start])))
  const value = values[mode]
  useEffect(() => lab?.parts.board.draw(mode, value), [lab, mode, value])
  const nm = wavelengthNm(value)
  const joules = massEnergyJ(value)
  return (
    <>
      <Choice label="Chọn công thức" value={mode} onPick={setMode} items={BOARD_MODES} />
      <div className="sci-modal-box">
        <label className="sci-slider-row" htmlFor="sci-board-value">
          <span>{mode === 'gravity' ? 'Khoảng cách r gấp' : mode === 'wave' ? 'Tần số f' : 'Khối lượng m'}</span>
          <strong>{mode === 'gravity' ? `${String(value).replace('.', ',')} lần` : mode === 'wave' ? `${value} THz` : `${value} g`}</strong>
        </label>
        <input id="sci-board-value" type="range" min={conf.min} max={conf.max} step={conf.step} value={value} onChange={(e) => setValues((v) => ({ ...v, [mode]: parseFloat(e.target.value) }))} className="sci-range-input" />
        {mode === 'gravity' && (
          <>
            <Fact label="Lực hút giảm" value={`${comma(gravityDrop(value))} lần`} />
            <span>Xa gấp đôi thì lực chỉ còn một phần tư. Mặt Trăng ở xa gấp khoảng 60 lần bán kính Trái Đất nên chịu lực yếu hơn quả táo khoảng 3.600 lần.</span>
          </>
        )}
        {mode === 'wave' && (
          <>
            <div className="sci-slider-row sci-period">
              <span>Bước sóng λ</span>
              <strong><i className="sci-swatch" style={{ background: wavelengthColor(nm) }} /> {Math.round(nm)} nm</strong>
            </div>
            <span>Tần số càng cao, bước sóng càng ngắn: ánh sáng tím ngắn hơn ánh sáng đỏ gần một nửa.</span>
          </>
        )}
        {mode === 'energy' && (
          <>
            <Fact label="Năng lượng E" value={`≈ ${comma(joules / 1e13, 1)} × 10¹³ J`} />
            <Fact label="Tương đương" value={`${viNumber(tntTons(joules))} tấn TNT`} />
            <span>Nhờ vậy Mặt Trời tỏa sáng được: mỗi giây nó biến khoảng 4 triệu tấn khối lượng thành năng lượng.</span>
          </>
        )}
      </div>
    </>
  )
}

/** Tủ mẫu vật: mô hình Hệ Mặt Trời hoặc ngăn kéo. @param {{ lab: Lab }} props */
function CabinetPanel({ lab }) {
  const [tab, setTab] = useState('orrery')
  const [planet, setPlanet] = useState(1)
  useEffect(() => {
    lab?.parts.cabinet.setDrawer(tab === 'drawer')
    lab?.parts.cabinet.pickPlanet(tab === 'orrery' ? planet : -1)
  }, [lab, tab, planet])
  const p = ORRERY_PLANETS[planet]
  return (
    <>
      <Choice label="Chọn phần xem" value={tab} onPick={setTab} items={[{ id: 'orrery', text: 'Mô hình bằng đồng' }, { id: 'drawer', text: 'Mở ngăn kéo' }]} />
      {tab === 'orrery' ? (
        <div className="sci-modal-box">
          <Choice label="Chọn hành tinh" value={planet} onPick={setPlanet} items={ORRERY_PLANETS.map((x, i) => ({ id: i, text: x.name }))} />
          <Fact label="Khoảng cách a" value={`${comma(p.a, 3)} AU`} />
          <Fact label="Chu kì T" value={`${comma(p.T, 3)} năm`} />
          <Fact label="T² / a³" value={comma(keplerRatio(p.a, p.T))} />
          <span>Bánh răng quay đúng tỉ lệ thật: hành tinh càng xa càng chậm, mà T²/a³ của cả ba đều gần bằng 1. Đó là định luật III Kepler.</span>
        </div>
      ) : (
        <div className="sci-modal-box">
          <strong>Trong ngăn kéo có gì?</strong>
          <span>Thiên thạch sắt-niken là mảnh của thiên thể khác rơi xuống Trái Đất. Lăng kính tách ánh sáng trắng thành dải 7 màu. Hai thị kính 25 mm và 10 mm đổi độ phóng đại của kính thiên văn: tiêu cự càng ngắn, ảnh càng lớn.</span>
        </div>
      )}
    </>
  )
}

/** Dải phổ vẽ bằng SVG: vạch sáng của ngọn lửa đặt trên vạch tối của Mặt Trời để so.
 * @param {{ lines: number[] }} props */
function SpectrumStrip({ lines }) {
  const W = 300
  const stops = []
  for (let nm = SPECTRUM_FROM; nm <= SPECTRUM_TO; nm += 25) stops.push(nm)
  return (
    <svg className="sci-spectrum" viewBox={`0 0 ${W} 72`} role="img" aria-label={`Vạch phổ của muối: ${lines.join(', ')} nanomet, so với vạch tối của Mặt Trời`}>
      <defs>
        <linearGradient id="sci-rainbow">
          {stops.map((nm) => <stop key={nm} offset={spectrumX(nm)} stopColor={wavelengthColor(nm)} />)}
        </linearGradient>
      </defs>
      <rect x="0" y="0" width={W} height="22" fill="#07070b" />
      {lines.map((nm) => <rect key={nm} x={spectrumX(nm) * W - 0.8} y="0" width="1.6" height="22" fill={wavelengthColor(nm)} />)}
      <rect x="0" y="26" width={W} height="22" fill="url(#sci-rainbow)" />
      {SOLAR_LINES.map((nm) => <rect key={nm} x={spectrumX(nm) * W - 0.6} y="26" width="1.2" height="22" fill="#000" />)}
      {[400, 500, 600, 700].map((nm) => <text key={nm} x={spectrumX(nm) * W} y="64" textAnchor="middle" fontSize="11" fill="currentColor">{nm} nm</text>)}
    </svg>
  )
}

/** Thử màu ngọn lửa: rắc muối, xem màu lửa và vạch phổ, đối chiếu với Mặt Trời. @param {{ lab: Lab }} props */
function FlamePanel({ lab }) {
  const [id, setId] = useState('na')
  useEffect(() => lab?.parts.bench.setSalt(id), [lab, id])
  const s = FLAME_SALTS.find((x) => x.id === id) ?? FLAME_SALTS[0]
  const hits = solarMatches(s.lines)
  return (
    <>
      <p>Không ai đến được các ngôi sao, vậy làm sao biết chúng làm từ gì? Rắc từng loại muối vào đèn cồn: mỗi nguyên tố cho màu lửa và các vạch phổ riêng, như một dấu vân tay.</p>
      <Choice label="Chọn muối" value={id} onPick={setId} items={FLAME_SALTS.map((x) => ({ id: x.id, text: `${x.name} (${x.salt})` }))} />
      <div className="sci-modal-box">
        <SpectrumStrip lines={s.lines} />
        <Fact label="Màu lửa" value={s.flameName} />
        <Fact label="Vạch phổ" value={s.lines.map((nm) => comma(nm, 1)).join('; ') + ' nm'} />
        <span>
          {hits.length
            ? 'Dải dưới là ánh sáng Mặt Trời: các vạch tối ở đúng chỗ vạch vàng của natri. Natri trong khí quyển Mặt Trời hấp thụ đúng màu đó, nên ta biết Mặt Trời có natri.'
            : `Dải dưới là ánh sáng Mặt Trời với các vạch tối của những nguyên tố khác. Hễ thấy đúng bộ vạch của ${s.name.toLowerCase()} trong ánh sáng một ngôi sao, ta biết sao đó có ${s.name.toLowerCase()}.`}
        </span>
      </div>
    </>
  )
}

const QUESTS = [
  ['shelf', 'Đọc một cuốn sách trên giá'],
  ['board', 'Thử một công thức trên bảng đen'],
  ['clock', 'Đổi chiều dài con lắc đồng hồ'],
  ['cabinet', 'Xem mô hình Hệ Mặt Trời'],
  ['desk', 'Thử màu ngọn lửa'],
  ['scope', 'Nhìn qua kính thiên văn'],
]

/** Sổ tay: ghi lại những gì đã khám phá trong lần vào phòng này. @param {{ visited: Set<string> }} props */
function JournalPanel({ visited }) {
  const done = QUESTS.filter(([id]) => visited.has(id)).length
  return (
    <>
      <p>“Mỗi đêm nhìn qua vòm kính gác mái này, mình lại thấy những định luật Vật lý trên trang giấy hiện lên giữa các vì sao!”</p>
      <div className="sci-modal-box">
        <strong>Việc đêm nay: {done}/{QUESTS.length}</strong>
        <ul className="sci-quests">
          {QUESTS.map(([id, text]) => (
            <li key={id} className={visited.has(id) ? 'is-done' : ''}>{text}</li>
          ))}
        </ul>
      </div>
    </>
  )
}

const CARDS = {
  shelf: { title: 'Giá sách của Giáo sư', close: 'Cất sách' },
  board: { title: 'Bảng đen công thức', close: 'Đã hiểu' },
  cabinet: { title: 'Tủ mẫu vật', close: 'Đóng tủ', scope: 'Nhìn Hệ Mặt Trời thật qua kính' },
  clock: { title: 'Con lắc điều khiển đồng hồ', close: 'Xong thí nghiệm' },
  desk: { title: 'Thử màu ngọn lửa', close: 'Lùi lại' },
  journal: { title: 'Sổ tay của Giáo sư Gấu Trúc', close: 'Gấp sổ lại', scope: 'Nhìn qua kính thiên văn' },
}

/** Mảnh giấy hiện cạnh món đồ sau khi camera bay đến.
 * @param {{ id: string, lab: Lab, visited: Set<string>, onClose: () => void, onScope: () => void }} props */
export default function LabModal({ id, lab, visited, onClose, onScope }) {
  const card = CARDS[/** @type {keyof typeof CARDS} */ (id)]
  return (
    <div className="sci-note-wrap" role="dialog" aria-modal="true" aria-label={card.title}>
      <div className="sci-note">
        <button type="button" className="sci-note-x" onClick={onClose} aria-label="Đóng">
          <Icon name="close" />
        </button>
        <h3>{card.title}</h3>
        {id === 'clock' && <ClockPanel lab={lab} />}
        {id === 'shelf' && <ShelfPanel lab={lab} />}
        {id === 'board' && <BoardPanel lab={lab} />}
        {id === 'cabinet' && <CabinetPanel lab={lab} />}
        {id === 'desk' && <FlamePanel lab={lab} />}
        {id === 'journal' && <JournalPanel visited={visited} />}
        <div className="sci-note-actions">
          {'scope' in card && (
            <button type="button" className="sci-btn sci-btn-line" onClick={onScope}>
              {card.scope}
            </button>
          )}
          <button type="button" className="sci-btn" onClick={onClose} autoFocus>
            {card.close}
          </button>
        </div>
      </div>
    </div>
  )
}
