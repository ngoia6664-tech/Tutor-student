import { useEffect, useLayoutEffect, useRef } from 'react'
import { useLocation, useNavigationType } from 'react-router-dom'
import { flushNav, readScroll, saveScroll, urlKey } from '../lib/navMemory.js'

// Nhớ / khôi phục vị trí cuộn (cuộn là của window). Đặt một lần trong Layout, không cần sửa từng trang.
// - Đổi trang thường (bấm link): lên đầu trang; chỉ đổi ?query (lọc trên cây): giữ nguyên chỗ.
// - Back / Forward, hoặc link có state.restore (tab menu, "← Danh sách"): về đúng chỗ cũ của URL đó.
// - Khôi phục theo mục neo: link đầu tiên đang thấy trong trang + độ lệch so với mép dưới thanh trên cùng.
//   Danh sách đổi (thêm / xóa bài phía trên) vẫn về đúng mục. Mục neo mất → mục vừa mở → y cũ (kẹp trong trang).
// - Chỉ khôi phục khi trang hết khung đang tải (Loading: [role=status]), theo dõi bằng MutationObserver,
//   không dùng setTimeout. Người dùng tự cuộn / chạm / gõ phím trong lúc chờ → bỏ khôi phục.

const LOADING = '.page-enter .skeleton[role="status"], .page-enter .loading[role="status"]'
// Link không thuộc danh sách: cây mục lục (dính bên trái trên máy tính), menu, hộp thoại
const SKIP = '.library-side, .nav, .topbar, [role="dialog"]'
const CANCEL = ['wheel', 'touchstart', 'keydown', 'mousedown']

const root = () => document.querySelector('main.page')
const topEdge = () => Math.max(0, document.querySelector('.topbar')?.getBoundingClientRect().bottom || 0)
const links = (el) => [...el.querySelectorAll('a[href]')].filter((a) => !a.closest(SKIP))
// Cùng href có thể có nhiều link (tiêu đề + nút Xem): luôn lấy link đầu tiên để ghi và khôi phục khớp nhau
const firstLink = (el, href) => links(el).find((a) => a.getAttribute('href') === href) || null

function snapshot(el) {
  const top = topEdge()
  for (const a of links(el)) {
    const r = a.getBoundingClientRect()
    if (!r.width && !r.height) continue // đang ẩn
    if (r.bottom > top) {
      const href = a.getAttribute('href')
      return { y: window.scrollY, href, off: firstLink(el, href).getBoundingClientRect().top - top }
    }
  }
  return { y: window.scrollY, href: null }
}

function apply(el, pos) {
  const anchor = pos.href && firstLink(el, pos.href)
  if (anchor) return window.scrollTo(0, anchor.getBoundingClientRect().top + window.scrollY - topEdge() - pos.off)
  const opened = pos.opened && firstLink(el, pos.opened)
  if (opened) return opened.scrollIntoView({ block: 'center' })
  const max = document.documentElement.scrollHeight - window.innerHeight
  window.scrollTo(0, Math.max(0, Math.min(pos.y || 0, max)))
}

export default function ScrollMemory() {
  const location = useLocation()
  const navType = useNavigationType()
  const keyRef = useRef(null) // URL của trang đang hiện (đã commit), để ghi đúng chỗ
  const pathRef = useRef(null)
  const pending = useRef(false) // đang chờ khôi phục: không ghi đè vị trí đã nhớ bằng vị trí tạm

  useEffect(() => {
    if ('scrollRestoration' in window.history) window.history.scrollRestoration = 'manual'
  }, [])

  // Ghi vị trí khi cuộn (gộp mỗi khung hình) + mục vừa bấm mở; ghi sessionStorage khi ẩn tab / tải lại
  useEffect(() => {
    let frame = 0
    const save = () => {
      frame = 0
      const el = root()
      if (!pending.current && keyRef.current && el) saveScroll(keyRef.current, snapshot(el))
    }
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(save)
    }
    const onClick = (e) => {
      const a = e.target.closest?.('a[href]')
      const el = root()
      if (!a || !el || !el.contains(a) || a.closest(SKIP) || pending.current || !keyRef.current) return
      saveScroll(keyRef.current, { ...snapshot(el), opened: a.getAttribute('href') })
    }
    const onHide = () => document.visibilityState === 'hidden' && flushNav()
    window.addEventListener('scroll', onScroll, { passive: true })
    document.addEventListener('click', onClick, true)
    document.addEventListener('visibilitychange', onHide)
    window.addEventListener('pagehide', flushNav)
    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener('scroll', onScroll)
      document.removeEventListener('click', onClick, true)
      document.removeEventListener('visibilitychange', onHide)
      window.removeEventListener('pagehide', flushNav)
    }
  }, [])

  // Mỗi mục lịch sử mới (location.key): quyết định lên đầu / giữ nguyên / khôi phục
  useLayoutEffect(() => {
    const samePath = pathRef.current === location.pathname
    const key = urlKey(location.pathname, location.search)
    pathRef.current = location.pathname
    keyRef.current = key
    flushNav()
    const pos = navType === 'POP' || location.state?.restore ? readScroll(key) : null
    const el = root()
    if (!pos || !el) {
      pending.current = false
      if (!samePath) window.scrollTo(0, 0)
      return
    }
    // Trang đã sẵn sàng (không có gì đang tải): khôi phục ngay trước khi vẽ, không nháy
    if (!el.querySelector(LOADING)) {
      pending.current = false
      apply(el, pos)
      return
    }
    if (!samePath) window.scrollTo(0, 0)
    pending.current = true
    const stop = () => {
      pending.current = false
      obs.disconnect()
      CANCEL.forEach((t) => window.removeEventListener(t, stop, true))
    }
    // Callback chạy ngay sau khi React gắn DOM mới (trước khi vẽ khung hình đó)
    const obs = new MutationObserver(() => {
      if (el.querySelector(LOADING)) return
      stop()
      apply(el, pos)
    })
    obs.observe(el, { childList: true, subtree: true })
    CANCEL.forEach((t) => window.addEventListener(t, stop, { capture: true, passive: true }))
    return stop
    // Chỉ chạy khi sang mục lịch sử khác
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.key])

  return null
}
