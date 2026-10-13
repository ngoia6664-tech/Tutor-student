// Lưới ảnh bài nộp, bấm vào để xem ảnh gốc ở tab mới
export default function ImageGallery({ images }) {
  if (!images?.length) return <p className="muted small">Không có ảnh.</p>
  return (
    <div className="thumbs">
      {images.map((img, i) => (
        <a key={img.path} className="thumb" href={img.url} target="_blank" rel="noopener noreferrer" title={`Ảnh ${i + 1}`}>
          <img src={img.url} alt={`Ảnh bài làm ${i + 1}`} loading="lazy" />
        </a>
      ))}
    </div>
  )
}
