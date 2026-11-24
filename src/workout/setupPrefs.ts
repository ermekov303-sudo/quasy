import { create } from 'zustand'
import { persist } from 'zustand/middleware'

/** Profile + last-used workout setup, remembered on this device (localStorage). */
type Prefs = {
  name: string
  photo: string | null // small JPEG data URL (resized to 256 px)
  facing: 'user' | 'environment' // default camera
  target: number | null
  plannedMs: number | null
  sound: boolean
  weightKg: number | null
  set: (p: Partial<Omit<Prefs, 'set'>>) => void
}

export const useSetupPrefs = create<Prefs>()(
  persist(
    (set) => ({
      name: '',
      photo: null,
      facing: 'user',
      target: null,
      plannedMs: null,
      sound: true,
      weightKg: null,
      set: (p) => set(p),
    }),
    { name: 'quasy-setup' },
  ),
)
