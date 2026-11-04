import { dueInfo, STATUS_LABEL, TYPE_LABEL } from '../lib/format.js'

export function DueBadge({ date }) {
  const info = dueInfo(date)
  return (
    <span className={`badge badge-${info.tone}`}>
      <span className="badge-dot" aria-hidden="true" />
      {info.text}
    </span>
  )
}

export function StatusBadge({ status }) {
  const tone = status === 'checked' ? 'ok' : status === 'done' ? 'primary' : 'warn'
  return (
    <span className={`badge badge-${tone}`}>
      <span className="badge-dot" aria-hidden="true" />
      {STATUS_LABEL[status] || status}
    </span>
  )
}

export function TypeBadge({ type }) {
  return (
    <span className="badge">
      <span className="badge-dot dot-purple" aria-hidden="true" />
      {TYPE_LABEL[type] || type}
    </span>
  )
}
