import { useEffect, useRef } from 'react'
import { canPlayNow, registerExternalMusic, setExternalPlaying } from '../lib/spaceSound.js'

// Nhạc nền chế độ ngắm vũ trụ: phát video YouTube qua IFrame API (nhạc có bản quyền nên chỉ nhúng, không tải về).
// Trình phát ẩn (trong suốt, không bấm được), chỉ nghe tiếng; tự lặp lại. Lỗi / không có mạng → onFail (dùng âm thanh tổng hợp).
// Phát / tạm dừng do nút ▶ / ‖ của SpaceExplorer (qua lib/spaceSound: registerExternalMusic); trạng thái thật báo về bằng setExternalPlaying.
// Điện thoại chặn tự phát → trạng thái không phải PLAYING → nút hiện ▶ để người dùng tự bấm phát.
const VIDEO = 'JuSsvM8B4Jc'

let apiPromise = null
function loadApi() {
  if (window.YT?.Player) return Promise.resolve(window.YT)
  if (!apiPromise) {
    apiPromise = new Promise((resolve, reject) => {
      const prev = window.onYouTubeIframeAPIReady
      window.onYouTubeIframeAPIReady = () => {
        prev?.()
        resolve(window.YT)
      }
      const s = document.createElement('script')
      s.src = 'https://www.youtube.com/iframe_api'
      s.onerror = () => {
        apiPromise = null
        reject(new Error('Không tải được YouTube'))
      }
      document.head.appendChild(s)
      // Mạng chậm / bị chặn: quá 8 giây coi như lỗi
      setTimeout(() => {
        if (window.YT?.Player) return
        apiPromise = null
        reject(new Error('Hết thời gian tải YouTube'))
      }, 8000)
    })
  }
  return apiPromise
}

// enabled = Cài đặt "Nhạc nền" đang bật
export default function SpaceMusic({ volume, enabled, onFail }) {
  const wrap = useRef(null)
  const player = useRef(null)
  const latest = useRef({ volume, enabled, onFail })
  latest.current = { volume, enabled, onFail }

  useEffect(() => {
    let dead = false
    let unregister = () => {}
    // YouTube thay thế phần tử được giao bằng iframe: tạo div con thủ công để React không đụng tới
    const host = document.createElement('div')
    wrap.current.appendChild(host)
    const fail = () => !dead && latest.current.onFail?.()
    // Chỉ tự phát khi nhạc bật và đang nhìn app (máy tính: phát cả khi ở tab khác; điện thoại ra nền thì để người dùng bấm ▶)
    const autoplay = () => latest.current.enabled && canPlayNow()

    loadApi()
      .then((YT) => {
        if (dead) return
        player.current = new YT.Player(host, {
          videoId: VIDEO,
          width: '200',
          height: '112',
          playerVars: { autoplay: autoplay() ? 1 : 0, loop: 1, playlist: VIDEO, playsinline: 1, rel: 0, controls: 0, disablekb: 1 },
          events: {
            onReady: (e) => {
              if (dead) return
              const p = e.target
              p.setVolume(latest.current.volume)
              unregister = registerExternalMusic({ play: () => p.playVideo(), pause: () => p.pauseVideo() })
              if (autoplay()) p.playVideo()
              else p.pauseVideo()
            },
            onStateChange: (e) => {
              if (dead) return
              const S = YT.PlayerState
              // Lặp lại: loop + playlist đôi khi không ăn, hết bài thì tự tua về đầu
              if (e.data === S.ENDED && latest.current.enabled && canPlayNow()) {
                e.target.seekTo(0)
                e.target.playVideo()
                return
              }
              // Đang tải (BUFFERING) giữ nguyên trạng thái nút cho khỏi nhấp nháy
              if (e.data === S.PLAYING) setExternalPlaying(true)
              else if (e.data !== S.BUFFERING) setExternalPlaying(false)
            },
            onError: fail,
          },
        })
      })
      .catch(fail)

    return () => {
      dead = true
      unregister()
      player.current?.destroy?.()
      player.current = null
      host.remove()
    }
  }, [])

  useEffect(() => {
    player.current?.setVolume?.(volume)
  }, [volume])

  // Tắt "Nhạc nền": dừng hẳn cho đỡ tốn mạng. Bật lại KHÔNG tự phát (nút loa / ▶ gọi phát trong cú bấm)
  useEffect(() => {
    if (!enabled) player.current?.pauseVideo?.()
  }, [enabled])

  return (
    <div className="explorer-music">
      <div className="explorer-music-frame" ref={wrap} />
    </div>
  )
}
