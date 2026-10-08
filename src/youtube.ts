import type { Short, ShortsProvider, SourceSpec } from './types'
import { QuotaError } from './types'
import { isShort, parseIsoDuration } from './isShort'

export interface YouTubeOptions { apiKey: string; fetch: typeof fetch; storage: Storage; now: () => number }

const BASE = 'https://www.googleapis.com/youtube/v3'
const BATCH = 50
const PER_CHANNEL = 15
const HOUR = 3600_000
const TTL = { search: 6 * HOUR, playlist: 0.5 * HOUR, channel: 24 * HOUR, videos: 24 * HOUR }
const QUOTA_REASONS = new Set(['quotaExceeded', 'dailyLimitExceeded', 'rateLimitExceeded'])

export class ApiError extends Error {}

export function createYouTubeProvider(o: YouTubeOptions): ShortsProvider {
  async function call(path: string, params: Record<string, string>, ttl: number): Promise<any> {
    if (!o.apiKey) throw new ApiError('No API key configured. Add your YouTube Data API key in Settings.')
    // the cache key deliberately excludes the API key so secrets never reach storage
    const cacheKey = `bs:cache:${path}?${new URLSearchParams(Object.entries(params).sort()).toString()}`
    try {
      const hit = JSON.parse(o.storage.getItem(cacheKey) ?? 'null')
      if (hit && o.now() - hit.t < ttl) return hit.v
    } catch { /* corrupt cache entry: refetch */ }
    const url = new URL(`${BASE}/${path}`)
    for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v)
    url.searchParams.set('key', o.apiKey)
    const res = await o.fetch(url.toString())
    if (!res.ok) throw await toError(res)
    const body = await res.json()
    try { o.storage.setItem(cacheKey, JSON.stringify({ t: o.now(), v: body })) } catch { /* storage full: skip caching */ }
    return body
  }

  async function toError(res: Response): Promise<Error> {
    let body: any = null
    try { body = await res.json() } catch { /* non-JSON error body */ }
    const reasons: string[] = (body?.error?.errors ?? []).map((e: any) => e?.reason)
    if (res.status === 403 && reasons.some(r => QUOTA_REASONS.has(r))) return new QuotaError()
    const detail = typeof body?.error?.message === 'string' ? body.error.message : res.statusText || 'request failed'
    return new ApiError(`YouTube API error ${res.status}: ${detail}`)
  }

  async function hydrate(ids: string[]): Promise<Short[]> {
    const unique = [...new Set(ids)]
    const byId = new Map<string, Short>()
    for (let i = 0; i < unique.length; i += BATCH) {
      const body = await call('videos', { part: 'snippet,contentDetails,player', id: unique.slice(i, i + BATCH).join(',') }, TTL.videos)
      for (const v of body.items ?? []) {
        const durationSec = parseIsoDuration(v.contentDetails?.duration ?? '')
        if (durationSec === null || !v.snippet) continue
        const w = Number(v.player?.embedWidth), h = Number(v.player?.embedHeight)
        const aspect = w > 0 && h > 0 ? { w, h } : undefined
        const publishedAt = String(v.snippet.publishedAt ?? '')
        if (!isShort({ durationSec, publishedAt, aspect })) continue
        byId.set(v.id, { id: v.id, title: String(v.snippet.title ?? ''), channelId: String(v.snippet.channelId ?? ''), durationSec, publishedAt })
      }
    }
    return unique.flatMap(id => byId.get(id) ?? [])
  }

  async function uploadsPlaylist(channel: string): Promise<string | null> {
    if (/^UC/.test(channel)) return 'UU' + channel.slice(2)
    const body = await call('channels', { part: 'id', forHandle: channel.startsWith('@') ? channel : '@' + channel }, TTL.channel)
    const id: string | undefined = body.items?.[0]?.id
    return id ? 'UU' + id.slice(2) : null
  }

  async function channelVideoIds(channels: string[]): Promise<string[]> {
    const ids: string[] = []
    for (const ch of channels) {
      const playlistId = await uploadsPlaylist(ch.trim())
      if (!playlistId) continue
      const body = await call('playlistItems', { part: 'contentDetails', playlistId, maxResults: String(PER_CHANNEL) }, TTL.playlist)
      for (const it of body.items ?? []) if (it.contentDetails?.videoId) ids.push(it.contentDetails.videoId)
    }
    return ids
  }

  return {
    async load(spec: SourceSpec) {
      if (spec.kind === 'search') {
        const body = await call('search', { part: 'id', type: 'video', videoDuration: 'short', maxResults: '50', q: `${spec.query} #shorts` }, TTL.search)
        return hydrate((body.items ?? []).map((i: any) => i.id?.videoId).filter(Boolean))
      }
      if (spec.kind === 'channels') {
        const shorts = await hydrate(await channelVideoIds(spec.channels))
        return shorts.sort((a, b) => Date.parse(b.publishedAt) - Date.parse(a.publishedAt))
      }
      throw new ApiError('Subscriptions are not available yet.')
    },
  }
}
