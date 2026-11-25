import { Cloud, CloudOff, Loader2, Mail, RefreshCw } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { hasStoredSession, SYNC_CONFIGURED, useSync } from '../sync/state'
import { Button } from '../ui/Button'
import { Card, SectionTitle } from '../ui/Card'

const loadSync = () => import('../sync/sync') // supabase-js is only downloaded when sync is actually used
const field = 'h-12 w-full rounded-xl bg-surface-2 px-4 text-fg outline-none placeholder:text-muted focus:ring-2 focus:ring-accent-fg'
const message = (e: unknown) => (e as { message?: string })?.message || 'Something went wrong. Try again.'

function ago(t: number) {
  const s = Math.round((Date.now() - t) / 1000)
  return s < 60 ? 'just now' : s < 3600 ? `${Math.round(s / 60)} min ago` : new Date(t).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })
}

/** Optional email sign-in (one-time link) that syncs profile + trick statuses across devices. */
export function SyncCard() {
  const { email: account, status, lastSyncedAt, error } = useSync()
  const [sent, setSent] = useState(false)
  const [email, setEmail] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  if (!SYNC_CONFIGURED) return null

  const act = async (fn: () => Promise<void>) => {
    setBusy(true)
    setErr(null)
    try {
      await fn()
    } catch (e) {
      setErr(message(e))
    } finally {
      setBusy(false)
    }
  }
  const send = (e: FormEvent) => {
    e.preventDefault()
    void act(async () => {
      await (await loadSync()).sendLink(email.trim())
      setSent(true)
    })
  }

  let body
  if (account) {
    body = (
      <>
        <div className="flex items-center gap-3">
          <Cloud size={20} className="shrink-0 text-accent-fg" aria-hidden />
          <div className="min-w-0 flex-1">
            <div className="truncate font-medium">{account}</div>
            <div className={`text-xs ${status === 'error' ? 'text-danger' : 'text-muted'}`} role="status">
              {status === 'syncing' && 'Syncing…'}
              {status === 'ok' && lastSyncedAt && `Synced ${ago(lastSyncedAt)}`}
              {status === 'offline' && "Offline. Changes sync when you're back online."}
              {status === 'error' && `Sync failed: ${error}`}
              {status === 'idle' && 'Signed in'}
            </div>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <Button variant="secondary" disabled={busy || status === 'syncing'} onClick={() => void act(async () => (await loadSync()).syncNow())}>
            <RefreshCw size={16} aria-hidden /> Sync now
          </Button>
          <Button variant="ghost" disabled={busy} onClick={() => void act(async () => (await loadSync()).signOut())}>
            Sign out
          </Button>
        </div>
        <p className="mt-3 text-xs text-muted">Signing out keeps everything on this device.</p>
      </>
    )
  } else if (hasStoredSession()) {
    body = (
      <div className="flex items-center gap-2 text-sm text-muted" role="status">
        <Loader2 size={16} className="animate-spin" aria-hidden /> Connecting…
      </div>
    )
  } else if (!sent) {
    body = (
      <form onSubmit={send}>
        <label className="block">
          <span className="mb-2 block text-sm font-medium">Email</span>
          <input type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" className={field} />
        </label>
        <Button type="submit" full className="mt-3" disabled={busy || !email.includes('@')}>
          {busy ? <Loader2 size={16} className="animate-spin" aria-hidden /> : null} Send sign-in link
        </Button>
      </form>
    )
  } else {
    body = (
      <div role="status">
        <div className="flex items-center gap-2 font-semibold">
          <Mail size={18} className="text-accent-fg" aria-hidden /> Check your email
        </div>
        <p className="mt-2 text-sm text-muted">
          We sent a sign-in link to <span className="font-semibold text-fg">{email}</span>. Open it <span className="text-fg">on this device</span>, in the
          browser you use for Quasy. It can take a minute; check spam too.
        </p>
        <Button variant="ghost" full className="mt-2" onClick={() => (setSent(false), setErr(null))}>
          Use another email
        </Button>
      </div>
    )
  }

  return (
    <section className="mt-8">
      <SectionTitle>Sync across devices · beta</SectionTitle>
      <Card>
        {!account && !hasStoredSession() && (
          <div className="mb-4 flex gap-3 text-sm text-muted">
            <CloudOff size={20} className="mt-0.5 shrink-0 text-accent-fg" aria-hidden />
            <p>Optional. Sign in with your email to keep your name, weight, photo and trick statuses on all your devices. No password needed.</p>
          </div>
        )}
        {body}
        {!account && status === 'error' && error && !err && (
          <p className="mt-3 text-sm text-danger" role="alert">
            Sign-in link didn't work: {error}. Send a new one.
          </p>
        )}
        {err && (
          <p className="mt-3 text-sm text-danger" role="alert">
            {err}
          </p>
        )}
        <p className="mt-4 border-t border-line/60 pt-3 text-xs text-muted">
          Workouts stay on this device for now; syncing them comes next. Camera video is never uploaded.
        </p>
      </Card>
    </section>
  )
}
