import { useSyncExternalStore } from 'react'

// Giao diện hiện tại ('dark' | 'light'), lấy từ <html data-theme>; tự cập nhật khi bấm ☀/☾
function subscribe(callback) {
  const observer = new MutationObserver(callback)
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] })
  return () => observer.disconnect()
}

function getTheme() {
  return document.documentElement.dataset.theme === 'light' ? 'light' : 'dark'
}

export function useTheme() {
  return useSyncExternalStore(subscribe, getTheme, () => 'dark')
}
