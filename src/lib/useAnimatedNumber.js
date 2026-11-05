import { useEffect, useState } from 'react'

/**
 * Hook tạo hiệu ứng số trượt (rolling number) mượt mà
 * @param {number} target Giá trị số đích
 * @param {number} duration Thời gian chạy (ms)
 * @returns {number} Giá trị hiển thị hiện thời
 */
export function useAnimatedNumber(target, duration = 380) {
  const [current, setCurrent] = useState(target || 0)

  useEffect(() => {
    if (typeof target !== 'number' || isNaN(target)) {
      setCurrent(target)
      return
    }

    const startVal = typeof current === 'number' && !isNaN(current) ? current : 0
    const diff = target - startVal
    if (diff === 0) return

    const startTime = performance.now()
    let frameId

    const step = (now) => {
      const elapsed = now - startTime
      const progress = Math.min(elapsed / duration, 1)
      // Ease out cubic
      const ease = 1 - Math.pow(1 - progress, 3)
      const nextVal = Math.round(startVal + diff * ease)
      setCurrent(nextVal)

      if (progress < 1) {
        frameId = requestAnimationFrame(step)
      } else {
        setCurrent(target)
      }
    }

    frameId = requestAnimationFrame(step)
    return () => cancelAnimationFrame(frameId)
  }, [target, duration])

  return current
}

