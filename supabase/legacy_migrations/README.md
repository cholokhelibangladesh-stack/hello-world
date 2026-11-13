# Legacy migrations (not applied)

These seven files (Feb–Mar 2026) belong to the Supabase project this app used
*before* the 2026-06-29 re-baseline. The migrations from
`20260629155738_*` onward recreate the whole schema from an empty database
(for example they create `messages.recipient_id` and then rename it), so they
cannot run on top of these files, and the live project was built from the
June 29 files onward.

They were moved out of `supabase/migrations/` so that `supabase db reset`,
new environments and CI can rebuild the schema. Kept only for history.

Before deleting them for good, confirm with
`supabase migration list --linked` that none of these versions appear in the
live project's migration history.
