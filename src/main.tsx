import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { clearStartupData, primeStartupGuide } from './guides/api'
import { currentPath, matchRoute, pageRoute, subscribeToLocation } from './router'
import { preloadRouteChunk } from './routeChunks'

// Prerendered pages (scripts/prerender.mjs) ship head tags for their own URL.
// Page components replace them where they manage SEO; after the first in-app
// navigation, any that remain no longer describe the page, so remove them.
const stopWatching = subscribeToLocation(() => {
  document.head.querySelectorAll('[data-prerendered="true"]').forEach((node) => node.remove())
  clearStartupData()
  stopWatching()
})

// The first render replaces the prerendered HTML in #root. Load what it needs
// first (the page's chunk and, for a Guide, its data from the API), so the
// static page stays on screen until the app can show the same content: no
// empty or loading state in between, and no layout shift. Capped by the
// Guide request deadline; after it the app renders as before (loading state).
const STARTUP_DEADLINE_MS = 10_000
const container = document.getElementById('root')!
const route = pageRoute(matchRoute(currentPath()))
const prerendered = container.childElementCount > 0
const ready = [preloadRouteChunk(route)]
if (prerendered && route.name === 'guide')
  ready.push(primeStartupGuide(route.slug, 'zh-CN', AbortSignal.timeout(STARTUP_DEADLINE_MS)))
if (prerendered && route.name === 'localized-guide')
  ready.push(primeStartupGuide(route.slug, route.locale, AbortSignal.timeout(STARTUP_DEADLINE_MS)))
if (prerendered && route.name === 'topic') {
  const locale = route.locale ?? 'zh-CN'
  ready.push(
    import('./components/family-visa/topics/topicStartup').then((m) =>
      m.primeTopicStartup(locale, AbortSignal.timeout(STARTUP_DEADLINE_MS)),
    ),
  )
}

function render() {
  createRoot(container).render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
}
Promise.race([
  Promise.allSettled(ready),
  new Promise((resolve) => window.setTimeout(resolve, STARTUP_DEADLINE_MS)),
]).then(render)
