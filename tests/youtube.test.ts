import { describe, it, expect, vi } from 'vitest'
import { createYouTubeProvider } from '../src/youtube'
import { QuotaError } from '../src/types'
import { memoryStorage, GARBAGE } from './helpers'

type Handler = (url: URL) => { status?: number; body: unknown }

function fakeFetch(handler: Handler) {
  const calls: URL[] = []
  const fn = vi.fn(async (input: RequestInfo | URL) => {
    const url = new URL(String(input))
    calls.push(url)
    const { status = 200, body } = handler(url)
    return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } })
  })
  return { fn: fn as unknown as typeof fetch, calls, mock: fn }
}

const video = (id: string, dur: string, w = 1080, h = 1920, published = '2025-02-01T00:00:00Z') => ({
  id, snippet: { title: `T ${id}`, channelId: 'UCabc', publishedAt: published },
  contentDetails: { duration: dur }, player: { embedWidth: String(w), embedHeight: String(h) },
})

function mk(handler: Handler, extra: Partial<Parameters<typeof createYouTubeProvider>[0]> = {}) {
  const f = fakeFetch(handler)
  const provider = createYouTubeProvider({ apiKey: 'KEY', fetch: f.fn, storage: memoryStorage(), now: () => 1_000_000, ...extra })
  return { provider, ...f }
}

const searchItems = (...ids: string[]) => ({ items: ids.map(id => ({ id: { videoId: id } })) })

describe('YouTube provider - search', () => {
  it('returns only Shorts, in search order, using ONE batched videos.list call', async () => {
    // Given a search returning 3 videos: a 30s vertical, a 400s long video and a 45s landscape clip
    const { provider, calls } = mk(url => {
      if (url.pathname.endsWith('/search')) return { body: searchItems('a', 'b', 'c') }
      return { body: { items: [video('a', 'PT30S'), video('b', 'PT6M40S'), video('c', 'PT45S', 1920, 1080)] } }
    })
    // When loading the search source
    const shorts = await provider.load({ kind: 'search', query: 'cats' })
    // Then only the vertical 30s Short remains
    expect(shorts.map(s => s.id)).toEqual(['a'])
    expect(JSON.stringify(shorts)).not.toMatch(GARBAGE)
    // And videos.list was called exactly once with all ids (quota batching)
    const vl = calls.filter(u => u.pathname.endsWith('/videos'))
    expect(vl).toHaveLength(1)
    expect(vl[0].searchParams.get('id')).toBe('a,b,c')
    expect(vl[0].searchParams.get('key')).toBe('KEY')
  })

  it('returns an empty list (not an error) when the search finds nothing', async () => {
    // Given a search with zero items
    const { provider, calls } = mk(() => ({ body: { items: [] } }))
    // When loaded
    const shorts = await provider.load({ kind: 'search', query: 'zzz' })
    // Then empty, and videos.list is never called with an empty id list
    expect(shorts).toEqual([])
    expect(calls.some(u => u.pathname.endsWith('/videos'))).toBe(false)
  })

  it('splits more than 50 ids into batches of 50', async () => {
    // Given 120 channel uploads
    const ids = Array.from({ length: 120 }, (_, i) => `v${i}`)
    const { provider, calls } = mk(url => {
      if (url.pathname.endsWith('/playlistItems')) return { body: { items: ids.map(id => ({ contentDetails: { videoId: id } })) } }
      return { body: { items: (url.searchParams.get('id') ?? '').split(',').map(id => video(id, 'PT20S')) } }
    })
    // When loading a channel source
    const shorts = await provider.load({ kind: 'channels', channels: ['UCabc'] })
    // Then 3 videos.list calls of 50, 50, 20
    const sizes = calls.filter(u => u.pathname.endsWith('/videos')).map(u => u.searchParams.get('id')!.split(',').length)
    expect(sizes).toEqual([50, 50, 20])
    expect(shorts).toHaveLength(120)
  })
})

describe('YouTube provider - channels', () => {
  it('derives the uploads playlist from a UC channel id without spending quota on channels.list', async () => {
    // Given a channel id UCabc123
    const { provider, calls } = mk(url => {
      if (url.pathname.endsWith('/playlistItems')) return { body: { items: [{ contentDetails: { videoId: 'a' } }] } }
      return { body: { items: [video('a', 'PT10S')] } }
    })
    // When loaded
    await provider.load({ kind: 'channels', channels: ['UCabc123'] })
    // Then the uploads playlist UUabc123 is read directly
    expect(calls.some(u => u.pathname.endsWith('/channels'))).toBe(false)
    expect(calls.find(u => u.pathname.endsWith('/playlistItems'))!.searchParams.get('playlistId')).toBe('UUabc123')
  })

  it('resolves an @handle through channels.list(forHandle)', async () => {
    // Given a handle
    const { provider, calls } = mk(url => {
      if (url.pathname.endsWith('/channels')) return { body: { items: [{ id: 'UCxyz' }] } }
      if (url.pathname.endsWith('/playlistItems')) return { body: { items: [{ contentDetails: { videoId: 'a' } }] } }
      return { body: { items: [video('a', 'PT10S')] } }
    })
    // When loaded
    const shorts = await provider.load({ kind: 'channels', channels: ['@someone'] })
    // Then the handle was resolved and its Short returned
    expect(calls.find(u => u.pathname.endsWith('/channels'))!.searchParams.get('forHandle')).toBe('@someone')
    expect(shorts.map(s => s.id)).toEqual(['a'])
  })

  it('returns an empty list for an empty channel list without calling the API', async () => {
    // Given no curated channels
    const { provider, mock } = mk(() => ({ body: {} }))
    // When loaded
    // Then empty and no network
    expect(await provider.load({ kind: 'channels', channels: [] })).toEqual([])
    expect(mock).not.toHaveBeenCalled()
  })
})

describe('YouTube provider - cache', () => {
  it('serves a repeated load from cache, and refetches after the TTL expires', async () => {
    // Given a provider whose clock we control
    let t = 0
    const f = fakeFetch(url => url.pathname.endsWith('/search') ? { body: searchItems('a') } : { body: { items: [video('a', 'PT10S')] } })
    const provider = createYouTubeProvider({ apiKey: 'K', fetch: f.fn, storage: memoryStorage(), now: () => t })
    // When loading twice within the TTL
    await provider.load({ kind: 'search', query: 'q' })
    const after1 = f.calls.length
    await provider.load({ kind: 'search', query: 'q' })
    // Then no extra requests
    expect(f.calls.length).toBe(after1)
    // When the TTL (6h) has passed
    t = 7 * 3600 * 1000
    await provider.load({ kind: 'search', query: 'q' })
    // Then it refetches
    expect(f.calls.length).toBeGreaterThan(after1)
  })

  it('never stores the API key in the cache', async () => {
    // Given a provider with a secret key
    const storage = memoryStorage()
    const f = fakeFetch(url => url.pathname.endsWith('/search') ? { body: searchItems('a') } : { body: { items: [video('a', 'PT10S')] } })
    const provider = createYouTubeProvider({ apiKey: 'SECRETKEY', fetch: f.fn, storage, now: () => 0 })
    // When loading
    await provider.load({ kind: 'search', query: 'q' })
    // Then no stored value contains the key
    const all = Array.from({ length: storage.length }, (_, i) => storage.getItem(storage.key(i)!)! + storage.key(i)!).join('')
    expect(all).not.toContain('SECRETKEY')
  })
})

describe('YouTube provider - errors', () => {
  it.each(['quotaExceeded', 'dailyLimitExceeded', 'rateLimitExceeded'])('maps 403 %s to QuotaError', async (reason) => {
    // Given the API answers 403 with a quota reason
    const { provider } = mk(() => ({ status: 403, body: { error: { code: 403, message: 'q', errors: [{ reason }] } } }))
    // When loading
    // Then a QuotaError is thrown
    await expect(provider.load({ kind: 'search', query: 'x' })).rejects.toBeInstanceOf(QuotaError)
  })

  it('surfaces other API errors with the API message and status, never "undefined"', async () => {
    // Given a 400 keyInvalid
    const { provider } = mk(() => ({ status: 400, body: { error: { code: 400, message: 'API key not valid.', errors: [{ reason: 'keyInvalid' }] } } }))
    // When loading
    const err = await provider.load({ kind: 'search', query: 'x' }).catch(e => e)
    // Then the message is informative and clean
    expect(err).toBeInstanceOf(Error)
    expect(err).not.toBeInstanceOf(QuotaError)
    expect(err.message).toContain('API key not valid.')
    expect(err.message).toContain('400')
    expect(err.message).not.toMatch(GARBAGE)
  })

  it('handles a non-JSON error body without leaking garbage', async () => {
    // Given the server returns an HTML 502
    const fn = (async () => new Response('<html>bad gateway</html>', { status: 502 })) as unknown as typeof fetch
    const provider = createYouTubeProvider({ apiKey: 'K', fetch: fn, storage: memoryStorage(), now: () => 0 })
    // When loading
    const err = await provider.load({ kind: 'search', query: 'x' }).catch(e => e)
    // Then a clean status message
    expect(err.message).toContain('502')
    expect(err.message).not.toMatch(GARBAGE)
  })

  it('refuses to call the API without a key', async () => {
    // Given no API key configured
    const { provider, mock } = mk(() => ({ body: {} }), { apiKey: '' })
    // When loading
    // Then a clear error and no network call
    await expect(provider.load({ kind: 'search', query: 'x' })).rejects.toThrow(/API key/)
    expect(mock).not.toHaveBeenCalled()
  })
})

describe('YouTube provider - lazy key', () => {
  it('reads the API key at call time, so a key saved in Settings after boot works', async () => {
    // Given a provider created before any key exists
    let key = ''
    const f = fakeFetch(url => url.pathname.endsWith('/search') ? { body: searchItems('a') } : { body: { items: [video('a', 'PT10S')] } })
    const provider = createYouTubeProvider({ apiKey: () => key, fetch: f.fn, storage: memoryStorage(), now: () => 0 })
    await expect(provider.load({ kind: 'search', query: 'q' })).rejects.toThrow(/API key/)
    // When the user saves a key
    key = 'LATE'
    // Then the next load uses it
    await provider.load({ kind: 'search', query: 'q' })
    expect(f.calls[0].searchParams.get('key')).toBe('LATE')
  })
})
