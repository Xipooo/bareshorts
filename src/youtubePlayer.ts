import type { Player, PlayerFactory } from './types'

// Official YouTube IFrame Player API only. No stream extraction, no CSS hiding of YouTube's own embed branding.
declare global { interface Window { YT?: any; onYouTubeIframeAPIReady?: () => void } }

let apiReady: Promise<any> | null = null
function loadApi(): Promise<any> {
  if (window.YT?.Player) return Promise.resolve(window.YT)
  apiReady ??= new Promise(resolve => {
    const prev = window.onYouTubeIframeAPIReady
    window.onYouTubeIframeAPIReady = () => { prev?.(); resolve(window.YT) }
    const s = document.createElement('script')
    s.src = 'https://www.youtube.com/iframe_api'
    document.head.append(s)
  })
  return apiReady
}

export const youtubePlayerFactory: PlayerFactory = (host, { videoId, autoplay }) => {
  let yt: any = null
  let wantPlay = autoplay
  let destroyed = false
  const mount = document.createElement('div')
  host.append(mount)

  void loadApi().then(YT => {
    if (destroyed) return
    yt = new YT.Player(mount, {
      videoId,
      playerVars: {
        controls: 0, playsinline: 1, modestbranding: 1, rel: 0, iv_load_policy: 3,
        fs: 0, disablekb: 1, cc_load_policy: 0, autoplay: autoplay ? 1 : 0, origin: location.origin,
      },
      events: {
        onReady: () => { if (!wantPlay) yt.pauseVideo?.() },
        onStateChange: (e: any) => { if (e.data === YT.PlayerState.ENDED && wantPlay) { yt.seekTo(0); yt.playVideo() } },
      },
    })
  })

  const player: Player = {
    play() { wantPlay = true; yt?.playVideo?.() },
    pause() { wantPlay = false; yt?.pauseVideo?.() },
    destroy() { destroyed = true; try { yt?.destroy?.() } catch { /* already gone */ } mount.remove() },
  }
  return player
}
