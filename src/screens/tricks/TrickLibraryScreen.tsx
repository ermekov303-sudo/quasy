import { Search, SearchX } from 'lucide-react'
import { useSearchParams } from 'react-router'
import { filterTricks, trickProgress } from '../../metrics/trickLibrary'
import { useTrickStatus } from '../../tricks/trickStatus'
import { CATEGORIES, CATEGORY_META, LEVEL_META, LEVELS, TRICKS, type CategoryId } from '../../tricks/tricks'
import { Button } from '../../ui/Button'
import { Card, SectionTitle, StatCard } from '../../ui/Card'
import { Choice } from '../../ui/Choice'
import { EmptyState } from '../../ui/EmptyState'
import { Page } from '../../ui/Page'
import { CategoryCard, LevelMastery, ProgressBar, TrickCard } from './parts'

const pick = <T extends string>(list: readonly T[], v: string | null) => (list.includes(v as T) ? (v as T) : null)

export function TrickLibraryScreen() {
  // filters live in the URL, so going back from a trick keeps them
  const [params, setParams] = useSearchParams()
  const query = params.get('q') ?? ''
  const category = pick(CATEGORIES, params.get('cat'))
  const level = pick(LEVELS, params.get('level'))
  const setParam = (k: string, v: string | null) =>
    setParams((p) => {
      if (v) p.set(k, v)
      else p.delete(k)
      return p
    }, { replace: true })

  const statuses = useTrickStatus((s) => s.statuses)
  const p = trickProgress(TRICKS, statuses)
  const filtering = Boolean(query.trim() || category || level)
  const results = filterTricks(TRICKS, { query, category, level })

  return (
    <Page withNav>
      <header className="py-4">
        <h1 className="text-2xl font-extrabold uppercase tracking-tight">Trick Library</h1>
        <p className="text-sm text-muted">Explore. Learn. Master.</p>
      </header>

      <div className="grid gap-3 lg:grid-cols-2">
      <div className="grid grid-cols-3 gap-3">
        <StatCard label="Total Tricks" value={String(TRICKS.length)} />
        <StatCard label="Categories" value={String(CATEGORIES.length)} />
        <StatCard label="Difficulty Levels" value={String(LEVELS.length)} />
      </div>

      <Card>
        <div className="flex items-baseline justify-between">
          <span className="text-sm font-semibold">Your Progress</span>
          <span className="tabular font-bold">
            <span className="text-accent-fg">{p.mastered}</span> / {p.total} Mastered
          </span>
        </div>
        <div className="mt-3">
          <ProgressBar value={p.mastered} total={p.total} label="Tricks mastered" />
        </div>
        <div className="mt-4 grid grid-cols-3 gap-2 text-center">
          {[
            ['Mastered', p.mastered, 'text-success'],
            ['Learning', p.learning, 'text-accent-fg'],
            ['Not started', p.notStarted, 'text-fg'],
          ].map(([label, n, cls]) => (
            <div key={label} className="rounded-xl bg-surface-2 py-2">
              <div className={`tabular text-xl font-bold ${cls}`}>{n}</div>
              <div className="text-xs text-muted">{label}</div>
            </div>
          ))}
        </div>
        <p className="mt-3 text-xs text-muted">You set each trick's status yourself. Camera trick detection (beta) never changes it.</p>
      </Card>
      </div>

      <section className="mt-6" aria-label="Search and filters">
        <label className="relative block">
          <span className="sr-only">Search tricks</span>
          <Search size={18} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted" aria-hidden />
          <input
            type="search"
            value={query}
            onChange={(e) => setParam('q', e.target.value)}
            placeholder="Search tricks..."
            className="h-12 w-full rounded-full border border-line/60 bg-surface pl-11 pr-4 text-fg outline-none placeholder:text-muted focus:ring-2 focus:ring-accent-fg"
          />
        </label>
        <div role="group" aria-label="Category filter" className="-mx-4 mt-3 flex gap-2 overflow-x-auto px-4 pb-1 md:mx-0 md:flex-wrap md:px-0 [&>*]:shrink-0 [&>*]:whitespace-nowrap">
          <Choice selected={!category} onClick={() => setParam('cat', null)}>All categories</Choice>
          {CATEGORIES.map((c) => (
            <Choice key={c} selected={category === c} onClick={() => setParam('cat', category === c ? null : c)}>
              {CATEGORY_META[c].label}
            </Choice>
          ))}
        </div>
        <div role="group" aria-label="Difficulty filter" className="-mx-4 mt-2 flex gap-2 overflow-x-auto px-4 pb-1 md:mx-0 md:flex-wrap md:px-0 [&>*]:shrink-0 [&>*]:whitespace-nowrap">
          <Choice selected={!level} onClick={() => setParam('level', null)}>All levels</Choice>
          {LEVELS.map((l) => (
            <Choice key={l} selected={level === l} onClick={() => setParam('level', level === l ? null : l)}>
              <span className="mr-2 inline-block size-2.5 rounded-full" style={{ background: LEVEL_META[l].color }} aria-hidden />
              {LEVEL_META[l].label}
            </Choice>
          ))}
        </div>
        {filtering && (
          <Button variant="secondary" className="mt-3" onClick={() => setParams({}, { replace: true })}>
            Reset filters
          </Button>
        )}
      </section>

      {filtering ? (
        <section className="mt-6">
          <SectionTitle>{results.length} {results.length === 1 ? 'trick' : 'tricks'} found</SectionTitle>
          {results.length ? (
            <ul className="grid gap-3 lg:grid-cols-2 2xl:grid-cols-3">
              {results.map((t) => <TrickCard key={t.id} trick={t} />)}
            </ul>
          ) : (
            <EmptyState
              icon={SearchX}
              title="No tricks match"
              text="Try another name or remove a filter."
              action={<Button variant="secondary" onClick={() => setParams({}, { replace: true })}>Reset filters</Button>}
            />
          )}
        </section>
      ) : (
        <>
          <section className="mt-6">
            <SectionTitle>Categories</SectionTitle>
            <ul className="grid gap-3 lg:grid-cols-2 2xl:grid-cols-3">
              {CATEGORIES.map((c) => <CategoryCard key={c} id={c} mastered={p.byCategory[c].mastered} />)}
            </ul>
          </section>

          <div className="lg:grid lg:grid-cols-2 lg:gap-6">
          <section className="mt-6">
            <SectionTitle>Progress by category</SectionTitle>
            <Card className="flex flex-col gap-4">
              {CATEGORIES.map((c: CategoryId) => (
                <div key={c}>
                  <div className="mb-1.5 flex justify-between text-sm">
                    <span>{CATEGORY_META[c].label}</span>
                    <span className="tabular text-muted">{p.byCategory[c].mastered}/{p.byCategory[c].total}</span>
                  </div>
                  <ProgressBar value={p.byCategory[c].mastered} total={p.byCategory[c].total} label={`${CATEGORY_META[c].label} mastered`} />
                </div>
              ))}
            </Card>
          </section>

          <section className="mt-6">
            <SectionTitle>Progress by difficulty</SectionTitle>
            <Card>
              <LevelMastery />
            </Card>
          </section>
          </div>
        </>
      )}
    </Page>
  )
}
