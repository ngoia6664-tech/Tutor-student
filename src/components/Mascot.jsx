import { useEffect, useRef, useState } from 'react'
import { useAuth } from '../contexts/AuthContext.jsx'
import { supabase } from '../lib/supabase.js'
import { countOpenReports } from '../lib/reports.js'
import { MASCOT_EVENT } from '../lib/celebrate.js'
import { LOCK_MESSAGE, useStudying } from '../lib/studyLock.js'
import { prefersReducedMotion, useSettings } from '../lib/settings.js'
import { mascotSound } from '../lib/spaceSound.js'
import FormulaText, { plainText } from './FormulaText.jsx'
import { BackPanda, BallPanda, Bamboo, FrontPanda, SleepingPanda } from './PandaArt.jsx'

// Giáo sư Gấu Trúc: linh vật góc dưới phải.
// mood: idle ngồi · climb leo tre (quay lưng, ôm cây) · walk đi bộ ục ịch · roll lăn tròn → dizzy chóng mặt
//       · teach giảng bài (bảng đen mini) · talk nói · cheer ăn mừng · sleep cuộn tròn ngủ
//       · wait ngồi đọc sách đợi (khi học sinh đang làm bài: không đi dạo / leo / lăn / ngủ).
// - Bấm vào: giảng một mẹo trên bảng đen; lần đầu ưu tiên nhắc bài (học sinh: quá hạn / sắp hết hạn; gia sư: câu bị báo lỗi).
// - Nghe sự kiện 'mascot' (lib/celebrate.js) để nói / nhảy lên ăn mừng.
// - Rảnh thì cứ ~10 giây làm một trò (leo tre hay gặp nhất); 30 giây không thao tác thì ngủ.
// - Tự ẩn khi đang làm đề có tính giờ (styles/mascot.css). "Cất gấu" thu gấu lại thành nút nhỏ, nhớ trên máy này.
const HIDE_KEY = 'mascot-hidden'
const SLEEP_AFTER = 30_000
const ACTIVITY_EVERY = 10_000
// Trò khi rảnh: tỉ lệ chọn + thời lượng (khớp animation trong mascot.css)
const ACTIVITIES = [
  { mood: 'climb', weight: 5, ms: 9_000 },
  { mood: 'walk', weight: 3, ms: 10_000 },
  { mood: 'roll', weight: 2, ms: 6_500, then: { mood: 'dizzy', ms: 2_200 } }, // lăn xong thì chóng mặt
]

const TIPS = [
  'Vận tốc trung bình `v = s / t`. Đổi km/h sang m/s thì chia 3,6 nhé!',
  'Vẽ hình và chọn chiều dương trước khi viết phương trình.',
  'Định luật II Newton: `F = m·a`. Lực tổng hợp mới là F, đừng quên lực ma sát!',
  'Kiểm tra lại đơn vị của đáp số, sai đơn vị là mất điểm oan đó.',
  '`g ≈ 9,8 m/s²`, nhưng đề cho 10 thì dùng 10 nha.',
  'Gặp bài khó? Viết ra đại lượng đã cho và đại lượng cần tìm trước.',
  '`Cơ năng = động năng + thế năng`. Không có ma sát thì cơ năng bảo toàn.',
  'Định luật Ôm: `I = U / R`. Nối tiếp thì cùng I, song song thì cùng U.',
  'Đọc kỹ đề: "đúng" hay "không đúng"? Một chữ đổi cả đáp án!',
  'Ôn câu sai là cách tiến bộ nhanh nhất đó!',
  'Học một chút mỗi ngày tốt hơn học dồn một lần.',
]

const pick = (list) => list[Math.floor(Math.random() * list.length)]

function pickActivity() {
  let r = Math.random() * ACTIVITIES.reduce((n, a) => n + a.weight, 0)
  return ACTIVITIES.find((a) => (r -= a.weight) < 0) || ACTIVITIES[0]
}

function readHidden() {
  try {
    return localStorage.getItem(HIDE_KEY) === '1'
  } catch {
    return false
  }
}

function writeHidden(v) {
  try {
    localStorage.setItem(HIDE_KEY, v ? '1' : '0')
  } catch {
    // không lưu được thì chỉ ẩn trong lần mở này
  }
}

// Lời nhắc quan trọng nhất lúc này, hoặc null
async function reminder(profile) {
  if (profile.role === 'tutor') {
    const n = await countOpenReports()
    return n > 0 ? `Có ${n} câu bị học sinh báo lỗi đang chờ thầy/cô xem.` : null
  }
  const { data } = await supabase
    .from('assignment_recipients')
    .select('assignment:assignments(due_date)')
    .eq('student_id', profile.id)
    .eq('status', 'todo')
  const today = new Date().toISOString().slice(0, 10)
  const soon = new Date(Date.now() + 2 * 86_400_000).toISOString().slice(0, 10)
  const due = (data || []).map((r) => r.assignment?.due_date).filter(Boolean)
  const overdue = due.filter((d) => d < today).length
  const dueSoon = due.filter((d) => d >= today && d <= soon).length
  if (overdue) return `Bạn còn ${overdue} bài quá hạn, làm ngay nhé!`
  if (dueSoon) return `Có ${dueSoon} bài sắp hết hạn trong 2 ngày tới đó!`
  if (data?.length) return `Bạn còn ${data.length} bài chưa làm. Cố lên!`
  return null
}

// Tắt "Linh vật Panda" (Cài đặt): không vẽ gì và không chạy gì (timer, lắng nghe sự kiện gỡ hết theo component).
// Khác "Cất gấu" vẫn để nút nhỏ gọi lại.
export default function Mascot() {
  return useSettings().mascot ? <MascotBody /> : null
}

function MascotBody() {
  const { profile } = useAuth()
  const [hidden, setHidden] = useState(readHidden)
  const [mood, setMoodState] = useState('idle')
  const [bubble, setBubble] = useState(null) // { kind: 'board' | 'speech', text, id }
  const moodRef = useRef('idle')
  const sleepy = useRef(false)
  const timers = useRef({})
  const reminded = useRef(false)
  const studying = useStudying()
  const studyingRef = useRef(studying)
  studyingRef.current = studying
  const settings = useSettings()
  const reduceMotion = prefersReducedMotion()
  // Tắt "Animation của Panda" (Cài đặt): không đi dạo / leo / lăn, chuyển động nhẹ tắt bằng CSS (styles/settings.css)
  const stillMascot = reduceMotion || !settings.mascotAnimation

  function setMood(m) {
    moodRef.current = m
    setMoodState(m)
  }

  // Hết việc: buồn ngủ rồi thì ngủ, không thì ngồi chờ
  function rest() {
    setMood(sleepy.current ? 'sleep' : 'idle')
  }

  // Tiếng hiệu ứng của gấu: im khi đang làm bài, tab ẩn hoặc đang ngắm vũ trụ (gấu bị che, explorer có tiếng riêng)
  function sound(kind) {
    if (studyingRef.current || document.hidden || document.documentElement.classList.contains('space-exploring')) return
    mascotSound(kind)
  }

  function say(text, m = 'talk') {
    clearTimeout(timers.current.bubble)
    clearTimeout(timers.current.activity)
    const kind = m === 'teach' ? 'board' : 'speech'
    sound(m === 'cheer' || m === 'teach' ? m : 'talk')
    setBubble({ kind, text, id: Date.now() })
    setMood(m)
    timers.current.bubble = setTimeout(() => {
      setBubble(null)
      rest()
    }, kind === 'board' ? 9000 : m === 'cheer' ? 4500 : 6500)
  }

  // Lời từ trang khác (nộp bài, ôn đúng...)
  useEffect(() => {
    const on = (e) => say(e.detail.text, e.detail.mood)
    window.addEventListener(MASCOT_EVENT, on)
    return () => window.removeEventListener(MASCOT_EVENT, on)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // 30 giây không thao tác thì buồn ngủ; thao tác lại thì tỉnh
  useEffect(() => {
    let last = 0
    const wake = () => {
      // Cuộn bắn sự kiện liên tục: đặt lại hẹn giờ tối đa 1 lần/giây (trừ khi gấu đang ngủ thì tỉnh ngay)
      const now = Date.now()
      if (now - last < 1000 && moodRef.current !== 'sleep') return
      last = now
      clearTimeout(timers.current.sleep)
      sleepy.current = false
      if (moodRef.current === 'sleep') setMood('idle')
      timers.current.sleep = setTimeout(() => {
        if (studyingRef.current) return // đang làm bài: gấu ngồi đợi, không ngủ
        sleepy.current = true
        if (moodRef.current === 'idle') setMood('sleep')
      }, SLEEP_AFTER)
    }
    const events = ['pointerdown', 'keydown', 'scroll']
    events.forEach((ev) => window.addEventListener(ev, wake, { passive: true }))
    wake()
    const t = timers.current
    return () => {
      events.forEach((ev) => window.removeEventListener(ev, wake))
      Object.values(t).forEach(clearTimeout)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Rảnh thì cứ ~10 giây làm một trò. Không chạy khi animation tắt / gấu đã cất;
  // bỏ lượt khi tab ẩn hoặc đang ngắm vũ trụ (app bị che, không ai nhìn)
  useEffect(() => {
    if (stillMascot || hidden) return
    const id = setInterval(() => {
      if (moodRef.current !== 'idle' || studyingRef.current) return
      if (document.hidden || document.documentElement.classList.contains('space-exploring')) return
      const a = pickActivity()
      setMood(a.mood)
      timers.current.activity = setTimeout(() => {
        if (moodRef.current !== a.mood) return
        if (!a.then) return rest()
        setMood(a.then.mood)
        timers.current.activity = setTimeout(() => moodRef.current === a.then.mood && rest(), a.then.ms)
      }, a.ms)
    }, ACTIVITY_EVERY)
    return () => clearInterval(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stillMascot, hidden])

  // Vừa tắt animation khi gấu đang dở trò: về ngồi yên
  useEffect(() => {
    if (stillMascot && ['walk', 'climb', 'roll', 'dizzy'].includes(moodRef.current)) {
      clearTimeout(timers.current.activity)
      rest()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stillMascot])

  async function onPoke() {
    if (studying) return say(LOCK_MESSAGE)
    if (mood === 'sleep') {
      sleepy.current = false
      return say('Ơ... thầy chỉ chợp mắt chút thôi. Học tiếp nào!')
    }
    // Lần bấm đầu: ưu tiên lời nhắc; sau đó giảng mẹo trên bảng
    if (!reminded.current) {
      reminded.current = true
      try {
        const r = await reminder(profile)
        if (r) return say(r)
      } catch {
        // lỗi mạng: giảng mẹo thay vì báo lỗi
      }
    }
    say(pick(TIPS), 'teach')
  }

  function hide() {
    sound('hide')
    writeHidden(true)
    setHidden(true)
    setBubble(null)
  }

  function show() {
    writeHidden(false)
    setHidden(false)
    say(`Chào ${profile.full_name?.split(' ').at(-1) || 'bạn'}! Bấm vào thầy để nghe giảng nhé.`)
  }

  function closeBubble() {
    clearTimeout(timers.current.bubble)
    setBubble(null)
    rest()
  }

  if (hidden) {
    return (
      <button type="button" className="mascot-restore" onClick={show} aria-label="Gọi Giáo sư Gấu Trúc" title="Gọi Giáo sư Gấu Trúc">
        <FrontPanda />
      </button>
    )
  }

  // Đang làm bài: mọi trạng thái rảnh (kể cả đang dở trò) hiện thành ngồi đọc sách đợi
  const shown = studying && ['idle', 'sleep', 'walk', 'climb', 'roll', 'dizzy'].includes(mood) ? 'wait' : mood

  let art
  if (shown === 'climb') art = <BackPanda />
  else if (shown === 'roll') art = <BallPanda />
  else if (shown === 'sleep') art = <SleepingPanda />
  else art = <FrontPanda pose={['teach', 'cheer', 'dizzy', 'wait'].includes(shown) ? shown : 'sit'} />

  return (
    <div className={`mascot is-${shown}`}>
      {bubble?.kind === 'board' && (
        <div key={bubble.id} className="mascot-board" role="status">
          <div className="mascot-board-title">Gấu Trúc giảng bài</div>
          <p className="mascot-board-text">
            <Typed text={bubble.text} instant={stillMascot} />
          </p>
          <BubbleActions onClose={closeBubble} onHide={hide} />
        </div>
      )}
      {bubble?.kind === 'speech' && (
        <div key={bubble.id} className="mascot-speech" role="status">
          <Typed text={bubble.text} instant={stillMascot} />
          <BubbleActions onClose={closeBubble} onHide={hide} />
        </div>
      )}
      <div className="mascot-stage">
        {shown === 'climb' && <Bamboo />}
        <button type="button" className="mascot-body" onClick={onPoke} aria-label="Giáo sư Gấu Trúc: bấm để nghe giảng">
          {art}
          {shown === 'wait' && (
            <span className="mascot-dots" aria-hidden="true">
              <i />
              <i />
              <i />
            </span>
          )}
          {shown === 'sleep' && (
            <span className="mascot-z" aria-hidden="true">
              z<span>z</span>
            </span>
          )}
        </button>
      </div>
    </div>
  )
}

// Chữ hiện dần như đang viết phấn (animation gấu tắt / giảm chuyển động: hiện ngay, không chạy hẹn giờ). Công thức trong `...` được tô nổi bật
function Typed({ text, instant }) {
  const plain = plainText(text)
  const [typed, setN] = useState(instant ? plain.length : 0)
  useEffect(() => {
    if (instant) return
    const id = setInterval(() => setN((k) => (k >= plain.length ? (clearInterval(id), k) : k + 1)), 28)
    return () => clearInterval(id)
  }, [plain, instant])
  const n = instant ? plain.length : typed
  return (
    <>
      <FormulaText text={text} shown={n} />
      <span className="sr-only">{plain.slice(n)}</span>
    </>
  )
}

function BubbleActions({ onClose, onHide }) {
  return (
    <>
      <button type="button" className="mascot-x" onClick={onClose} aria-label="Đóng" title="Đóng">
        ×
      </button>
      <button type="button" className="mascot-stow" onClick={onHide}>
        Cất gấu
      </button>
    </>
  )
}
