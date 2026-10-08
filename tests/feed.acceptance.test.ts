import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { createApp } from '../src/app'
import { QuotaError } from '../src/types'
import { short, fakePlayers, fakeProvider, memoryStorage, gesture, flush, GARBAGE } from './helpers'

let root: HTMLElement
beforeEach(() => { document.body.innerHTML = '<div id="root"></div>'; root = document.getElementById('root')!; vi.useFakeTimers() })
afterEach(() => vi.useRealTimers())

async function boot(shorts: any, storage = memoryStorage()) {
  const players = fakePlayers()
  const provider = fakeProvider({ search: shorts, channels: shorts, subscriptions: shorts })
  const app = createApp({ root, provider, playerFactory: players.factory, storage })
  await flush()
  return { app, players, provider, layer: () => root.querySelector('[data-testid="gesture-layer"]')! }
}

describe('feed - Zero', () => {
  it('shows an honest empty state and no player when the source has no Shorts', async () => {
    // Given a source that returns zero Shorts
    // When the app boots
    const { players } = await boot([])
    // Then no player is created and the user is told nothing was found
    expect(players.created).toHaveLength(0)
    expect(root.textContent).toContain('No Shorts found')
    expect(root.textContent).not.toMatch(GARBAGE)
  })
})

describe('feed - One', () => {
  it('autoplays the single Short with no Shorts UI on top', async () => {
    // Given a source with exactly one Short
    // When the app boots
    const { players } = await boot([short('aaa')])
    // Then it plays that Short
    expect(players.current()?.videoId).toBe('aaa')
    // And none of the Shorts overlays exist (like/comment/share rail, captions, channel row, subscribe)
    const text = root.textContent!.toLowerCase()
    for (const w of ['like', 'comment', 'share', 'subscribe', 'caption', 'title aaa']) expect(text).not.toContain(w)
    expect(root.querySelector('[data-testid="gesture-layer"]')).not.toBeNull()
    // And no garbage text leaks into the DOM
    expect(root.innerHTML).not.toMatch(GARBAGE)
  })
})

describe('feed - Many + Interface (swipe, preload)', () => {
  it('swipe up plays next, swipe down plays previous, neighbours are preloaded but not playing', async () => {
    // Given three Shorts
    const { players, layer } = await boot([short('a'), short('b'), short('c')])
    // Then the neighbour (b) is preloaded (created, not autoplaying) while a plays
    expect(players.current()?.videoId).toBe('a')
    expect(players.live().find(p => p.videoId === 'b')?.autoplay).toBe(false)
    // When the user swipes up
    gesture.swipeUp(layer()); await flush()
    // Then b plays and c is preloaded
    expect(players.current()?.videoId).toBe('b')
    expect(players.live().map(p => p.videoId).sort()).toEqual(['a', 'b', 'c'])
    // When the user swipes down
    gesture.swipeDown(layer()); await flush()
    // Then a plays again
    expect(players.current()?.videoId).toBe('a')
  })

  it('destroys players that fall out of the preload window', async () => {
    // Given four Shorts and the user moving to the third
    const { players, layer } = await boot([short('a'), short('b'), short('c'), short('d')])
    gesture.swipeUp(layer()); gesture.swipeUp(layer()); await flush()
    // Then a (two behind) has been destroyed
    expect(players.live().map(p => p.videoId).sort()).toEqual(['b', 'c', 'd'])
  })
})

describe('feed - Boundary', () => {
  it('swiping down on the first and up on the last Short stays put', async () => {
    // Given two Shorts
    const { players, layer } = await boot([short('a'), short('b')])
    // When swiping down at the start
    gesture.swipeDown(layer()); await flush()
    // Then still on a
    expect(players.current()?.videoId).toBe('a')
    // When swiping up twice
    gesture.swipeUp(layer()); gesture.swipeUp(layer()); await flush()
    // Then still on b
    expect(players.current()?.videoId).toBe('b')
  })
})

describe('feed - Interface (tap)', () => {
  it('tap pauses then resumes the current Short', async () => {
    // Given a playing Short
    const { players, layer } = await boot([short('a'), short('b')])
    // When tapped
    gesture.tap(layer())
    // Then it is paused
    expect(players.live().find(p => p.videoId === 'a')?.paused).toBe(true)
    // When tapped again
    gesture.tap(layer())
    // Then it plays
    expect(players.current()?.videoId).toBe('a')
  })
})

describe('feed - Exceptions', () => {
  it('shows the quota error honestly rather than an empty feed', async () => {
    // Given the API reports the daily quota is exhausted
    // When the app boots
    const { players } = await boot(new QuotaError())
    // Then the message says so plainly and no player exists
    expect(root.textContent).toContain('quota')
    expect(players.created).toHaveLength(0)
    expect(root.textContent).not.toMatch(GARBAGE)
  })
})

describe('feed - first run', () => {
  it('tells the user how to reach the hidden menu when there is nothing to play', async () => {
    // Given no Shorts (e.g. no API key yet)
    // When the app boots
    await boot([])
    // Then the status explains the long-press / edge-swipe menu
    expect(root.textContent).toContain('Long-press')
  })
})
