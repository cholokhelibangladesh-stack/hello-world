import { supabase } from "@/integrations/supabase/client";
import { uniqueChannel } from "@/lib/realtime";

/**
 * One shared copy of the signed-in scout's player requests.
 * Every "Select" button reads from here, so a reels feed with hundreds of players opens
 * one query and one live subscription instead of one of each per reel.
 */
export type ScoutRequest = { id: string; status: "pending" | "approved" | "rejected" };

let scoutId: string | null = null;
let byPlayer = new Map<string, ScoutRequest>();
let loaded = false;
let channel: ReturnType<typeof supabase.channel> | null = null;
let refs = 0;
let teardownTimer: ReturnType<typeof setTimeout> | null = null;
const listeners = new Set<() => void>();

const emit = () => listeners.forEach((l) => l());

function teardown() {
  if (channel) supabase.removeChannel(channel);
  channel = null; scoutId = null; byPlayer = new Map(); loaded = false;
}

async function load(uid: string) {
  const { data, error } = await supabase.from("scout_requests").select("id, status, player_id").eq("scout_id", uid);
  if (scoutId !== uid) return;
  if (!error) byPlayer = new Map((data ?? []).map((r: any) => [r.player_id, { id: r.id, status: r.status }]));
  loaded = true;
  emit();
}

export function subscribeScoutRequests(uid: string, listener: () => void): () => void {
  if (teardownTimer) { clearTimeout(teardownTimer); teardownTimer = null; }
  if (scoutId !== uid) {
    teardown();
    scoutId = uid;
    void load(uid);
    channel = supabase
      .channel(uniqueChannel(`scout-req-${uid}`))
      .on("postgres_changes", { event: "*", schema: "public", table: "scout_requests", filter: `scout_id=eq.${uid}` }, (payload: any) => {
        if (payload.eventType === "DELETE") {
          const goneId = payload.old?.id;
          for (const [pid, r] of byPlayer) if (r.id === goneId) byPlayer.delete(pid);
        } else if (payload.new?.player_id) {
          byPlayer.set(payload.new.player_id, { id: payload.new.id, status: payload.new.status });
        }
        emit();
      })
      .subscribe();
  }
  listeners.add(listener);
  refs++;
  return () => {
    listeners.delete(listener);
    refs--;
    // Keep the subscription briefly so moving between screens doesn't reconnect.
    if (refs === 0) teardownTimer = setTimeout(() => { if (refs === 0) teardown(); }, 30_000);
  };
}

export const getScoutRequest = (playerId: string): ScoutRequest | null => byPlayer.get(playerId) ?? null;
export const scoutRequestsLoaded = () => loaded;
export function setScoutRequest(playerId: string, value: ScoutRequest | null) {
  if (value) byPlayer.set(playerId, value); else byPlayer.delete(playerId);
  emit();
}
