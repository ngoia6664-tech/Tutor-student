import { dueInfo, STATUS_LABEL, TYPE_LABEL } from '../lib/format.js'

export function DueBadge({ date }) {
  const info = dueInfo(date)
  return <span className={`badge badge-${info.tone}`}>{info.text}</span>
}

export function StatusBadge({ status }) {
  const tone = status === 'checked' ? 'ok' : status === 'done' ? 'primary' : 'warn'
  return <span className={`badge badge-${tone}`}>{STATUS_LABEL[status] || status}</span>
}

export function TypeBadge({ type }) {
  return <span className="badge">{TYPE_LABEL[type] || type}</span>
}
