import { useLiveQuery } from 'dexie-react-hooks'
import { Camera, ChevronRight, Database, Info, Scale, UserRound, Volume2, type LucideIcon } from 'lucide-react'
import { useRef, useState, type ReactNode } from 'react'
import { db } from '../storage/db'
import { Button } from '../ui/Button'
import { Card, SectionTitle } from '../ui/Card'
import { Choice, Toggle } from '../ui/Choice'
import { Dialog } from '../ui/Dialog'
import { Page } from '../ui/Page'
import { WeightField } from '../ui/WeightField'
import { useSetupPrefs } from '../workout/setupPrefs'

type Open = 'edit' | 'weight' | 'camera' | 'data' | 'confirmClear' | 'about' | null

/** Resize a picked photo to a 256 px square JPEG so it fits in local storage. */
async function toAvatar(file: File): Promise<string> {
  const bmp = await createImageBitmap(file)
  const side = Math.min(bmp.width, bmp.height)
  const c = document.createElement('canvas')
  c.width = c.height = 256
  c.getContext('2d')!.drawImage(bmp, (bmp.width - side) / 2, (bmp.height - side) / 2, side, side, 0, 0, 256, 256)
  bmp.close()
  return c.toDataURL('image/jpeg', 0.8)
}

export function Avatar({ photo, size = 'size-16' }: { photo: string | null; size?: string }) {
  return photo ? (
    <img src={photo} alt="" className={`${size} shrink-0 rounded-full object-cover`} />
  ) : (
    <div className={`${size} grid shrink-0 place-items-center rounded-full bg-surface-2 text-muted`}>
      <UserRound size={28} aria-hidden />
    </div>
  )
}

export function ProfileScreen() {
  const prefs = useSetupPrefs()
  const [open, setOpen] = useState<Open>(null)
  const [draftName, setDraftName] = useState('')
  const [draftPhoto, setDraftPhoto] = useState<string | null>(null)
  const [photoError, setPhotoError] = useState<string | null>(null)
  const [cleared, setCleared] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const counts = useLiveQuery(async () => {
    const all = await db.workouts.toArray()
    return { workouts: all.length, tests: all.filter((w) => w.benchmarkMs).length }
  })
  const [storage, setStorage] = useState<string | null>(null)

  const close = () => setOpen(null)
  const openEdit = () => {
    setDraftName(prefs.name)
    setDraftPhoto(prefs.photo)
    setPhotoError(null)
    setOpen('edit')
  }
  const openData = () => {
    setCleared(false)
    setOpen('data')
    navigator.storage
      ?.estimate?.()
      .then((e) => setStorage(e.usage !== undefined ? `${(e.usage / 1024 / 1024).toFixed(1)} MB` : null))
      .catch(() => setStorage(null))
  }

  return (
    <Page withNav narrow>
      <header className="py-4">
        <h1 className="text-2xl font-extrabold tracking-tight">Profile</h1>
      </header>

      <Card className="flex items-center gap-4">
        <Avatar photo={prefs.photo} />
        <div>
          <div className="text-lg font-semibold">{prefs.name || 'Athlete'}</div>
          <div className="text-sm text-muted">{prefs.weightKg ? `${prefs.weightKg} kg` : 'Body weight not set'}</div>
        </div>
      </Card>

      <section className="mt-8">
        <SectionTitle>Settings</SectionTitle>
        <Card className="divide-y divide-line p-0">
          <Row icon={UserRound} label="Edit profile" detail={prefs.name || 'Name and photo'} onClick={openEdit} />
          <Row icon={Scale} label="Body weight" detail={prefs.weightKg ? `${prefs.weightKg} kg` : 'Not set (70 kg used)'} onClick={() => setOpen('weight')} />
          <Row icon={Camera} label="Camera settings" detail={prefs.facing === 'user' ? 'Front camera' : 'Back camera'} onClick={() => setOpen('camera')} />
          <div className="flex items-center gap-3 p-4">
            <Volume2 size={20} className="text-accent-fg" aria-hidden />
            <span className="flex-1">
              <span className="block font-medium">Sound feedback</span>
              <span className="text-xs text-muted">Muted by the iPhone silent switch</span>
            </span>
            <Toggle label="Sound feedback" checked={prefs.sound} onChange={(v) => prefs.set({ sound: v })} />
          </div>
          <Row icon={Database} label="Data management" detail={counts ? `${counts.workouts} workouts stored` : '…'} onClick={openData} />
          <Row icon={Info} label="About Quasy" onClick={() => setOpen('about')} />
        </Card>
      </section>

      <Dialog
        open={open === 'edit'}
        onClose={close}
        title="Edit profile"
        actions={
          <>
            <Button full onClick={() => (prefs.set({ name: draftName.trim().slice(0, 40), photo: draftPhoto }), close())}>
              Save
            </Button>
            <Button full variant="secondary" onClick={close}>
              Cancel
            </Button>
          </>
        }
      >
        <div className="flex items-center gap-4 text-fg">
          <Avatar photo={draftPhoto} />
          <div className="flex flex-col items-start gap-1">
            <Button variant="secondary" onClick={() => fileRef.current?.click()}>
              {draftPhoto ? 'Change photo' : 'Add photo'}
            </Button>
            {draftPhoto && (
              <Button variant="ghost" onClick={() => setDraftPhoto(null)}>
                Remove photo
              </Button>
            )}
          </div>
        </div>
        {photoError && <p className="mt-2 text-danger">{photoError}</p>}
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          aria-label="Choose profile photo"
          onChange={async (e) => {
            const f = e.target.files?.[0]
            e.target.value = ''
            if (!f) return
            try {
              setDraftPhoto(await toAvatar(f))
              setPhotoError(null)
            } catch {
              setPhotoError('This image could not be opened. Try another photo.')
            }
          }}
        />
        <label className="mt-4 block">
          <span className="text-muted">Name</span>
          <input
            value={draftName}
            onChange={(e) => setDraftName(e.target.value)}
            maxLength={40}
            placeholder="Your name"
            className="mt-1 h-12 w-full rounded-2xl bg-surface-2 px-4 text-base text-fg outline-none focus:ring-2 focus:ring-accent-fg"
          />
        </label>
      </Dialog>

      <Dialog open={open === 'weight'} onClose={close} title="Body weight" actions={<Button full onClick={close}>Done</Button>}>
        Used only to estimate calories.
        <div className="-mx-4 mt-2 text-fg">
          <WeightField />
        </div>
      </Dialog>

      <Dialog open={open === 'camera'} onClose={close} title="Camera settings" actions={<Button full onClick={close}>Done</Button>}>
        Camera that opens first on Workout Setup. You can still switch during setup.
        <div className="mt-4 flex gap-2" role="group" aria-label="Default camera">
          <Choice selected={prefs.facing === 'user'} onClick={() => prefs.set({ facing: 'user' })}>Front</Choice>
          <Choice selected={prefs.facing === 'environment'} onClick={() => prefs.set({ facing: 'environment' })}>Back</Choice>
        </div>
      </Dialog>

      <Dialog
        open={open === 'data'}
        onClose={close}
        title="Data management"
        actions={
          <>
            <Button full variant="danger" disabled={!counts?.workouts} onClick={() => setOpen('confirmClear')}>
              Delete all workout data
            </Button>
            <Button full variant="secondary" onClick={close}>
              Close
            </Button>
          </>
        }
      >
        All data stays on this device. Nothing is uploaded.
        <dl className="mt-4 grid grid-cols-3 gap-2 text-center">
          <Stat k="Workouts" v={counts ? String(counts.workouts) : '…'} />
          <Stat k="Tests" v={counts ? String(counts.tests) : '…'} />
          <Stat k="Storage" v={storage ?? '—'} />
        </dl>
        {cleared && <p role="status" className="mt-3 font-semibold text-success">All workout data was deleted.</p>}
      </Dialog>

      <Dialog
        open={open === 'confirmClear'}
        onClose={() => setOpen('data')}
        title="Delete all workout data?"
        actions={
          <>
            <Button
              full
              variant="danger"
              onClick={async () => {
                await db.workouts.clear()
                setCleared(true)
                setOpen('data')
              }}
            >
              Delete everything
            </Button>
            <Button full variant="secondary" onClick={() => setOpen('data')}>
              Cancel
            </Button>
          </>
        }
      >
        This permanently removes {counts?.workouts ?? 0} workouts, benchmark tests, records and history from this device. It cannot be
        undone. Your profile and settings are kept.
      </Dialog>

      <Dialog open={open === 'about'} onClose={close} title="About Quasy" actions={<Button variant="secondary" full onClick={close}>Close</Button>}>
        <p>Quasy turns your phone camera into a jump rope workout tracker.</p>
        <p className="mt-2">
          Version 0.1 (MVP). Jumps are detected from body movement with on-device pose tracking; the rope itself is not tracked, and trips
          are detected as breaks in rhythm. Calories are estimates.
        </p>
      </Dialog>
    </Page>
  )
}

function Row({ icon: Icon, label, detail, onClick }: { icon: LucideIcon; label: string; detail?: ReactNode; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="flex w-full items-center gap-3 p-4 text-left hover:bg-surface-2">
      <Icon size={20} className="text-accent-fg" aria-hidden />
      <span className="flex-1">
        <span className="block font-medium">{label}</span>
        {detail && <span className="text-xs text-muted">{detail}</span>}
      </span>
      <ChevronRight size={18} className="text-muted" aria-hidden />
    </button>
  )
}

function Stat({ k, v }: { k: string; v: string }) {
  return (
    <div className="rounded-xl bg-surface-2 p-2">
      <dt className="text-[11px] uppercase tracking-wider text-muted">{k}</dt>
      <dd className="tabular text-lg font-bold text-fg">{v}</dd>
    </div>
  )
}
