import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { safeMediaUrl } from "@/lib/sanitize";

/**
 * Player videos, verification documents and admin media live in private Storage buckets.
 * Rows store a stable URL (".../storage/v1/object/public/<bucket>/<path>") or a bare path;
 * at display time we exchange it for a short-lived signed URL. Storage policies decide who
 * gets one (owner, admins, verified scouts/players for public accounts), so a private
 * account's files can't be fetched just by knowing the link.
 */
const PRIVATE_BUCKETS = new Set(["player-videos", "documents", "media"]);
const STORAGE_URL = /\/storage\/v1\/object\/(?:public|sign|authenticated)\/([^/]+)\/([^?#]+)/;
const TTL_SECONDS = 60 * 60;

export type StorageRef = { bucket: string; path: string };

/** Extracts {bucket, path} from a stored Supabase Storage URL (or "bucket/path" pair). */
export function storageRef(url: string | null | undefined, fallbackBucket?: string): StorageRef | null {
  if (!url) return null;
  const m = url.match(STORAGE_URL);
  if (m && PRIVATE_BUCKETS.has(m[1])) return { bucket: m[1], path: decodeURIComponent(m[2]) };
  if (fallbackBucket && !/^[a-z]+:/i.test(url) && !url.startsWith("/")) return { bucket: fallbackBucket, path: url };
  return null;
}

/** Stable public-style URL to store in rows; never directly fetchable for private buckets. */
export function storageUrl(bucket: string, path: string): string {
  return supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl;
}

const cache = new Map<string, { url: string; expires: number }>();
const inflight = new Map<string, Promise<string | undefined>>();

/** Returns a playable URL for any stored media URL (signed if it points at a private bucket). */
export async function resolveMediaUrl(url: string | null | undefined, fallbackBucket?: string): Promise<string | undefined> {
  const ref = storageRef(url ?? undefined, fallbackBucket);
  if (!ref) return safeMediaUrl(url);
  const key = `${ref.bucket}/${ref.path}`;
  const hit = cache.get(key);
  if (hit && hit.expires > Date.now() + 60_000) return hit.url;
  const pending = inflight.get(key);
  if (pending) return pending;
  const p = (async () => {
    const { data, error } = await supabase.storage.from(ref.bucket).createSignedUrl(ref.path, TTL_SECONDS);
    inflight.delete(key);
    if (error || !data?.signedUrl) return undefined;
    cache.set(key, { url: data.signedUrl, expires: Date.now() + TTL_SECONDS * 1000 });
    return data.signedUrl;
  })();
  inflight.set(key, p);
  return p;
}

/** React hook: resolves a stored media URL; `undefined` while loading or when access is denied. */
export function useMediaUrl(url: string | null | undefined, fallbackBucket?: string) {
  const [state, setState] = useState<{ src?: string; loading: boolean; failed: boolean }>({ loading: !!url, failed: false });
  useEffect(() => {
    let alive = true;
    if (!url) { setState({ loading: false, failed: false }); return; }
    setState((s) => ({ ...s, loading: true }));
    resolveMediaUrl(url, fallbackBucket).then((src) => {
      if (alive) setState({ src, loading: false, failed: !src });
    });
    return () => { alive = false; };
  }, [url, fallbackBucket]);
  return state;
}

/** Removes a stored object given the URL saved in a row (no-op for non-storage URLs). */
export async function removeStoredObject(url: string | null | undefined, fallbackBucket?: string) {
  const ref = storageRef(url, fallbackBucket);
  if (!ref) return;
  await supabase.storage.from(ref.bucket).remove([ref.path]);
  cache.delete(`${ref.bucket}/${ref.path}`);
}
