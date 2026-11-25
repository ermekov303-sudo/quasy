import type { StatusMap, TrickStatus } from '../metrics/trickLibrary'

/** Pure merge rules for cloud sync (no network, no React). */

const RANK: Record<TrickStatus, number> = { 'not-started': 0, learning: 1, mastered: 2 }

export type RemoteMastery = { trick_id: string; status: TrickStatus }

/**
 * Trick statuses. `first` (first sync of this account on this device): keep the more advanced status of the two,
 * so nothing marked before signing in is lost. Later syncs: the cloud wins, except tricks changed here since the last sync.
 * `toPush` = every status that differs from the cloud after merging.
 */
export function mergeMastery(local: StatusMap, remote: RemoteMastery[], dirty: Set<string> | 'first') {
  const merged: StatusMap = { ...local }
  for (const r of remote) {
    const l = local[r.trick_id]
    if (dirty === 'first' ? !l || RANK[r.status] > RANK[l] : !dirty.has(r.trick_id)) merged[r.trick_id] = r.status
  }
  const cloud = new Map(remote.map((r) => [r.trick_id, r.status]))
  const toPush = Object.entries(merged).filter((e): e is [string, TrickStatus] => !!e[1] && cloud.get(e[0]) !== e[1])
  return { merged, toPush }
}

export type ProfileFields = { name: string; weightKg: number | null; photo: string | null }
export type RemoteProfile = { name: string; weight_kg: number | null; photo: string | null }

/**
 * Profile. No cloud row yet → this device's profile is uploaded. `first`: cloud fields that are set win, empty ones
 * are filled from this device. `dirty` (edited here since the last sync) → this device wins. `clean` → the cloud wins.
 */
export function mergeProfile(local: ProfileFields, remote: RemoteProfile | null, mode: 'first' | 'dirty' | 'clean') {
  if (!remote) return { merged: local, push: true }
  if (mode === 'dirty') return { merged: local, push: true }
  const cloud: ProfileFields = { name: remote.name, weightKg: remote.weight_kg, photo: remote.photo }
  if (mode === 'clean') return { merged: cloud, push: false }
  const merged: ProfileFields = { name: cloud.name || local.name, weightKg: cloud.weightKg ?? local.weightKg, photo: cloud.photo ?? local.photo }
  return { merged, push: merged.name !== cloud.name || merged.weightKg !== cloud.weightKg || merged.photo !== cloud.photo }
}
