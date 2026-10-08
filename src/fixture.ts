import type { Short, ShortsProvider } from './types'

// Local-dev feed (open the app with ?fixture) so the UI works with no API key.
// Ids are ordinary public videos used only to exercise the player; they are not claimed to be Shorts.
const IDS = ['jNQXAC9IVRw', 'aqz-KE-bpKQ', 'YE7VzlLtp-4', 'dQw4w9WgXcQ']

export const fixtureProvider: ShortsProvider = {
  async load() {
    return IDS.map((id, i): Short => ({ id, title: `Fixture ${i + 1}`, channelId: 'fixture', durationSec: 30, publishedAt: '2025-01-01T00:00:00Z' }))
  },
}
