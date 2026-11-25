import { createClient } from '@supabase/supabase-js'
import { useTrickStatus } from '../tricks/trickStatus'
import { useSetupPrefs } from '../workout/setupPrefs'
import { mergeMastery, mergeProfile } from './merge'
import { useSync } from './state'

/**
 * Optional cloud sync (stage 2: profile + trick statuses). Loaded lazily, only when the user signs in or already is.
 * Local storage stays the source the app reads; the cloud is a copy that other devices merge from.
 */
export const supabase = createClient(import.meta.env.VITE_SUPABASE_URL, import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY, {
  // implicit flow: the email link signs in whichever browser opens it (PKCE would need the same browser that asked)
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, flowType: 'implicit' },
})

// Per-device bookkeeping: which account was last synced here + edits made here that the cloud hasn't seen yet.
const META = 'quasy-sync'
type Meta = { userId: string | null; profileEdits: number; masteryDirty: string[] }
const EMPTY: Meta = { userId: null, profileEdits: 0, masteryDirty: [] }
function readMeta(): Meta {
  try {
    return { ...EMPTY, ...JSON.parse(localStorage.getItem(META) ?? '{}') }
  } catch {
    return EMPTY
  }
}
const writeMeta = (m: Meta) => localStorage.setItem(META, JSON.stringify(m))

let applying = false // true while cloud values are written into the stores, so they don't count as local edits
let listening = false
let running: Promise<void> | null = null
let again = false
let timer: ReturnType<typeof setTimeout> | undefined

const schedule = () => {
  clearTimeout(timer)
  timer = setTimeout(() => void syncNow(), 1500)
}

function listen() {
  if (listening) return
  listening = true
  useSetupPrefs.subscribe((s, p) => {
    if (applying || (s.name === p.name && s.weightKg === p.weightKg && s.photo === p.photo)) return
    const m = readMeta()
    writeMeta({ ...m, profileEdits: m.profileEdits + 1 })
    schedule()
  })
  useTrickStatus.subscribe((s, p) => {
    if (applying) return
    const changed = Object.keys(s.statuses).filter((id) => s.statuses[id] !== p.statuses[id])
    if (!changed.length) return
    const m = readMeta()
    writeMeta({ ...m, masteryDirty: [...new Set([...m.masteryDirty, ...changed])] })
    schedule()
  })
  addEventListener('online', () => void syncNow())
  document.addEventListener('visibilitychange', () => document.visibilityState === 'visible' && void syncNow())
}

/** Email a one-time sign-in link that opens Profile (creates the account on first use). */
export async function sendLink(email: string) {
  const { error } = await supabase.auth.signInWithOtp({ email, options: { shouldCreateUser: true, emailRedirectTo: `${location.origin}/profile` } })
  if (error) throw error
}

/** Signing out keeps everything on this device; the next sign-in merges again. */
export async function signOut() {
  await supabase.auth.signOut({ scope: 'local' })
  writeMeta(EMPTY)
  useSync.setState({ email: null, status: 'idle', lastSyncedAt: null, error: null })
}

export async function startSync() {
  const { data } = await supabase.auth.getSession() // also completes a sign-in link that just opened the app
  if (!data.session) return useSync.setState({ email: null, status: 'idle' })
  useSync.setState({ email: data.session.user.email ?? null })
  listen()
  await syncNow()
}

/** One sync at a time; a request during a run triggers exactly one more run afterwards. */
export function syncNow(): Promise<void> {
  if (running) {
    again = true
    return running
  }
  running = run().finally(() => {
    running = null
    if (again) {
      again = false
      void syncNow()
    }
  })
  return running
}

async function run() {
  if (!navigator.onLine) return useSync.setState({ status: 'offline' })
  const { data } = await supabase.auth.getSession()
  if (!data.session) return useSync.setState({ email: null, status: 'idle' })
  const uid = data.session.user.id
  useSync.setState({ status: 'syncing', error: null })
  try {
    const start = readMeta()
    const first = start.userId !== uid
    const [p, m] = await Promise.all([
      supabase.from('profiles').select('name, weight_kg, photo').eq('id', uid).maybeSingle(),
      supabase.from('trick_mastery').select('trick_id, status'),
    ])
    if (p.error) throw p.error
    if (m.error) throw m.error

    // read local state after the network calls, so edits made meanwhile are included
    const prefs = useSetupPrefs.getState()
    const prof = mergeProfile(
      { name: prefs.name, weightKg: prefs.weightKg, photo: prefs.photo },
      p.data,
      first ? 'first' : readMeta().profileEdits ? 'dirty' : 'clean',
    )
    const mast = mergeMastery(useTrickStatus.getState().statuses, m.data, first ? 'first' : new Set(readMeta().masteryDirty))
    applying = true
    try {
      prefs.set(prof.merged)
      useTrickStatus.setState({ statuses: mast.merged })
    } finally {
      applying = false
    }

    const edits = readMeta().profileEdits
    if (prof.push) {
      const { error } = await supabase
        .from('profiles')
        .upsert({ id: uid, name: prof.merged.name, weight_kg: prof.merged.weightKg, photo: prof.merged.photo })
      if (error) throw error
    }
    if (mast.toPush.length) {
      const { error } = await supabase.from('trick_mastery').upsert(mast.toPush.map(([trick_id, status]) => ({ user_id: uid, trick_id, status })))
      if (error) throw error
    }

    // clear only what was sent; anything edited during the upload stays marked for the next run
    const now = readMeta()
    const statuses = useTrickStatus.getState().statuses
    writeMeta({
      userId: uid,
      profileEdits: now.profileEdits === edits ? 0 : now.profileEdits,
      masteryDirty: now.masteryDirty.filter((id) => statuses[id] !== mast.merged[id]),
    })
    useSync.setState({ status: 'ok', lastSyncedAt: Date.now() })
  } catch (e) {
    useSync.setState({ status: 'error', error: (e as { message?: string })?.message || 'Sync failed' }) // Supabase errors are plain objects
  }
}
