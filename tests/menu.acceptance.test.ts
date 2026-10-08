import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { createApp } from '../src/app'
import { short, fakePlayers, fakeProvider, memoryStorage, gesture, flush, GARBAGE } from './helpers'

let root: HTMLElement
beforeEach(() => { document.body.innerHTML = '<div id="root"></div>'; root = document.getElementById('root')!; vi.useFakeTimers() })
afterEach(() => vi.useRealTimers())

const $ = (id: string) => root.querySelector<HTMLElement>(`[data-testid="${id}"]`)
const layer = () => $('gesture-layer')!

async function boot(storage = memoryStorage()) {
  const players = fakePlayers()
  const provider = fakeProvider({
    search: [short('s1'), short('s2')],
    channels: [short('c1'), short('c2')],
  })
  createApp({ root, provider, playerFactory: players.factory, storage })
  await flush()
  return { players, provider, storage }
}

const longPress = () => { gesture.holdStart(layer()); vi.advanceTimersByTime(600); gesture.holdEnd(layer()) }

describe('menu - opening', () => {
  it('is hidden by default', async () => {
    // Given the feed is playing
    await boot()
    // Then no menu is in the DOM
    expect($('menu')).toBeNull()
  })

  it('opens on long-press without toggling pause', async () => {
    // Given a playing Short
    const { players } = await boot()
    // When the user long-presses
    longPress()
    // Then the menu shows and the Short was not paused by the release
    expect($('menu')).not.toBeNull()
    expect(players.current()?.videoId).toBe('s1')
  })

  it('opens on a swipe from the left edge', async () => {
    // Given a playing Short
    await boot()
    // When the user swipes in from the left edge
    gesture.edgeSwipe(layer())
    // Then the menu shows
    expect($('menu')).not.toBeNull()
  })

  it('a short press (no hold) does not open the menu', async () => {
    // Given a playing Short
    await boot()
    // When the user presses for 100ms
    gesture.holdStart(layer()); vi.advanceTimersByTime(100); gesture.holdEnd(layer())
    // Then there is no menu (it was a tap)
    expect($('menu')).toBeNull()
  })
})

describe('menu - switching source', () => {
  it('lists Search and Channels, and no Subscriptions while the flag does not exist yet', async () => {
    // Given the menu is open
    await boot(); longPress()
    // Then both sources are offered, labelled cleanly
    expect($('source-search')?.textContent).toContain('Search')
    expect($('source-channels')?.textContent).toContain('Channels')
    expect($('source-subscriptions')).toBeNull()
    expect($('menu')!.textContent).not.toMatch(GARBAGE)
  })

  it('choosing Channels loads the curated channels, plays their first Short and closes the menu', async () => {
    // Given curated channels are saved and the menu is open
    const storage = memoryStorage({ 'bs:channels': JSON.stringify(['UCabc']) })
    const { players, provider } = await boot(storage); longPress()
    // When Channels is chosen
    $('source-channels')!.click(); await flush()
    // Then the provider is asked for those channels
    expect(provider.load).toHaveBeenLastCalledWith({ kind: 'channels', channels: ['UCabc'] })
    // And the first channel Short plays, the old search players are gone, menu closed
    expect(players.current()?.videoId).toBe('c1')
    expect(players.live().some(p => p.videoId.startsWith('s'))).toBe(false)
    expect($('menu')).toBeNull()
  })

  it('remembers the chosen source across reloads', async () => {
    // Given the user chose Channels
    const storage = memoryStorage()
    await boot(storage); longPress(); $('source-channels')!.click(); await flush()
    // When the app is started again with the same storage
    document.body.innerHTML = '<div id="root"></div>'; root = document.getElementById('root')!
    const { players } = await boot(storage)
    // Then it opens on Channels
    expect(players.current()?.videoId).toBe('c1')
  })

  it('tapping while the menu is open closes it instead of pausing', async () => {
    // Given an open menu
    const { players } = await boot(); longPress()
    // When the backdrop is tapped
    $('menu-backdrop')!.click()
    // Then the menu is gone and playback continues
    expect($('menu')).toBeNull()
    expect(players.current()?.videoId).toBe('s1')
  })
})

describe('menu - settings', () => {
  const openSettings = () => { longPress(); $('open-settings')!.click() }

  it('saving a new search query reloads the Search source with it and persists it', async () => {
    // Given the settings panel is open
    const { provider, storage } = await boot(); openSettings()
    // When the query is changed and saved
    ;($('query-input') as HTMLInputElement).value = 'cats'
    $('settings-save')!.click(); await flush()
    // Then Search is reloaded with the new query and it is persisted
    expect(provider.load).toHaveBeenLastCalledWith({ kind: 'search', query: 'cats' })
    expect(storage.getItem('bs:query')).toBe('cats')
  })

  it('saving channels splits lines/commas, trims, drops blanks and dupes', async () => {
    // Given the settings panel is open
    const { storage } = await boot(); openSettings()
    // When messy channel input is saved
    ;($('channels-input') as HTMLTextAreaElement).value = ' UCaaa,\n@bob\n\n UCaaa , '
    $('settings-save')!.click(); await flush()
    // Then a clean list is stored
    expect(JSON.parse(storage.getItem('bs:channels')!)).toEqual(['UCaaa', '@bob'])
  })

  it('stores the API key on-device only when provided, and never renders it back as garbage', async () => {
    // Given settings open
    const { storage } = await boot(); openSettings()
    // When a key is entered
    ;($('apikey-input') as HTMLInputElement).value = 'AIzaFAKE'
    $('settings-save')!.click(); await flush()
    // Then it is saved in local storage under bs:apiKey
    expect(storage.getItem('bs:apiKey')).toBe('AIzaFAKE')
    // And the settings text never contains garbage
    openSettings()
    expect(root.innerHTML).not.toMatch(GARBAGE)
  })
})
