/** YouTube raised the Shorts limit from 60s to 3 min on 2024-10-15; older uploads keep the 60s limit. */
export const LONG_SHORTS_EPOCH = Date.parse('2024-10-15T00:00:00Z')

export function parseIsoDuration(iso: string): number | null {
  const m = /^P(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?)?$/.exec(iso)
  if (!m || iso === 'P' || iso.endsWith('T')) return null
  const [d, h, mi, s] = [1, 2, 3, 4].map(i => Number(m[i] ?? 0))
  return d * 86400 + h * 3600 + mi * 60 + s
}

export interface ShortCandidate { durationSec: number; publishedAt: string; aspect?: { w: number; h: number } }

export function isShort(v: ShortCandidate): boolean {
  if (!(v.durationSec > 0)) return false
  if (v.aspect && v.aspect.w > v.aspect.h) return false
  const max = Date.parse(v.publishedAt) >= LONG_SHORTS_EPOCH ? 180 : 60
  return v.durationSec <= max
}
