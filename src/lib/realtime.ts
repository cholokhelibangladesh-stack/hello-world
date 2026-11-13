/**
 * Realtime channel names must be unique per subscription: supabase-js reuses an existing
 * channel with the same topic, and adding listeners to an already-subscribed channel throws
 * ("cannot add postgres_changes callbacks ... after subscribe()"). That crashed Scout Explore
 * whenever two cards for the same player were mounted.
 */
let seq = 0;
export const uniqueChannel = (name: string) => `${name}:${Date.now().toString(36)}${(seq++).toString(36)}`;
