import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { StatusMap, TrickStatus } from '../metrics/trickLibrary'

// Persisted Zustand (localStorage) over Dexie: 25 tiny values, synchronous reads, no DB migration.
type Store = { statuses: StatusMap; setStatus: (id: string, s: TrickStatus) => void }

export const useTrickStatus = create<Store>()(
  persist(
    (set) => ({
      statuses: {},
      setStatus: (id, s) => set((st) => ({ statuses: { ...st.statuses, [id]: s } })),
    }),
    { name: 'quasy-tricks' },
  ),
)
