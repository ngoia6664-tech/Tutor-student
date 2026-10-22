import { useEffect, useRef, useState } from 'react'

// Nhạc nền chế độ ngắm vũ trụ: phát video YouTube qua IFrame API (nhạc có bản quyền nên chỉ nhúng, không tải về).
// Trình phát ẩn (trong suốt, không bấm được), chỉ nghe tiếng; tự lặp lại. Lỗi / không có mạng → onFail (dùng âm thanh tổng hợp).
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

export default function SpaceMusic({ volume, muted, onFail }) {
  const wrap = useRef(null)
  const player = useRef(null)
  const [blocked, setBlocked] = useState(false) // trình duyệt chặn tự phát → cần bấm "Phát nhạc"
  const latest = useRef({ volume, muted, onFail })
  latest.current = { volume, muted, onFail }

  useEffect(() => {
    let dead = false
    let timer = 0
    // YouTube thay thế phần tử được giao bằng iframe: tạo div con thủ công để React không đụng tới
    const host = document.createElement('div')
    wrap.current.appendChild(host)
    const fail = () => !dead && latest.current.onFail?.()

    loadApi()
      .then((YT) => {
        if (dead) return
        player.current = new YT.Player(host, {
          videoId: VIDEO,
          width: '200',
          height: '112',
          playerVars: { autoplay: 1, loop: 1, playlist: VIDEO, playsinline: 1, rel: 0, controls: 0, disablekb: 1 },
          events: {
            onReady: (e) => {
              const { volume: v, muted: m } = latest.current
              e.target.setVolume(v)
              if (m) return
              e.target.playVideo()
              timer = setTimeout(() => {
                if (!dead && !latest.current.muted && e.target.getPlayerState?.() !== YT.PlayerState.PLAYING) setBlocked(true)
              }, 2500)
            },
            onStateChange: (e) => {
              if (e.data === YT.PlayerState.PLAYING) setBlocked(false)
              // Lặp lại: loop + playlist đôi khi không ăn, hết bài thì tự tua về đầu
              if (e.data === YT.PlayerState.ENDED && !latest.current.muted) {
                e.target.seekTo(0)
                e.target.playVideo()
              }
            },
            onError: fail,
          },
        })
      })
      .catch(fail)

    return () => {
      dead = true
      clearTimeout(timer)
      player.current?.destroy?.()
      player.current = null
      host.remove()
    }
  }, [])

  // Đổi âm lượng / tắt tiếng: tắt thì tạm dừng hẳn cho đỡ tốn mạng
  useEffect(() => {
    const p = player.current
    if (!p?.setVolume) return
    p.setVolume(volume)
    if (muted) p.pauseVideo()
    else p.playVideo()
  }, [volume, muted])

  return (
    <div className="explorer-music">
      <div className="explorer-music-frame" ref={wrap} />
      {blocked && !muted && (
        <button type="button" className="btn btn-primary btn-small explorer-music-play" onClick={() => player.current?.playVideo()}>
          ▶ Phát nhạc
        </button>
      )}
    </div>
  )
}
