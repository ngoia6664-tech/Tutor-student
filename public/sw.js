// Service worker: cho phép cài app lên màn hình chính và mở nhanh hơn.
// - Trang (index.html): lấy bản mới từ mạng trước, mất mạng thì dùng bản đã lưu.
// - /assets/*: tên file có mã băm, không bao giờ đổi nội dung → lưu và dùng lại.
// - Không đụng tới dữ liệu Supabase (khác tên miền) để không bao giờ hiện dữ liệu cũ.
// Đổi tên để xóa bộ nhớ cũ (bản v1 có thể đã lưu nhầm trang HTML thay cho file JS)
const CACHE = 'app-v2'

self.addEventListener('install', () => self.skipWaiting())

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  )
})

self.addEventListener('fetch', (e) => {
  const req = e.request
  const url = new URL(req.url)
  if (req.method !== 'GET' || url.origin !== self.location.origin) return

  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req)
        .then((res) => {
          // Trang chủ tĩnh (home.html) không được ghi đè bản lưu của app
          if (res.ok && url.pathname !== '/home.html') caches.open(CACHE).then((c) => c.put('/index.html', res.clone()))
          return res
        })
        .catch(() => caches.match('/index.html').then((r) => r || Response.error()))
    )
    return
  }

  if (url.pathname.startsWith('/assets/')) {
    e.respondWith(
      caches.match(req).then(
        (hit) =>
          hit ||
          fetch(req).then((res) => {
            // Chỉ lưu đúng file tài nguyên, không lưu trang HTML trả về thay cho file đã bị xóa
            if (res.ok && !(res.headers.get('content-type') || '').includes('text/html'))
              caches.open(CACHE).then((c) => c.put(req, res.clone()))
            return res
          })
      )
    )
  }
})
