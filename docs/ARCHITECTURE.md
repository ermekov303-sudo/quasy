# Architecture (short)

Client-only SPA (Vite + React 19 + TS + Tailwind 4). No backend; all data in IndexedDB (Dexie) and localStorage.

## Data flow
camera (`camera/useVideoSource`) → `vision/` MediaPipe pose → body-height signal → `detection/jumpDetector` (jumps, rest, trips) → `workout/` Zustand store → `storage/` Dexie → `metrics/` (pure) → screens.

## Layers
- `camera/`, `vision/`, `detection/`, `metrics/`, `workout/`, `storage/`: logic. `detection/` and `metrics/` are pure and tested (Vitest).
- `tricks/` + `screens/tricks/`: Trick Library (25 fixed tricks, manual learning status).
- `screens/`: Home, Progress, Tricks, Records, Profile (tabs); Workout (Setup+Live in one component); Summary.
- `ui/`: shared components (Page, Card, StatCard, Dialog, Button, BottomNav/TabLayout...). Reuse them.

## Responsive layout
- Mobile-first. `ui/Page.tsx` widens: `max-w-md` → `md:max-w-3xl` → `lg:max-w-5xl`.
- `ui/BottomNav.tsx` (`TabLayout`): bottom bar on phones, fixed left side nav (w-56, content `md:pl-56`) from 768px.
- Workout: from 1024px camera (left, sticky) and setup/live panel (right) side by side.
- Home: today/week cards in 2 columns from 1024px.

## Routes
`/` `/progress` `/tricks` `/records` `/profile` (tab layout); `/workout/setup`, `/workout/live` (one `WorkoutScreen`); `/workout/:id` Summary.
