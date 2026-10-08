import type { Player, PlayerFactory, Short, ShortsProvider, SourceSpec } from './types'
import { QuotaError } from './types'

export interface AppOptions { root: HTMLElement; provider: ShortsProvider; playerFactory: PlayerFactory; storage: Storage }

const SWIPE_PX = 50
const LONG_PRESS_MS = 500
const EDGE_PX = 24
const EDGE_SWIPE_PX = 60
const DEFAULT_QUERY = 'shorts'

export const KEYS = { source: 'bs:source', query: 'bs:query', channels: 'bs:channels', apiKey: 'bs:apiKey' } as const

export function parseChannels(raw: string): string[] {
  return [...new Set(raw.split(/[\n,]/).map(c => c.trim()).filter(Boolean))]
}

export function describeError(e: unknown): string {
  if (e instanceof QuotaError) return 'YouTube API daily quota exceeded. It resets at midnight Pacific time.'
  const msg = e instanceof Error && e.message ? e.message : 'unknown error'
  return `Could not load Shorts: ${msg}`
}

function el(tag: string, cls: string) { const e = document.createElement(tag); e.className = cls; return e }

export function createApp(o: AppOptions) {
  const { root, provider, playerFactory, storage } = o
  const read = (k: string) => { try { return storage.getItem(k) } catch { return null } }
  const write = (k: string, v: string) => { try { storage.setItem(k, v) } catch { /* private mode */ } }
  const savedChannels = (): string[] => {
    try { const v = JSON.parse(read(KEYS.channels) ?? '[]'); return Array.isArray(v) ? v.map(String) : [] } catch { return [] }
  }
  const query = () => read(KEYS.query) || DEFAULT_QUERY
  const savedKind = (): 'search' | 'channels' => read(KEYS.source) === 'channels' ? 'channels' : 'search'
  const specFor = (kind: 'search' | 'channels'): SourceSpec =>
    kind === 'channels' ? { kind, channels: savedChannels() } : { kind, query: query() }

  let shorts: Short[] = []
  let index = 0
  let paused = false
  let status = 'Loading…'
  let menuEl: HTMLElement | null = null
  let loadToken = 0
  const slides = new Map<string, { el: HTMLElement; player: Player }>()

  root.innerHTML = ''
  const feed = el('main', 'feed')
  const statusEl = el('p', 'status')
  const layer = el('div', 'gesture-layer')
  layer.dataset.testid = 'gesture-layer'
  feed.append(statusEl, layer)
  root.append(feed)

  function render() {
    statusEl.textContent = shorts.length ? '' : `${status} Long-press anywhere (or swipe in from the left edge) for the menu.`
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

  function togglePause() { paused = !paused; render() }

  let down: { x: number; y: number } | null = null
  let held = false
  let timer: ReturnType<typeof setTimeout> | undefined
  layer.addEventListener('pointerdown', (e) => {
    const p = e as MouseEvent
    down = { x: p.clientX, y: p.clientY }
    held = false
    timer = setTimeout(() => { held = true; openMenu() }, LONG_PRESS_MS)
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
    else if (start.x <= EDGE_PX && dx >= EDGE_SWIPE_PX) openMenu()
    else if (Math.abs(dx) < 10 && Math.abs(dy) < 10) togglePause()
  })

  async function load(spec: SourceSpec) {
    const token = ++loadToken
    status = 'Loading…'
    shorts = []
    index = 0
    paused = false
    render()
    try {
      const result = await provider.load(spec)
      if (token !== loadToken) return
      shorts = result
      status = 'No Shorts found for this source.'
    } catch (e) {
      if (token !== loadToken) return
      status = describeError(e)
    }
    render()
  }

  function closeMenu() { menuEl?.remove(); menuEl = null }

  function button(testid: string, text: string, onClick: () => void) {
    const b = document.createElement('button')
    b.dataset.testid = testid
    b.textContent = text
    b.addEventListener('click', onClick)
    return b
  }

  function mountMenu(panel: HTMLElement) {
    closeMenu()
    menuEl = el('div', 'menu')
    menuEl.dataset.testid = 'menu'
    const backdrop = el('div', 'menu-backdrop')
    backdrop.dataset.testid = 'menu-backdrop'
    backdrop.addEventListener('click', closeMenu)
    menuEl.append(backdrop, panel)
    root.append(menuEl)
  }

  function openMenu() {
    const panel = el('div', 'menu-panel')
    panel.append(
      button('source-search', `Search: ${query()}`, () => choose('search')),
      button('source-channels', `Channels (${savedChannels().length})`, () => choose('channels')),
      button('open-settings', 'Settings', openSettings),
    )
    mountMenu(panel)
  }

  function choose(kind: 'search' | 'channels') {
    write(KEYS.source, kind)
    closeMenu()
    void load(specFor(kind))
  }

  function field(tag: 'input' | 'textarea', testid: string, label: string, value: string, type?: string) {
    const wrap = document.createElement('label')
    wrap.append(label)
    const input = document.createElement(tag)
    input.dataset.testid = testid
    input.value = value
    if (type && input instanceof HTMLInputElement) input.type = type
    wrap.append(input)
    return { wrap, input }
  }

  function openSettings() {
    const panel = el('div', 'menu-panel')
    panel.dataset.testid = 'settings'
    const q = field('input', 'query-input', 'Search query', query())
    const ch = field('textarea', 'channels-input', 'Channels (ids or @handles, one per line)', savedChannels().join('\n'))
    const key = field('input', 'apikey-input', 'YouTube API key (stored on this device only)', read(KEYS.apiKey) ?? '', 'password')
    const save = button('settings-save', 'Save', () => {
      write(KEYS.query, q.input.value.trim() || DEFAULT_QUERY)
      write(KEYS.channels, JSON.stringify(parseChannels(ch.input.value)))
      if (key.input.value.trim()) write(KEYS.apiKey, key.input.value.trim())
      closeMenu()
      void load(specFor(savedKind()))
    })
    panel.append(q.wrap, ch.wrap, key.wrap, save)
    mountMenu(panel)
  }

  void load(specFor(savedKind()))
  return { load }
}
