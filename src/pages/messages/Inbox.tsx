import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Loader2, Lock, MessageCircle, ShieldCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { safeMediaUrl } from "@/lib/sanitize";
import { timeAgo } from "@/lib/taxonomy";
import { uniqueChannel } from "@/lib/realtime";

export type Conversation = {
  id: string; status: "open" | "closed"; scout_id: string; player_id: string;
  other_id: string; other_name: string | null; other_username: string | null; other_avatar: string | null; other_is_scout: boolean;
  scout_name: string | null; player_name: string | null;
  last_body: string | null; last_sender: string | null; last_at: string; unread: number; closed_reason: string | null;
};

export async function fetchConversations(): Promise<Conversation[]> {
  const { data } = await supabase.rpc("get_conversations" as never);
  return (data ?? []) as unknown as Conversation[];
}

/** Total unread direct messages, kept live. Used for the badge in the top bar. */
export function useUnreadDms() {
  const { user, role } = useAuth();
  const [n, setN] = useState(0);
  useEffect(() => {
    if (!user || !role || role === "admin") { setN(0); return; }
    let alive = true;
    const load = () => fetchConversations().then((c) => alive && setN(c.reduce((a, x) => a + x.unread, 0)));
    load();
    const ch = supabase.channel(uniqueChannel("dm-badge"))
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "direct_messages" }, load)
      .on("postgres_changes", { event: "*", schema: "public", table: "conversations" }, load)
      .subscribe();
    const onFocus = () => load();
    window.addEventListener("focus", onFocus);
    window.addEventListener("ck:dm-read", onFocus);
    return () => { alive = false; supabase.removeChannel(ch); window.removeEventListener("focus", onFocus); window.removeEventListener("ck:dm-read", onFocus); };
  }, [user?.id, role]);
  return n;
}

const Inbox = () => {
  const { user, role } = useAuth();
  const isAdmin = role === "admin";
  const [rows, setRows] = useState<Conversation[] | null>(null);

  useEffect(() => {
    if (!user) return;
    let alive = true;
    const load = () => fetchConversations().then((c) => alive && setRows(c));
    load();
    const ch = supabase.channel(uniqueChannel("dm-inbox"))
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "direct_messages" }, load)
      .on("postgres_changes", { event: "*", schema: "public", table: "conversations" }, load)
      .subscribe();
    return () => { alive = false; supabase.removeChannel(ch); };
  }, [user?.id]);

  return (
    <div className="pb-6">
      <header className="px-4 pt-4">
        <h1 className="large-title">Messages</h1>
        <p className="mt-1 flex items-center gap-1.5 text-[14px] text-muted-foreground">
          <ShieldCheck className="h-4 w-4 shrink-0 text-primary" />
          {isAdmin ? "Every scout and player conversation. You can read and close them."
            : role === "scout" ? "You can message a player once the Cholo Kheli team approves your request."
            : "Only scouts approved by the Cholo Kheli team can message you. The team can see these chats."}
        </p>
      </header>

      {rows === null ? (
        <div className="grid place-items-center py-16"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      ) : rows.length === 0 ? (
        <div className="flex flex-col items-center gap-2 px-8 py-16 text-center">
          <span className="grid h-16 w-16 place-items-center rounded-full bg-secondary"><MessageCircle className="h-7 w-7 text-muted-foreground" /></span>
          <p className="headline mt-1">No conversations yet</p>
          <p className="footnote">
            {isAdmin ? "Approve a scout request to open one."
              : role === "scout" ? "Tap “Select player” on a highlight to send a request. A chat opens here when it's approved."
              : "When a verified scout is approved to contact you, the chat appears here."}
          </p>
          {role === "scout" && <Link to="/scout/explore" className="press mt-3 flex h-11 items-center rounded-full bg-primary px-5 text-[15px] font-semibold text-primary-foreground">Find players</Link>}
        </div>
      ) : (
        <ul className="mt-3">
          {rows.map((c) => {
            const title = isAdmin ? `${c.scout_name ?? "Scout"} and ${c.player_name ?? "Player"}` : c.other_name ?? "Account";
            const mine = c.last_sender === user?.id;
            return (
              <li key={c.id}>
                <Link to="/messages/$id" params={{ id: c.id }} className="flex items-center gap-3 px-4 py-2.5 active:bg-secondary">
                  <span className="h-14 w-14 shrink-0 overflow-hidden rounded-full bg-secondary">
                    {c.other_avatar ? <img src={safeMediaUrl(c.other_avatar)} alt="" className="h-full w-full object-cover" />
                      : <span className="grid h-full w-full place-items-center text-[20px] font-semibold text-muted-foreground">{(c.other_name ?? "?").charAt(0)}</span>}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-1.5">
                      <span className={`truncate text-[16px] ${c.unread ? "font-bold" : "font-medium"}`}>{title}</span>
                      {!isAdmin && c.other_is_scout && <ShieldCheck className="h-4 w-4 shrink-0 text-primary" aria-label="Verified scout" />}
                      {c.status === "closed" && <Lock className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-label="Closed" />}
                    </span>
                    <span className={`block truncate text-[14px] ${c.unread ? "font-semibold text-foreground" : "text-muted-foreground"}`}>
                      {c.last_sender === null ? "Say hello" : c.last_body === null ? "Message unsent" : `${mine ? "You: " : ""}${c.last_body}`}
                      <span className="font-normal text-muted-foreground"> · {timeAgo(c.last_at)}</span>
                    </span>
                  </span>
                  {c.unread > 0 && <span className="grid h-5 min-w-5 place-items-center rounded-full bg-primary px-1.5 text-[12px] font-bold text-primary-foreground" aria-label={`${c.unread} unread`}>{c.unread}</span>}
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
};

export default Inbox;
