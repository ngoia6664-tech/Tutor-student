import { useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase.js'
import { useAsync } from '../lib/useAsync.js'
import Icon from './Icon.jsx'

const HIDE_KEY = 'tutor-onboarding-hidden'

function readHidden() {
  try {
    return localStorage.getItem(HIDE_KEY) === '1'
  } catch {
    return false
  }
}

/** Đếm dòng của một bảng (không tải dữ liệu); lỗi thì coi như 0 để khối hướng dẫn không chặn trang. */
/** @param {string} table @param {[string, string]} [eq] */
async function countRows(table, eq) {
  // tên bảng động: ép kiểu lỏng để tsc không suy kiểu quá sâu
  let q = /** @type {any} */ (supabase).from(table).select('*', { count: 'exact', head: true })
  if (eq) q = q.eq(eq[0], eq[1])
  const { count } = await q
  return count || 0
}

// Danh sách "Bắt đầu" cho giáo viên mới: mỗi bước tự tick khi đã có dữ liệu; xong hết 4 bước thì khối tự ẩn.
export default function TutorOnboarding() {
  const [hidden, setHidden] = useState(readHidden)
  const { data } = useAsync(async () => {
    if (readHidden()) return null
    const [students, chapters, lessons, assignments, lr, ar, cr] = await Promise.all([
      countRows('profiles', ['role', 'student']),
      countRows('chapters'),
      countRows('lessons'),
      countRows('assignments'),
      countRows('lesson_recipients'),
      countRows('assignment_recipients'),
      countRows('course_recipients'),
    ])
    return [students > 0, chapters > 0, lessons + assignments > 0, lr + ar + cr > 0]
  }, [])

  if (hidden || !data || data.every(Boolean)) return null

  function hide() {
    try {
      localStorage.setItem(HIDE_KEY, '1')
    } catch {
      /* không lưu được thì chỉ ẩn lần này */
    }
    setHidden(true)
  }

  const steps = [
    {
      title: 'Có tài khoản học sinh',
      desc: 'Học sinh phải đăng nhập mới vào được app. Tạo tài khoản trong Supabase (Authentication › Users › Add user, tick "Auto Confirm User"), em sẽ tự hiện ở trang này.',
      actions: [{ to: '/tutor/help', label: 'Xem Hỏi đáp' }],
    },
    {
      title: 'Có chủ đề trong Thư viện',
      desc: 'Chủ đề là nơi xếp bài giảng và bài tập theo Lớp › Môn › Chương.',
      actions: [{ to: '/tutor/library', label: 'Mở Thư viện' }],
    },
    {
      title: 'Có bài giảng hoặc bài tập',
      desc: 'Soạn trực tiếp hoặc dán JSON soạn sẵn.',
      actions: [
        { to: '/tutor/assignments/new', label: 'Soạn bài tập' },
        { to: '/tutor/lessons/new', label: 'Soạn bài giảng' },
      ],
    },
    {
      title: 'Đã giao bài cho học sinh',
      desc: 'Vào Thư viện, bấm Giao ở một bài hoặc Giao khóa ở trang khóa, rồi chọn học sinh.',
      actions: [{ to: '/tutor/library', label: 'Vào Thư viện' }],
    },
  ]
  const doneCount = data.filter(Boolean).length

  return (
    <section className="card onboard" aria-labelledby="onboard-title">
      <div className="row row-between">
        <h2 id="onboard-title" className="onboard-title">
          Bắt đầu với app <span className="muted small">({doneCount}/{steps.length} bước)</span>
        </h2>
        <button type="button" className="btn btn-ghost btn-small" onClick={hide}>
          Ẩn hướng dẫn
        </button>
      </div>
      <ol className="onboard-steps">
        {steps.map((s, i) => (
          <li key={s.title} className={data[i] ? 'onboard-step done' : 'onboard-step'}>
            <span className="onboard-mark" role="img" aria-label={data[i] ? 'Đã xong' : `Bước ${i + 1}`}>
              {data[i] ? <Icon name="check" size={14} /> : i + 1}
            </span>
            <div className="onboard-body">
              <strong>{s.title}</strong>
              {!data[i] && (
                <>
                  <p className="muted small">{s.desc}</p>
                  <div className="row" style={{ flexWrap: 'wrap', gap: '0.4rem' }}>
                    {s.actions.map((a) => (
                      <Link key={a.to} to={a.to} className="btn btn-small">
                        {a.label}
                      </Link>
                    ))}
                  </div>
                </>
              )}
            </div>
          </li>
        ))}
      </ol>
    </section>
  )
}
