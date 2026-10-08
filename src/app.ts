import type { Player, PlayerFactory, Short, ShortsProvider, SourceSpec } from './types'
import { QuotaError } from './types'

export interface AppOptions { root: HTMLElement; provider: ShortsProvider; playerFactory: PlayerFactory; storage: Storage }

const SWIPE_PX = 50
const LONG_PRESS_MS = 500
const EDGE_PX = 24
const EDGE_SWIPE_PX = 60

export function describeError(e: unknown): string {
  if (e instanceof QuotaError) return 'YouTube API daily quota exceeded. It resets at midnight Pacific time.'
  const msg = e instanceof Error && e.message ? e.message : 'unknown error'
  return `Could not load Shorts: ${msg}`
}

export function createApp(o: AppOptions) {
  const { root, provider, playerFactory } = o
  let shorts: Short[] = []
  let index = 0
  let paused = false
  let status = 'Loading…'
  const slides = new Map<string, { el: HTMLElement; player: Player }>()

  root.innerHTML = ''
  const feed = el('main', 'feed')
  const statusEl = el('p', 'status')
  const layer = el('div', 'gesture-layer')
  layer.dataset.testid = 'gesture-layer'
  feed.append(statusEl, layer)
  root.append(feed)

  function el(tag: string, cls: string) { const e = document.createElement(tag); e.className = cls; return e }

  function render() {
    statusEl.textContent = shorts.length ? '' : status
    const want = new Set<string>()
    for (let i = index - 1; i <= index + 1; i++) if (shorts[i]) want.add(shorts[i].id)
    for (const [id, s] of slides) if (!want.has(id)) { s.player.destroy(); s.el.remove(); slides.delete(id) }
    shorts.forEach((sh, i) => {
      if (!want.has(sh.id)) return
      let s = slides.get(sh.id)
      if (!s) {
        const slide = el('div', 'slide')
        const host = el('div', 'player-host')
        slide.append(host)
        feed.insertBefore(slide, layer)
        s = { el: slide, player: playerFactory(host, { videoId: sh.id, autoplay: i === index && !paused }) }
        slides.set(sh.id, s)
      }
      s.el.style.transform = `translateY(${(i - index) * 100}%)`
      if (i === index) { if (paused) s.player.pause(); else s.player.play() } else s.player.pause()
    })
  }

  function go(delta: number) {
    const next = index + delta
    if (next < 0 || next >= shorts.length) return
    index = next
    paused = false
    render()
  }

  function togglePause() {
    paused = !paused
    render()
  }

  let down: { x: number; y: number } | null = null
  let held = false
  let timer: ReturnType<typeof setTimeout> | undefined
  layer.addEventListener('pointerdown', (e) => {
    const p = e as MouseEvent
    down = { x: p.clientX, y: p.clientY }
    held = false
    timer = setTimeout(() => { held = true }, LONG_PRESS_MS)
  })
  layer.addEventListener('pointerup', (e) => {
    clearTimeout(timer)
    if (!down) return
    const p = e as MouseEvent
    const dx = p.clientX - down.x
    const dy = p.clientY - down.y
    const start = down
    down = null
    if (held) return
    if (Math.abs(dy) >= SWIPE_PX && Math.abs(dy) > Math.abs(dx)) go(dy < 0 ? 1 : -1)
    else if (start.x <= EDGE_PX && dx >= EDGE_SWIPE_PX) return
    else if (Math.abs(dx) < 10 && Math.abs(dy) < 10) togglePause()
  })

  async function load(spec: SourceSpec) {
    status = 'Loading…'
    shorts = []
    index = 0
    render()
    try {
      shorts = await provider.load(spec)
      status = 'No Shorts found for this source.'
    } catch (e) {
      status = describeError(e)
    }
    render()
  }

  void load({ kind: 'search', query: 'shorts' })
  return { load }
}
