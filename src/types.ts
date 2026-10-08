export interface Short { id: string; title: string; channelId: string; durationSec: number; publishedAt: string }
export interface Player { play(): void; pause(): void; destroy(): void }
export type PlayerFactory = (el: HTMLElement, opts: { videoId: string; autoplay: boolean }) => Player
export type SourceSpec = { kind: 'search'; query: string } | { kind: 'channels'; channels: string[] } | { kind: 'subscriptions' }
export interface ShortsProvider { load(spec: SourceSpec): Promise<Short[]> }
export class QuotaError extends Error { constructor() { super('YouTube API daily quota exceeded') } }
