import { useState } from 'react'
import { useAsync } from '../../lib/useAsync.js'
import { formatDateTime } from '../../lib/format.js'
import { errMsg } from '../../lib/errors.js'
import { deleteFeedback, FEEDBACK_CHANGED, fetchFeedback, KIND_BY_ID, KINDS, markFeedbackSeen, RATINGS } from '../../lib/feedback.js'
import Loading from '../../components/Loading.jsx'
import ErrorBox from '../../components/ErrorBox.jsx'
import Icon from '../../components/Icon.jsx'
import { confirmDelete } from '../../lib/dialog.js'

// Trang nào học sinh đang mở khi gửi góp ý
const PAGES = [
  [/^\/student\/assignments\//, 'Làm bài tập'],
  [/^\/student\/lessons\/./, 'Xem bài giảng'],
  [/^\/student\/lessons/, 'Bài giảng'],
  [/^\/student\/results/, 'Kết quả'],
  [/^\/student\/mistakes/, 'Ôn tập'],
  [/^\/student\/library/, 'Thư viện'],
  [/^\/student\/?$/, 'Bài cần làm'],
]
const pageLabel = (p) => (p ? PAGES.find(([re]) => re.test(p))?.[1] || p : null)

const missingTable = (msg) => /feedback/.test(String(msg)) && /(does not exist|schema cache|not find)/i.test(String(msg))

// Góp ý (gia sư): mọi góp ý học sinh gửi, mới nhất lên trước; góp ý chưa xem được tô nổi.
export default function TutorFeedback() {
  const [tab, setTab] = useState('new')
  const [kind, setKind] = useState('')
  const [busy, setBusy] = useState(null)
  const [actionError, setActionError] = useState('')
  const { data, loading, error, reload } = useAsync(fetchFeedback, [])

  if (loading && !data) return <Loading />
  if (error)
    return (
      <ErrorBox
        message={missingTable(error) ? 'Chưa có bảng góp ý. Hãy chạy lại file supabase/schema.sql trong SQL Editor của Supabase.' : error}
        onRetry={reload}
      />
    )

  const all = data || []
  const unseen = all.filter((f) => !f.seen)
  const byTab = tab === 'new' ? unseen : all
  const shown = kind ? byTab.filter((f) => f.kind === kind) : byTab
  const rated = all.filter((f) => f.rating)
  const avg = rated.length ? rated.reduce((s, f) => s + f.rating, 0) / rated.length : null

  async function act(key, fn) {
    setBusy(key)
    setActionError('')
    try {
      await fn()
      window.dispatchEvent(new Event(FEEDBACK_CHANGED))
      await reload()
    } catch (e) {
      setActionError(errMsg(e))
    } finally {
      setBusy(null)
    }
  }

  return (
    <div>
      <div className="page-head">
        <h1>
          <span className="title-icon">
            <Icon name="chat" />
          </span>
          Góp ý
        </h1>
        {unseen.length > 0 && (
          <button type="button" className="btn btn-small" disabled={busy === 'all'} onClick={() => act('all', () => markFeedbackSeen(unseen.map((f) => f.id)))}>
            <Icon name="check" /> Đã xem hết
          </button>
        )}
      </div>
      <p className="muted small" style={{ marginTop: 0 }}>
        Góp ý học sinh gửi từ nút 💬 Góp ý ở góc màn hình.
      </p>

      {all.length > 0 && (
        <div className="fb-stats">
          <span className="badge">{all.length} góp ý</span>
          {avg !== null && (
            <span className="badge badge-primary" title={`${rated.length} lượt chấm`}>
              {RATINGS[Math.round(avg) - 1]?.emoji} Hài lòng {avg.toFixed(1)}/5
            </span>
          )}
          {KINDS.map((k) => {
            const n = all.filter((f) => f.kind === k.id).length
            return n ? (
              <span key={k.id} className="badge">
                {k.emoji} {k.label}: {n}
              </span>
            ) : null
          })}
        </div>
      )}

      <div className="tabs" style={{ margin: '0.5rem 0 0.75rem' }}>
        <button type="button" className={tab === 'new' ? 'tab active' : 'tab'} onClick={() => setTab('new')}>
          <Icon name="bell" /> Chưa xem ({unseen.length})
        </button>
        <button type="button" className={tab === 'all' ? 'tab active' : 'tab'} onClick={() => setTab('all')}>
          <Icon name="inbox" /> Tất cả ({all.length})
        </button>
      </div>

      <div className="feedback-kinds" style={{ marginBottom: '1rem' }} role="radiogroup" aria-label="Lọc theo loại">
        <button type="button" role="radio" aria-checked={!kind} className={`feedback-kind ${!kind ? 'is-on' : ''}`} onClick={() => setKind('')}>
          Tất cả loại
        </button>
        {KINDS.map((k) => (
          <button key={k.id} type="button" role="radio" aria-checked={kind === k.id} className={`feedback-kind ${kind === k.id ? 'is-on' : ''}`} onClick={() => setKind(k.id)}>
            {k.emoji} {k.label}
          </button>
        ))}
      </div>

      {actionError && <div className="alert alert-error">{actionError}</div>}

      {shown.length === 0 && (
        <div className="empty">{tab === 'new' && !kind ? '🎉 Đã xem hết góp ý.' : all.length === 0 ? 'Chưa có góp ý nào.' : 'Không có góp ý phù hợp.'}</div>
      )}

      <div className="fb-list">
        {shown.map((f) => {
          const k = KIND_BY_ID[f.kind] || KIND_BY_ID.other
          const r = f.rating ? RATINGS[f.rating - 1] : null
          return (
            <article key={f.id} className={f.seen ? 'fb-item' : 'fb-item is-new'}>
              <div className="fb-head">
                <span className="fb-who">{f.user?.full_name || 'Học sinh'}</span>
                {f.user?.grade && <span className="muted small">Lớp {f.user.grade}</span>}
                <span className="badge">
                  {k.emoji} {k.label}
                </span>
                {r && (
                  <span className="fb-rating" title={`${r.label} (${f.rating}/5)`}>
                    {r.emoji}
                  </span>
                )}
                {!f.seen && <span className="badge badge-new">Mới</span>}
              </div>
              <p className="fb-msg">{f.message}</p>
              <div className="fb-foot">
                <span className="muted small">
                  {formatDateTime(f.created_at)}
                  {pageLabel(f.page) && ` · tại ${pageLabel(f.page)}`}
                </span>
                <span className="spacer" />
                <button type="button" className="btn btn-small btn-ghost" disabled={busy === f.id} onClick={() => act(f.id, () => markFeedbackSeen([f.id], !f.seen))}>
                  <Icon name={f.seen ? 'undo' : 'check'} /> {f.seen ? 'Đánh dấu chưa xem' : 'Đã xem'}
                </button>
                <button
                  type="button"
                  className="btn btn-small btn-ghost"
                  disabled={busy === f.id}
                  onClick={async () => (await confirmDelete('góp ý', (f.message || '').slice(0, 40))) && act(f.id, () => deleteFeedback(f.id))}
                  aria-label="Xóa góp ý"
                  title="Xóa"
                >
                  <Icon name="trash" />
                </button>
              </div>
            </article>
          )
        })}
      </div>
    </div>
  )
}
