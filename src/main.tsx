import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { subscribeToLocation } from './router'

// Prerendered pages (scripts/prerender.mjs) ship head tags for their own URL.
// Page components replace them where they manage SEO; after the first in-app
// navigation, any that remain no longer describe the page, so remove them.
const stopWatching = subscribeToLocation(() => {
  document.head.querySelectorAll('[data-prerendered="true"]').forEach((node) => node.remove())
  stopWatching()
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
