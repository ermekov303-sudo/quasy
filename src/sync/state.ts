import { create } from 'zustand'

// Kept free of @supabase/supabase-js so the app never loads it for people who don't use sync.
const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
export const SYNC_CONFIGURED = Boolean(url && import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY)
const ref = url ? new URL(url).hostname.split('.')[0] : ''

/** supabase-js keeps the session under this key; its presence means "signed in on this device". */
export function hasStoredSession(): boolean {
  try {
    return Boolean(ref && localStorage.getItem(`sb-${ref}-auth-token`))
  } catch {
    return false
  }
}

type SyncState = {
  email: string | null // signed-in account, null when signed out
  status: 'idle' | 'syncing' | 'ok' | 'offline' | 'error'
  lastSyncedAt: number | null
  error: string | null
}

/** The page was opened from a sign-in email link (tokens or an error in the URL hash). */
export const isAuthRedirect = () => /(^|&|#)(access_token|error_description)=/.test(location.hash)

export const useSync = create<SyncState>()(() => ({ email: null, status: 'idle', lastSyncedAt: null, error: null }))
