import { useEffect } from 'react'
import { Navigate, useParams } from 'react-router'
import { trickProgress } from '../../metrics/trickLibrary'
import { useTrickStatus } from '../../tricks/trickStatus'
import { CATEGORIES, CATEGORY_META, TRICKS, type CategoryId } from '../../tricks/tricks'
import { Card } from '../../ui/Card'
import { Page } from '../../ui/Page'
import { ScreenHeader } from '../../ui/ScreenHeader'
import { CATEGORY_ICON, ProgressBar, SafetyNote, TrickCard } from './parts'

export function CategoryScreen() {
  const { id = '' } = useParams()
  const statuses = useTrickStatus((s) => s.statuses)
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [id])
  if (!CATEGORIES.includes(id as CategoryId)) return <Navigate to="/tricks" replace />

  const cat = id as CategoryId
  const m = CATEGORY_META[cat]
  const Icon = CATEGORY_ICON[cat]
  const tricks = TRICKS.filter((t) => t.category === cat)
  const { mastered, total } = trickProgress(tricks, statuses)

  return (
    <Page withNav key={cat}>
      <ScreenHeader title={m.label} backTo="/tricks" />
      <Card>
        <div className="flex items-center gap-3">
          <div className="grid size-11 place-items-center rounded-full bg-accent-soft text-accent-fg">
            <Icon size={22} aria-hidden />
          </div>
          <div className="flex-1 text-sm tabular">
            <span className="font-bold">{mastered}/{total}</span> <span className="text-muted">mastered</span>
          </div>
        </div>
        <p className="mt-3 text-sm text-muted">{m.description}</p>
        <div className="mt-3">
          <ProgressBar value={mastered} total={total} label={`${m.label} mastered`} />
        </div>
      </Card>
      {cat === 'power' && (
        <div className="mt-3">
          <SafetyNote />
        </div>
      )}
      <ul className="mt-4 grid gap-3 lg:grid-cols-2 2xl:grid-cols-3">
        {tricks.map((t) => <TrickCard key={t.id} trick={t} showCategory={false} />)}
      </ul>
    </Page>
  )
}
