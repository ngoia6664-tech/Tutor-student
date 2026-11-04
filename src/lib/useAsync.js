import { useCallback, useEffect, useState } from 'react'
import { errMsg } from './errors.js'

// Hook tải dữ liệu chung: luôn có loading / error / data / reload.
// - Đổi tham số (vd. sang bài khác): xóa dữ liệu cũ, loading = true.
// - Gọi reload() (vd. sau khi lưu): GIỮ dữ liệu cũ trên màn hình, refreshing = true,
//   nên trang không bị nháy trắng rồi hiện khung chờ.
export function useAsync(fn, deps) {
  const depsKey = JSON.stringify(deps)
  const [state, setState] = useState({ key: depsKey, loading: true, refreshing: false, error: null, data: null })
  const [tick, setTick] = useState(0)

  useEffect(() => {
    let active = true
    setState((s) =>
      s.key === depsKey && s.data !== null
        ? { ...s, refreshing: true, error: null }
        : { key: depsKey, loading: true, refreshing: false, error: null, data: null }
    )
    Promise.resolve()
      .then(fn)
      .then(
        (data) => active && setState({ key: depsKey, loading: false, refreshing: false, error: null, data }),
        (e) => active && setState({ key: depsKey, loading: false, refreshing: false, error: errMsg(e), data: null })
      )
    return () => {
      active = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [depsKey, tick])

  const reload = useCallback(() => setTick((t) => t + 1), [])
  // Ngay khi tham số đổi (trước khi effect chạy) không trả dữ liệu của trang cũ
  const stale = state.key !== depsKey
  return {
    loading: stale || state.loading,
    refreshing: !stale && state.refreshing,
    error: stale ? null : state.error,
    data: stale ? null : state.data,
    reload,
  }
}

// Tải lại khi có sự kiện toàn cục (vd. xóa góp ý, chấm xong bài) để khối ở cột phải không bị cũ
export function useReloadOn(reload, events) {
  useEffect(() => {
    events.forEach((e) => window.addEventListener(e, reload))
    return () => events.forEach((e) => window.removeEventListener(e, reload))
  }, [reload, events])
}
