import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { timeAgo } from "@/lib/taxonomy";

type Entry = { id: string; admin_id: string | null; action: string; target_user: string | null; target_video: string | null; reason: string | null; details: Record<string, unknown>; created_at: string };

const LABEL: Record<string, string> = {
  warn: "Warned", suspend: "Suspended", ban: "Banned", unban: "Lifted restriction for",
  remove_video: "Removed a highlight from", restore_video: "Restored a highlight for", notice: "Sent a notice",
};

/** Who did what, newest first. Written by the server for every moderation action. */
const AdminAuditLog = () => {
  const [rows, setRows] = useState<Entry[] | null>(null);
  const [names, setNames] = useState<Record<string, string>>({});
  const [filter, setFilter] = useState("all");
  useEffect(() => {
    (async () => {
      let q = supabase.from("admin_actions" as never).select("*").order("created_at", { ascending: false }).limit(200);
      if (filter !== "all") q = q.eq("action", filter);
      const { data } = await q;
      const list = (data ?? []) as unknown as Entry[];
      setRows(list);
      const ids = [...new Set(list.flatMap((r) => [r.admin_id, r.target_user]).filter(Boolean))] as string[];
      if (ids.length) {
        const { data: p } = await supabase.from("profiles").select("user_id, full_name, username").in("user_id", ids);
        setNames(Object.fromEntries((p ?? []).map((x) => [x.user_id, x.full_name || (x as { username?: string }).username || "Unknown"])));
      }
    })();
  }, [filter]);

  return (
    <div className="space-y-3">
      <div className="flex gap-2 overflow-x-auto [scrollbar-width:none]">
        {[["all", "Everything"], ["suspend", "Suspensions"], ["ban", "Bans"], ["warn", "Warnings"], ["remove_video", "Removed videos"], ["notice", "Notices"]].map(([v, l]) => (
          <button key={v} type="button" onClick={() => { setRows(null); setFilter(v); }} aria-pressed={filter === v}
            className={`press shrink-0 rounded-full px-3 py-1 text-[14px] ${filter === v ? "bg-primary text-primary-foreground" : "bg-secondary"}`}>{l}</button>
        ))}
      </div>
      {rows === null ? <div className="grid place-items-center py-10"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
        : rows.length === 0 ? <p className="py-10 text-center text-[15px] text-muted-foreground">No actions yet.</p>
        : (
          <ul className="ios-group">
            {rows.map((r) => (
              <li key={r.id} className="ios-row items-start">
                <div className="min-w-0 flex-1">
                  <p className="text-[15px]">
                    <span className="font-semibold">{r.admin_id ? names[r.admin_id] ?? "An admin" : "System"}</span>{" "}
                    {LABEL[r.action] ?? r.action}{" "}
                    {r.target_user && <Link to={`/resume/${r.target_user}` as never} className="font-semibold text-primary">{names[r.target_user] ?? "a user"}</Link>}
                    {r.action === "notice" && !r.target_user && <span>to {String(r.details?.recipients ?? "")} people</span>}
                  </p>
                  {r.reason && <p className="text-[14px] text-muted-foreground">{r.reason}</p>}
                  {r.details?.hours ? <p className="text-[13px] text-muted-foreground">For {Math.round(Number(r.details.hours) / 24)} days</p> : null}
                </div>
                <span className="shrink-0 text-[13px] text-muted-foreground">{timeAgo(r.created_at)}</span>
              </li>
            ))}
          </ul>
        )}
    </div>
  );
};

export default AdminAuditLog;
