# Optional cross-device sync with Supabase — plan

Status: **plan only.** Nothing is configured, no keys exist, no data leaves the device. Implementing it needs the owner's Supabase project, its URL + anon key, and explicit approval.

## Principles
- **Dexie stays the app's database.** Every screen keeps reading IndexedDB. Supabase is a backup and sync target, so the app works fully offline and without an account.
- **An account is optional.** Without signing in, nothing changes from today.
- **Never uploaded:** camera video, frames, pose landmarks. Only the numbers the app already saves (jumps timestamps, totals, trick events).
- One new dependency when implemented: `@supabase/supabase-js`. The client gets only the public anon key (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` in Vercel). The service-role key never ships to the browser.

## Authentication
- Supabase Auth with an email magic link (no password stored by Quasy). Google/Apple sign-in can be added later.
- Sign-in lives on Profile: "Sync across devices", with a sign-out option and a "Delete cloud data" action.

## Data model (Postgres)
| Table | Key | Columns (main) | Source today |
|---|---|---|---|
| `profiles` | `id uuid` = `auth.uid()` | `name`, `weight_kg`, `photo_path`, `updated_at` | `quasy-setup` (localStorage) |
| `workouts` | `id uuid` (the client's `crypto.randomUUID()`) | `user_id`, `started_at`, `ended_at`, `elapsed_ms`, `active_ms`, `total_jumps`, `avg_jpm`, `max_jpm`, `max_streak`, `calories`, `target`, `planned_ms`, `weight_kg`, `benchmark_ms`, `lost_breaks`, `tracking_loss_ms`, `log jsonb` (jumps/trips/pauses), `updated_at`, `deleted_at` | Dexie `workouts` |
| `trick_events` | unique `(workout_id, trick_id, start_ms)` | `user_id`, `workout_id` → `workouts` (on delete cascade), `trick_id` (check: one of the 8 recognized ids), `start_ms`, `end_ms`, `score` | `WorkoutRecord.tricks` |
| `trick_mastery` | `(user_id, trick_id)` | `status` (`not-started`/`learning`/`mastered`), `updated_at` | `quasy-tricks` (localStorage) |

- Avatar photo: private Storage bucket `avatars/{user_id}/avatar.jpg` (it's already a 256 px JPEG).
- Old workouts without `tricks` upload with no `trick_events` rows. They stay "no data", never "0 tricks".
- `trick_events` and `trick_mastery` stay separate: detection never writes mastery.

## Row Level Security
- RLS enabled on every table. No table is readable or writable without a policy.
- `workouts`, `trick_events`, `trick_mastery`: select/insert/update/delete only where `user_id = auth.uid()`. `user_id` defaults to `auth.uid()`, and a `with check` rule stops anyone writing rows for another user.
- `profiles`: only `id = auth.uid()`.
- Storage: the object path must start with `auth.uid()`.
- Deleting the account removes all rows (cascade) and the avatar.

## Offline sync and duplicate prevention
1. **Local first.** A finished workout is saved to Dexie exactly as today. A Dexie schema bump adds an `outbox` table (`table`, `key`, `updatedAt`).
2. **Push.** When signed in and online (app start, `online` event, after END WORKOUT, tab becomes visible), the outbox is sent with `upsert … on conflict (id)`. A workout and its trick events go in one RPC, so they land together or not at all. Retries use backoff.
3. **No duplicates.**
   - Workout ids are UUIDs made on the device, so a retried upload overwrites the same row.
   - Trick events have a natural unique key.
   - Mastery has one row per trick.
   - `finish()` is already idempotent by id.
4. **Pull.** Fetch rows where `updated_at > lastPulledAt` (kept per device) and merge them into Dexie by id.
5. **Conflicts.**
   - Finished workouts are immutable, so they never conflict.
   - Profile and mastery use last-write-wins on `updated_at`.
   - Deletes are soft (`deleted_at`), so another device learns about them.
6. **First sign-in on a device that already has data.** Upload all local rows (idempotent), then pull. Two devices' histories merge with no duplicates.

## Rollout (each step small, tested, needs approval)
1. The owner creates the Supabase project and shares the URL + anon key. Then the SQL schema and RLS are applied and checked with two test accounts: user A must not see user B.
2. Sign-in on Profile, plus profile and mastery sync.
3. Workout + trick-event push and pull with the outbox. Tests for the merge and dedupe logic (pure functions in `src/storage/`).
4. Delete account / delete cloud data, and a short privacy note (weight and photo are personal data).

## Cost and limits
- The free tier is enough. One workout is roughly 5–15 KB of JSON (mostly jump timestamps).
- Sync is eventual: a workout appears on the other device after both have been online.
