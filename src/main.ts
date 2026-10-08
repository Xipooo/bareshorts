import './style.css'

// Empty app shell. Features arrive one board story at a time (see the GitHub Project and MOB.md).
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  void import('virtual:pwa-register').then(m => m.registerSW({ immediate: true }))
}
