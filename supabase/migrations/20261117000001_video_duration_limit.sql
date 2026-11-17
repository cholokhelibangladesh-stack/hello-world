-- Highlights are at most 60 seconds (edited and re-encoded in the app before upload).
-- The column records the clip length; the 50 MB bucket limit stays the hard cap on stored bytes.
alter table public.videos add column if not exists duration_seconds numeric(6,1);
alter table public.videos drop constraint if exists videos_duration_limit;
alter table public.videos add constraint videos_duration_limit
  check (duration_seconds is null or (duration_seconds > 0 and duration_seconds <= 61));
comment on column public.videos.duration_seconds is 'Clip length in seconds, at most 60 (edited in the app before upload).';
