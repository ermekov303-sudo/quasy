import { Check, PlayCircle } from 'lucide-react'
import { useEffect } from 'react'
import { Link, Navigate, useParams } from 'react-router'
import { needsSafetyNote, relatedTricks, statusOf } from '../../metrics/trickLibrary'
import { useTrickStatus } from '../../tricks/trickStatus'
import { CATEGORY_META, TRICKS, type Trick } from '../../tricks/tricks'
import { Button } from '../../ui/Button'
import { Card, SectionTitle } from '../../ui/Card'
import { Page } from '../../ui/Page'
import { ScreenHeader } from '../../ui/ScreenHeader'
import { DifficultyBadge, SafetyNote, StatusPicker, TrickCard } from './parts'

/** Demo clip with its credit when the trick has one; otherwise an honest placeholder of the same size. */
function TutorialVideo({ trick }: { trick: Trick }) {
  const v = trick.video
  if (v)
    return (
      <figure>
        <video
          src={v.src}
          poster={v.poster}
          aria-label={`${trick.name} demo video`}
          controls
          muted
          loop
          autoPlay
          playsInline
          className="aspect-video w-full rounded-[var(--radius-card)] bg-surface object-contain"
        />
        <figcaption className="mt-2 text-xs text-muted">
          Demo: <a href={v.credit.url} target="_blank" rel="noreferrer" className="text-accent-fg underline underline-offset-2">{v.credit.label}</a>
          {v.credit.license && (
            <>
              ,{' '}
              <a href={v.credit.license.url} target="_blank" rel="noreferrer" className="underline underline-offset-2">{v.credit.license.name}</a>
            </>
          )}
        </figcaption>
      </figure>
    )
  return (
    <div className="grid aspect-video w-full place-items-center rounded-[var(--radius-card)] border border-dashed border-line bg-gradient-to-br from-accent-soft to-surface text-center">
      <div>
        <PlayCircle size={40} className="mx-auto text-muted" aria-hidden />
        <p className="mt-2 font-semibold">Tutorial video coming soon</p>
        <p className="text-xs text-muted">No video for this trick yet.</p>
      </div>
    </div>
  )
}

function RelatedList({ title, tricks }: { title: string; tricks: Trick[] }) {
  if (!tricks.length) return null
  return (
    <section className="mt-6">
      <SectionTitle>{title}</SectionTitle>
      <ul className="flex flex-col gap-3">
        {tricks.map((t) => <TrickCard key={t.id} trick={t} />)}
      </ul>
    </section>
  )
}

export function TrickScreen() {
  const { id } = useParams()
  const trick = TRICKS.find((t) => t.id === id)
  const status = useTrickStatus((s) => statusOf(s.statuses, id ?? ''))
  const setStatus = useTrickStatus((s) => s.setStatus)
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [id])
  if (!trick) return <Navigate to="/tricks" replace />

  const related = relatedTricks(TRICKS, trick)
  const cat = CATEGORY_META[trick.category]

  return (
    <Page withNav narrow key={trick.id}>
      <ScreenHeader title={trick.name} backTo={`/tricks/c/${trick.category}`} />
      <TutorialVideo trick={trick} />

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <DifficultyBadge level={trick.level} />
        <Link to={`/tricks/c/${trick.category}`} className="text-sm font-medium text-accent-fg underline-offset-2 hover:underline">
          {cat.label}
        </Link>
      </div>
      <p className="mt-3">{trick.description}</p>

      <Card className="mt-4">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted">What makes it challenging</h2>
        <p className="mt-2 text-sm">{trick.challenge}</p>
      </Card>
      {needsSafetyNote(trick) && (
        <div className="mt-3">
          <SafetyNote />
        </div>
      )}

      <section className="mt-6">
        <SectionTitle>Learning progress</SectionTitle>
        <Card>
          <StatusPicker trick={trick} />
          <Button full className="mt-4" disabled={status === 'mastered'} onClick={() => setStatus(trick.id, 'mastered')}>
            {status === 'mastered' ? <><Check size={18} aria-hidden /> Mastered</> : 'Mark as Mastered'}
          </Button>
          <p className="mt-3 text-xs text-muted">Status is set by you. Camera trick detection (beta) never changes it.</p>
        </Card>
      </section>

      <RelatedList title={`More ${cat.label}`} tricks={related.sameCategory} />
      <RelatedList title="Next difficulty level" tricks={related.nextLevel} />
    </Page>
  )
}
