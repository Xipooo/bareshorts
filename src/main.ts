import './style.css'
import { createApp, KEYS } from './app'
import { createYouTubeProvider } from './youtube'
import { youtubePlayerFactory } from './youtubePlayer'
import { fixtureProvider } from './fixture'

const root = document.getElementById('root')!
const useFixture = new URLSearchParams(location.search).has('fixture')

createApp({
  root,
  storage: localStorage,
  playerFactory: youtubePlayerFactory,
  provider: useFixture
    ? fixtureProvider
    : createYouTubeProvider({
        apiKey: () => localStorage.getItem(KEYS.apiKey) || (import.meta.env.VITE_YT_API_KEY as string | undefined) || '',
        fetch: (...a) => fetch(...a),
        storage: localStorage,
        now: () => Date.now(),
      }),
})

if ('serviceWorker' in navigator && import.meta.env.PROD) {
  void import('virtual:pwa-register').then(m => m.registerSW({ immediate: true }))
}
