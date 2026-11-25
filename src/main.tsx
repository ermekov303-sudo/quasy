import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { hasStoredSession, isAuthRedirect, SYNC_CONFIGURED, useSync } from './sync/state'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

// signed in on this device, or just opened from a sign-in email link: start cloud sync (supabase-js loads only then)
if (SYNC_CONFIGURED && (hasStoredSession() || isAuthRedirect())) {
  const linkError = new URLSearchParams(location.hash.slice(1)).get('error_description')
  if (linkError) {
    useSync.setState({ status: 'error', error: linkError })
    history.replaceState(null, '', location.pathname)
  } else void import('./sync/sync').then((m) => m.startSync())
}
