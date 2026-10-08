import { describe, it, expect } from 'vitest'
import { isShort, parseIsoDuration } from '../src/isShort'

describe('parseIsoDuration', () => {
  it.each([
    ['PT0S', 0], ['PT45S', 45], ['PT1M', 60], ['PT1M1S', 61], ['PT3M', 180], ['PT1H', 3600], ['P0D', 0],
  ])('%s -> %d seconds', (iso, sec) => {
    // Given an ISO-8601 duration from videos.list contentDetails
    // When parsed
    // Then it equals the seconds
    expect(parseIsoDuration(iso)).toBe(sec)
  })
  it('returns NaN-free null for garbage input', () => {
    // Given junk
    // When parsed
    // Then null (never NaN)
    expect(parseIsoDuration('banana')).toBeNull()
    expect(parseIsoDuration('')).toBeNull()
  })
})

describe('isShort (3-minute rule effective 2024-10-15, 60s before; square-or-taller)', () => {
  const before = '2024-10-14T23:59:59Z'
  const after = '2024-10-15T00:00:00Z'
  it.each([
    // Zero / boundary durations
    ['zero-length is not a Short', 0, after, undefined, false],
    ['1s is a Short', 1, after, undefined, true],
    ['60s old upload is a Short', 60, before, undefined, true],
    ['61s old upload is NOT a Short (old 60s rule)', 61, before, undefined, false],
    ['61s new upload is a Short', 61, after, undefined, true],
    ['180s new upload is a Short', 180, after, undefined, true],
    ['181s new upload is NOT a Short', 181, after, undefined, false],
    // aspect
    ['vertical 9:16 is a Short', 30, after, { w: 9, h: 16 }, true],
    ['square 1:1 is a Short', 30, after, { w: 1, h: 1 }, true],
    ['landscape 16:9 is NOT a Short', 30, after, { w: 16, h: 9 }, false],
    ['unknown aspect falls back to duration only', 30, after, undefined, true],
  ])('%s', (_name, durationSec, publishedAt, aspect, expected) => {
    // Given a video's duration, publish date, and optional embed aspect
    // When classified
    // Then it matches the documented heuristic
    expect(isShort({ durationSec, publishedAt, aspect })).toBe(expected)
  })
})
