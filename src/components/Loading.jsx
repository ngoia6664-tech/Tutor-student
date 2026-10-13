export default function Loading({ text = 'Đang tải...', full = false }) {
  return (
    <div className={full ? 'loading loading-full' : 'loading'} role="status">
      <span className="spinner" aria-hidden="true" />
      <span>{text}</span>
    </div>
  )
}
