-- Stage 2: keep the avatar (a 256 px JPEG, ~40 KB as text) in the profile row instead of a Storage bucket.
-- Same protection as the rest of the row: only its owner can read it.
alter table public.profiles drop column photo_path;
alter table public.profiles add column photo text check (
  photo is null or (char_length(photo) <= 150000 and photo like 'data:image/jpeg;base64,%')
);
