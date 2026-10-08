import { vi } from 'vitest'
import type { Short, Player, PlayerFactory, ShortsProvider, SourceSpec } from '../src/types'

export const short = (id: string, over: Partial<Short> = {}): Short => ({
  id, title: `Title ${id}`, channelId: 'UC1', durationSec: 30,
  publishedAt: '2025-01-01T00:00:00Z', ...over,
})

export class FakePlayer implements Player {
  paused = false
  destroyed = false
  constructor(public videoId: string, public autoplay: boolean) {}
  play() { this.paused = false; this.autoplay = true }
  pause() { this.paused = true }
  destroy() { this.destroyed = true }
}

export function fakePlayers() {
  const created: FakePlayer[] = []
  const factory: PlayerFactory = (_el, opts) => {
    const p = new FakePlayer(opts.videoId, opts.autoplay)
    created.push(p)
    return p
  }
  const live = () => created.filter(p => !p.destroyed)
  const current = () => live().find(p => p.autoplay && !p.paused)
  return { factory, created, live, current }
}

export function fakeProvider(byKind: Partial<Record<SourceSpec['kind'], Short[] | Error>>) {
  const load = vi.fn(async (spec: SourceSpec) => {
    const r = byKind[spec.kind] ?? []
    if (r instanceof Error) throw r
    return r
  })
  return { load } as ShortsProvider & { load: typeof load }
}

export function memoryStorage(initial: Record<string, string> = {}): Storage {
  const m = new Map(Object.entries(initial))
  return {
    getItem: k => m.get(k) ?? null, setItem: (k, v) => void m.set(k, String(v)),
    removeItem: k => void m.delete(k), clear: () => m.clear(),
    key: i => [...m.keys()][i] ?? null, get length() { return m.size },
  }
}

const pt = (el: Element, type: string, x: number, y: number) =>
  el.dispatchEvent(new MouseEvent(type, { clientX: x, clientY: y, bubbles: true }))

export const gesture = {
  swipeUp: (el: Element) => { pt(el, 'pointerdown', 200, 600); pt(el, 'pointermove', 200, 300); pt(el, 'pointerup', 200, 300) },
  swipeDown: (el: Element) => { pt(el, 'pointerdown', 200, 300); pt(el, 'pointermove', 200, 600); pt(el, 'pointerup', 200, 600) },
  tap: (el: Element) => { pt(el, 'pointerdown', 200, 300); pt(el, 'pointerup', 200, 300) },
  edgeSwipe: (el: Element) => { pt(el, 'pointerdown', 4, 300); pt(el, 'pointermove', 120, 305); pt(el, 'pointerup', 120, 305) },
  holdStart: (el: Element) => pt(el, 'pointerdown', 200, 300),
  holdEnd: (el: Element) => pt(el, 'pointerup', 200, 300),
}

export const flush = async () => { for (let i = 0; i < 5; i++) await Promise.resolve() }

export const GARBAGE = /undefined|\[object Object\]|NaN|null/
