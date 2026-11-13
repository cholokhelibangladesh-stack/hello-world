import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { safeMediaUrl } from "@/lib/sanitize";
import BottomSheet from "./BottomSheet";

type Person = { user_id: string; full_name: string | null; username: string | null; avatar_url: string | null; sport: string | null };

/** Followers or following of a profile. Only people you're allowed to see are listed. */
const FollowListSheet = ({ userId, kind, onClose }: { userId: string; kind: "followers" | "following" | null; onClose: () => void }) => {
  const [people, setPeople] = useState<Person[] | null>(null);
  useEffect(() => {
    if (!kind) return;
    setPeople(null);
    (async () => {
      const col = kind === "followers" ? "followee_id" : "follower_id";
      const other = kind === "followers" ? "follower_id" : "followee_id";
      const { data } = await supabase.from("follows" as never).select(`${other}, created_at`).eq(col, userId)
        .order("created_at", { ascending: false }).limit(200);
      const ids = ((data ?? []) as Record<string, string>[]).map((r) => r[other]);
      if (!ids.length) { setPeople([]); return; }
      const { data: profs } = await supabase.from("profiles").select("user_id, full_name, username, avatar_url, sport").in("user_id", ids);
      const map = new Map((profs ?? []).map((p) => [p.user_id, p as Person]));
      setPeople(ids.map((id) => map.get(id)).filter(Boolean) as Person[]);
    })();
  }, [userId, kind]);

  return (
    <BottomSheet open={!!kind} onClose={onClose} title={kind === "followers" ? "Followers" : "Following"}>
      <ul className="h-full overflow-y-auto overscroll-contain">
        {people === null ? (
          <li className="grid place-items-center py-12"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></li>
        ) : people.length === 0 ? (
          <li className="py-12 text-center text-[15px] text-muted-foreground">{kind === "followers" ? "No followers yet." : "Not following anyone yet."}</li>
        ) : people.map((p) => (
          <li key={p.user_id}>
            <Link to={`/resume/${p.user_id}` as never} onClick={onClose} className="flex items-center gap-3 px-4 py-2.5 active:bg-secondary">
              <span className="h-11 w-11 shrink-0 overflow-hidden rounded-full bg-secondary">
                {p.avatar_url ? <img src={safeMediaUrl(p.avatar_url)} alt="" className="h-full w-full object-cover" loading="lazy" />
                  : <span className="grid h-full w-full place-items-center font-semibold text-muted-foreground">{(p.full_name ?? "?").charAt(0)}</span>}
              </span>
              <span className="min-w-0">
                <span className="block truncate text-[15px] font-semibold">{p.username ? `@${p.username}` : p.full_name}</span>
                <span className="block truncate text-[13px] text-muted-foreground">{p.full_name}{p.sport ? ` · ${p.sport}` : ""}</span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </BottomSheet>
  );
};

export default FollowListSheet;
