import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowUp, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import SettingsShell from "@/components/settings/SettingsShell";
import { uniqueChannel } from "@/lib/realtime";

type Msg = { id: string; sender_id: string; receiver_id: string; content: string; created_at: string; read: boolean };

const timeLabel = (iso: string) => {
  const d = new Date(iso);
  return d.toDateString() === new Date().toDateString()
    ? d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })
    : d.toLocaleDateString([], { day: "numeric", month: "short" });
};

/**
 * Thread between a player/scout and the Cholo Kheli team. All messaging is admin-mediated:
 * the database only accepts messages to or from admins.
 */
const MessagesPage = () => {
  const { user } = useAuth();
  const [team, setTeam] = useState<string | null>(null);
  const [msgs, setMsgs] = useState<Msg[] | null>(null);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    if (!user) return;
    const { data, error } = await supabase
      .from("messages")
      .select("id, sender_id, receiver_id, content, created_at, read")
      .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
      .order("created_at", { ascending: true })
      .limit(200);
    if (error) { setMsgs([]); return; }
    setMsgs(data as Msg[]);
    const unread = (data as Msg[]).filter((m) => m.receiver_id === user.id && !m.read).map((m) => m.id);
    if (unread.length) await supabase.from("messages").update({ read: true }).in("id", unread);
  }, [user]);

  useEffect(() => {
    if (!user) return;
    supabase.rpc("get_support_contact" as never).then(({ data }) => {
      const row = (data as { user_id: string }[] | null)?.[0];
      setTeam(row?.user_id ?? null);
    });
    load();
    const ch = supabase
      .channel(uniqueChannel(`support-${user.id}`))
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages", filter: `receiver_id=eq.${user.id}` }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user, load]);

  useEffect(() => { endRef.current?.scrollIntoView({ block: "end" }); }, [msgs?.length]);

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    const content = draft.trim();
    if (!user || !content) return;
    // Reply to whichever admin wrote last; otherwise the team's support contact.
    const lastAdmin = [...(msgs ?? [])].reverse().find((m) => m.receiver_id === user.id)?.sender_id;
    const to = lastAdmin ?? team;
    if (!to) { toast.error("Messaging isn't available yet", { description: "Please use Help and feedback instead." }); return; }
    setSending(true);
    const { error } = await supabase.from("messages").insert({ sender_id: user.id, receiver_id: to, content: content.slice(0, 2000) });
    setSending(false);
    if (error) { toast.error("Message not sent", { description: "Check your connection and try again." }); return; }
    setDraft("");
    load();
  };

  return (
    <SettingsShell title="Messages" description="Talk to the Cholo Kheli team. Scouts never message players directly.">
      <div className="flex min-h-[50dvh] flex-col">
        <div className="flex-1 space-y-2 pb-4" aria-live="polite">
          {msgs === null && <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" aria-label="Loading messages" /></div>}
          {msgs?.length === 0 && (
            <p className="py-12 text-center text-[15px] text-muted-foreground">No messages yet. Ask the team anything about your account, a scout request or safety.</p>
          )}
          {msgs?.map((m) => {
            const mine = m.sender_id === user?.id;
            return (
              <div key={m.id} className={`flex flex-col ${mine ? "items-end" : "items-start"}`}>
                {!mine && <span className="footnote mb-0.5 px-3">Cholo Kheli Team</span>}
                <div className={`max-w-[80%] whitespace-pre-wrap break-words px-3.5 py-2 text-[16px] leading-snug ${mine ? "chat-bubble-own bg-primary text-primary-foreground" : "chat-bubble-other bg-card"}`}>
                  {m.content}
                </div>
                <span className="mt-0.5 px-2 text-[11px] text-muted-foreground">{timeLabel(m.created_at)}</span>
              </div>
            );
          })}
          <div ref={endRef} />
        </div>
        <form onSubmit={send} className="ios-bar sticky bottom-[calc(3.75rem+env(safe-area-inset-bottom))] -mx-4 flex items-end gap-2 border-t border-border/70 px-4 py-2">
          <label htmlFor="msg" className="sr-only">Message</label>
          <textarea
            id="msg" rows={1} maxLength={2000} value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="Message"
            className="max-h-32 min-h-[40px] flex-1 resize-none rounded-[20px] border border-border bg-card px-4 py-2 text-[16px] outline-none focus:ring-2 focus:ring-ring"
          />
          <button type="submit" disabled={!draft.trim() || sending} aria-label="Send" className="press grid h-10 w-10 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground disabled:opacity-40">
            {sending ? <Loader2 className="h-5 w-5 animate-spin" /> : <ArrowUp className="h-5 w-5" strokeWidth={2.5} />}
          </button>
        </form>
      </div>
    </SettingsShell>
  );
};
export default MessagesPage;
