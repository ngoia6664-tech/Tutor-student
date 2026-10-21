// Service worker: cho phép cài app lên màn hình chính và mở nhanh hơn.
// - Trang (index.html): lấy bản mới từ mạng trước, mất mạng thì dùng bản đã lưu.
// - /assets/*: tên file có mã băm, không bao giờ đổi nội dung → lưu và dùng lại.
// - Không đụng tới dữ liệu Supabase (khác tên miền) để không bao giờ hiện dữ liệu cũ.
const CACHE = 'app-v1'

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
          if (res.ok) caches.open(CACHE).then((c) => c.put('/index.html', res.clone()))
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
            if (res.ok) caches.open(CACHE).then((c) => c.put(req, res.clone()))
            return res
          })
      )
    )
  }
})
