// Lấy mã video YouTube từ các dạng link phổ biến
function youtubeId(url) {
  try {
    const u = new URL(url)
    const host = u.hostname.replace(/^www\.|^m\./, '')
    if (host === 'youtu.be') return u.pathname.slice(1).split('/')[0] || null
    if (host === 'youtube.com' || host === 'youtube-nocookie.com') {
      if (u.searchParams.get('v')) return u.searchParams.get('v')
      const m = /^\/(embed|shorts|live)\/([^/?]+)/.exec(u.pathname)
      if (m) return m[2]
    }
  } catch {
    return null
  }
  return null
}

// Video YouTube thì nhúng; link khác (Drive, Facebook...) thì hiện nút mở
export default function VideoEmbed({ url }) {
  if (!url) return null
  const id = youtubeId(url)
  if (id) {
    return (
      <div className="video">
        <iframe
          src={`https://www.youtube-nocookie.com/embed/${encodeURIComponent(id)}`}
          title="Video bài giảng"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      </div>
    )
  }
  const safe = /^https?:\/\//i.test(url)
  return safe ? (
    <a className="btn" href={url} target="_blank" rel="noopener noreferrer">
      ▶️ Mở video
    </a>
  ) : (
    <p className="muted small">Link video không hợp lệ: {url}</p>
  )
}
