import { useCallback, useEffect, useState } from 'react'
import { errMsg } from './errors.js'

// Hook tải dữ liệu chung: luôn có loading / error / data / reload
export function useAsync(fn, deps) {
  const [state, setState] = useState({ loading: true, error: null, data: null })
  const [tick, setTick] = useState(0)

  useEffect(() => {
    let active = true
    setState((s) => ({ ...s, loading: true, error: null }))
    Promise.resolve()
      .then(fn)
      .then(
        (data) => active && setState({ loading: false, error: null, data }),
        (e) => active && setState({ loading: false, error: errMsg(e), data: null })
      )
    return () => {
      active = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, tick])

  const reload = useCallback(() => setTick((t) => t + 1), [])
  return { ...state, reload }
}
