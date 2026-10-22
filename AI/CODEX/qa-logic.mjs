// QA độc lập, không sửa source. Chạy: node AI/CODEX/qa-logic.mjs
import fs from 'node:fs/promises'
import assert from 'node:assert/strict'

const storage = new Map()
globalThis.localStorage = {
  getItem: (key) => storage.get(key) ?? null,
  setItem: (key, value) => storage.set(key, String(value)),
}
const sound = await import('../../src/lib/spaceSound.js')
assert.equal(sound.getVolume(), 60)
assert.equal(sound.isSoundOn(), true)
sound.setVolume(35)
assert.equal(sound.getVolume(), 35)
assert.equal(storage.get('space-volume'), '35')
sound.setSoundOn(false)
sound.startMusic() // Không được tạo AudioContext khi đã tắt tiếng.
assert.equal(sound.isSoundOn(), false)
assert.equal(storage.get('space-sound'), 'off')
assert.equal(sound.getMusicStatus(), 'idle')
console.log('PASS: default volume, persistence, sound-off guard (mock localStorage).')

// Kiểm tra trạng thái tắt tiếng trước khi player YouTube bất đồng bộ sẵn sàng.
// Mock không chứng minh âm thanh thực tế trên trình duyệt.
const effects = []
const calls = []
let playerOptions
const player = {
  setVolume: (v) => calls.push(['setVolume', v]),
  pauseVideo: () => calls.push(['pauseVideo']),
  playVideo: () => calls.push(['playVideo']),
  destroy: () => {},
}
globalThis.__qaReact = {
  useRef: (v) => ({ current: v === null ? { appendChild() {} } : v }),
  useState: (v) => [v, () => {}],
  useEffect: (fn) => effects.push(fn),
}
globalThis.window = {
  YT: {
    Player: function (_host, options) { playerOptions = options; return player },
    PlayerState: { PLAYING: 1, ENDED: 0 },
  },
}
globalThis.document = { createElement: () => ({ remove() {} }) }
let source = await fs.readFile(new URL('../../src/components/SpaceMusic.jsx', import.meta.url), 'utf8')
source = source.replace(/import \{ useEffect, useRef, useState \} from 'react'/,
  'const { useEffect, useRef, useState } = globalThis.__qaReact;')
// Bỏ riêng JSX trả về, giữ nguyên toàn bộ logic effect để chạy trong Node.
const returnStart = source.lastIndexOf('\n  return (')
assert.ok(returnStart > 0)
source = source.slice(0, returnStart) + '\n  return null\n}\n'
const { default: SpaceMusic } = await import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`)
SpaceMusic({ volume: 60, muted: true, onFail() {} })
const cleanup = effects.map((effect) => effect())
await Promise.resolve()
await Promise.resolve()
playerOptions.events.onReady({ target: player })
const result = {
  initialMuted: true,
  autoplay: playerOptions.playerVars.autoplay,
  pauseCalls: calls.filter(([name]) => name === 'pauseVideo').length,
  calls,
}
console.log('PASS: YouTube ready with saved mute:', JSON.stringify(result))
assert.equal(result.autoplay, 0)
assert.equal(result.pauseCalls, 1)
assert.equal(calls.some(([name]) => name === 'playVideo'), false)
cleanup.forEach((fn) => fn?.())
