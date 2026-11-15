import { useEffect, useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { ChevronRight, Loader2, Lock, MessageCircle, Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { fetchConversations, type Conversation } from "@/pages/messages/Inbox";
import { timeAgo } from "@/lib/taxonomy";
import { uniqueChannel } from "@/lib/realtime";

/**
 * Every scout and player conversation, as horizontal glass cards. Opening one shows the full chat,
 * where an admin can read it, see reports and close it.
 */
const AdminSafety = () => {
  const [rows, setRows] = useState<Conversation[] | null>(null);
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<"all" | "open" | "closed">("all");

  useEffect(() => {
    let alive = true;
    const load = () => fetchConversations().then((c) => alive && setRows(c));
    load();
    const ch = supabase.channel(uniqueChannel("admin-safety"))
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "direct_messages" }, load)
      .on("postgres_changes", { event: "*", schema: "public", table: "conversations" }, load)
      .subscribe();
    return () => { alive = false; supabase.removeChannel(ch); };
  }, []);

  const shown = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return (rows ?? []).filter((c) =>
      (filter === "all" || c.status === filter) &&
      (!needle || `${c.scout_name ?? ""} ${c.player_name ?? ""} ${c.last_body ?? ""}`.toLowerCase().includes(needle)));
  }, [rows, q, filter]);

  return (
    <div className="space-y-3">
      <div className="relative">
        <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by scout, player or message"
          aria-label="Search conversations"
          className="h-11 w-full rounded-full bg-card pl-10 pr-4 text-[15px] outline-none focus:ring-2 focus:ring-ring" />
      </div>
      <div className="flex gap-2" role="radiogroup" aria-label="Status">
        {(["all", "open", "closed"] as const).map((f) => (
          <button key={f} type="button" role="radio" aria-checked={filter === f} onClick={() => setFilter(f)}
            className={`press h-9 rounded-full px-4 text-[14px] font-medium capitalize ${filter === f ? "bg-primary text-primary-foreground" : "bg-card"}`}>{f}</button>
        ))}
      </div>

      {rows === null ? (
        <div className="grid h-32 place-items-center rounded-[22px] bg-card"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
      ) : shown.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-[22px] bg-card px-6 py-10 text-center">
          <MessageCircle className="h-7 w-7 text-muted-foreground" />
          <p className="text-[15px] font-medium">{rows.length ? "No conversations match" : "No conversations yet"}</p>
          <p className="text-[13px] text-muted-foreground">A conversation opens when you approve a scout's request.</p>
        </div>
      ) : (
        <ul className="space-y-2">
          {shown.map((c) => (
            <li key={c.id}>
              <Link to="/messages/$id" params={{ id: c.id }} className="press flex items-center gap-3 rounded-[22px] bg-card p-3.5">
                <span aria-hidden className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-[#5FD3B5]/25 text-[#0F7A60]">
                  <MessageCircle className="h-5 w-5" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-1.5">
                    <span className="truncate text-[15px] font-semibold">{c.scout_name ?? "Scout"} → {c.player_name ?? "Player"}</span>
                    {c.status === "closed" && <Lock className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-label="Closed" />}
                  </span>
                  <span className="block truncate text-[13px] text-muted-foreground">
                    {c.last_sender === null ? "No messages yet" : c.last_body ?? "Message unsent"} · {timeAgo(c.last_at)}
                  </span>
                </span>
                <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default AdminSafety;
