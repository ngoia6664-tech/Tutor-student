// Trạng thái đang tải.
// - Cả màn hình (full) hoặc có chữ (text): vòng xoay + chữ.
// - Mặc định trong trang: khung xương mờ đúng dáng danh sách, đỡ cảm giác "nháy".
/** @param {{ text?: string, full?: boolean, rows?: number }} props */
export default function Loading({ text, full = false, rows = 3 }) {
  if (full || text) {
    return (
      <div className={full ? 'loading loading-full' : 'loading'} role="status">
        <span className="spinner" aria-hidden="true" />
        <span>{text || 'Đang tải...'}</span>
      </div>
    )
  }
  return (
    <div className="skeleton" role="status" aria-label="Đang tải">
      {Array.from({ length: rows + 1 }, (_, i) => (
        <div key={i} className="skeleton-card" />
      ))}
    </div>
  )
}
