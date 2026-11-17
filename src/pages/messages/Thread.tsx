import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "@tanstack/react-router";
import { motion, useMotionValue, useTransform } from "framer-motion";
import { ChevronLeft, Copy, CornerUpLeft, Flag, Loader2, Lock, MoreHorizontal, Pin, PinOff, SendHorizontal, ShieldCheck, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { safeMediaUrl } from "@/lib/sanitize";
import { haptic } from "@/lib/native";
import { uniqueChannel } from "@/lib/realtime";
import BottomSheet from "@/components/social/BottomSheet";
import { fetchConversations, type Conversation } from "./Inbox";

type Msg = {
  id: string; conversation_id: string; sender_id: string; body: string; reply_to_id: string | null;
  pinned_at: string | null; deleted_at: string | null; created_at: string;
};
type Reaction = { message_id: string; user_id: string; emoji: string };
export const EMOJI = ["❤️", "👍", "😂", "😮", "😢", "🔥", "👏", "⚽"];
const SWIPE = 56;

const dayLabel = (iso: string) => {
  const d = new Date(iso), now = new Date();
  const days = Math.round((new Date(now.toDateString()).getTime() - new Date(d.toDateString()).getTime()) / 86_400_000);
  return days === 0 ? "Today" : days === 1 ? "Yesterday" : d.toLocaleDateString([], { day: "numeric", month: "short", year: d.getFullYear() === now.getFullYear() ? undefined : "numeric" });
};
const clock = (iso: string) => new Date(iso).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });

/** One message. Swipe right to reply, double-tap to heart, press and hold for reactions and more. */
const Bubble = ({ m, mine, canAct, quoted, quotedName, reactions, myId, removedText, highlight, onReply, onHeart, onMenu, onJump, onToggleReaction }: {
  m: Msg; mine: boolean; canAct: boolean; quoted: Msg | null | undefined; quotedName: string; reactions: Reaction[]; myId?: string;
  removedText?: string; highlight: boolean;
  onReply: () => void; onHeart: () => void; onMenu: () => void; onJump: (id: string) => void; onToggleReaction: (emoji: string) => void;
}) => {
  const x = useMotionValue(0);
  const hint = useTransform(x, [0, SWIPE], [0, 1]);
  const hold = useRef<number | undefined>(undefined);
  const lastTap = useRef(0);
  const moved = useRef(false);
  const deleted = !!m.deleted_at;
  const grouped = useMemo(() => {
    const map = new Map<string, { n: number; mine: boolean }>();
    reactions.forEach((r) => { const g = map.get(r.emoji) ?? { n: 0, mine: false }; g.n++; if (r.user_id === myId) g.mine = true; map.set(r.emoji, g); });
    return [...map.entries()];
  }, [reactions, myId]);

  const startHold = () => { moved.current = false; window.clearTimeout(hold.current); hold.current = window.setTimeout(() => { if (!moved.current) { haptic("medium"); onMenu(); } }, 420); };
  const endHold = () => window.clearTimeout(hold.current);
  const tap = () => {
    if (!canAct || deleted) return;
    const now = Date.now();
    if (now - lastTap.current < 300) { lastTap.current = 0; onHeart(); } else lastTap.current = now;
  };

  return (
    <li id={`m-${m.id}`} data-mine={mine} className={`relative flex ${mine ? "justify-end" : "justify-start"} ${grouped.length ? "mb-5" : "mb-1"}`}>
      <motion.span style={{ opacity: hint, scale: hint }} aria-hidden="true"
        className="pointer-events-none absolute left-1 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-full bg-secondary text-muted-foreground">
        <CornerUpLeft className="h-4 w-4" />
      </motion.span>
      <motion.div
        style={{ x }} data-no-swipe
        drag={canAct && !deleted ? "x" : false} dragDirectionLock dragConstraints={{ left: 0, right: 0 }} dragElastic={{ left: 0, right: 0.35 }} dragSnapToOrigin
        onDragStart={() => { moved.current = true; endHold(); }}
        onDragEnd={(_, info) => { if (info.offset.x > SWIPE) { haptic("light"); onReply(); } }}
        onPointerDown={canAct && !deleted ? startHold : undefined} onPointerUp={endHold} onPointerLeave={endHold} onPointerCancel={endHold}
        onContextMenu={(e) => { if (canAct && !deleted) { e.preventDefault(); onMenu(); } }}
        onClick={tap}
        className={`relative max-w-[78%] select-none ${highlight ? "animate-pulse" : ""}`}
      >
        <div className={`rounded-[20px] px-3.5 py-2 text-[16px] leading-snug ${deleted ? "border border-border bg-transparent italic text-muted-foreground"
          : mine ? "bg-primary text-primary-foreground" : "bg-secondary text-foreground"} ${highlight ? "ring-2 ring-primary/50" : ""}`}>
          {quoted !== undefined && m.reply_to_id && !deleted && (
            <button type="button" onClick={(e) => { e.stopPropagation(); if (quoted) onJump(quoted.id); }}
              className={`mb-1.5 block w-full rounded-[10px] border-l-[3px] px-2 py-1 text-left text-[13px] ${mine ? "border-white/70 bg-white/15" : "border-primary bg-background/60"}`}>
              <span className="block font-semibold">{quotedName}</span>
              <span className="line-clamp-2 opacity-80">{!quoted ? "Message unavailable" : quoted.deleted_at ? "Message unsent" : quoted.body}</span>
            </button>
          )}
          {deleted ? (removedText !== undefined ? <span>Unsent: <span className="not-italic text-foreground">{removedText}</span></span> : "Message unsent")
            : <span translate="no" className="whitespace-pre-wrap break-words">{m.body}</span>}
          <span className={`ml-2 inline-flex translate-y-0.5 items-center gap-1 text-[11px] ${deleted ? "" : mine ? "text-white/70" : "text-muted-foreground"}`}>
            {m.pinned_at && <Pin className="h-3 w-3" aria-label="Pinned" />}{clock(m.created_at)}
          </span>
        </div>
        {grouped.length > 0 && (
          <div className={`absolute -bottom-4 flex gap-1 ${mine ? "right-2" : "left-2"}`}>
            {grouped.map(([emoji, g]) => (
              <button key={emoji} type="button" aria-label={`${emoji} ${g.n}${g.mine ? ", tap to remove" : ""}`} aria-pressed={g.mine}
                onClick={(e) => { e.stopPropagation(); if (canAct) onToggleReaction(emoji); }}
                className={`flex h-6 items-center gap-0.5 rounded-full border px-1.5 text-[13px] shadow-sm ${g.mine ? "border-primary bg-accent" : "border-border bg-card"}`}>
                <span>{emoji}</span>{g.n > 1 && <span className="text-[11px] font-semibold text-foreground">{g.n}</span>}
              </button>
            ))}
          </div>
        )}
      </motion.div>
    </li>
  );
};

const Thread = () => {
  const { id } = useParams({ strict: false }) as { id: string };
  const { user, role } = useAuth();
  const navigate = useNavigate();
  useEffect(() => () => document.documentElement.classList.remove("ck-typing"), []);
  const isAdmin = role === "admin";
  const [convo, setConvo] = useState<Conversation | null | undefined>(undefined);
  const [msgs, setMsgs] = useState<Msg[] | null>(null);
  const [reactions, setReactions] = useState<Reaction[]>([]);
  const [removed, setRemoved] = useState<Record<string, string>>({});
  const [text, setText] = useState("");
  const [replyTo, setReplyTo] = useState<Msg | null>(null);
  const [menuFor, setMenuFor] = useState<Msg | null>(null);
  const [adminMenu, setAdminMenu] = useState(false);
  const [closeReason, setCloseReason] = useState("");
  const [sending, setSending] = useState(false);
  const [flash, setFlash] = useState<string | null>(null);
  const [pinIndex, setPinIndex] = useState(0);
  const listRef = useRef<HTMLUListElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const participant = !!user && !!convo && [convo.scout_id, convo.player_id].includes(user.id);
  const canAct = participant && convo?.status === "open";
  const toBottom = (smooth = false) => requestAnimationFrame(() => listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: smooth ? "smooth" : "auto" }));
  const markRead = useCallback(() => {
    if (!participant) return;
    supabase.rpc("dm_mark_read" as never, { _conversation_id: id } as never).then(() => window.dispatchEvent(new Event("ck:dm-read")));
  }, [id, participant]);

  const loadConvo = useCallback(async () => {
    const all = await fetchConversations();
    setConvo(all.find((c) => c.id === id) ?? null);
  }, [id]);
  const loadReactions = useCallback(async (ids: string[]) => {
    if (!ids.length) { setReactions([]); return; }
    const { data } = await supabase.from("message_reactions" as never).select("message_id, user_id, emoji").in("message_id", ids);
    setReactions((data ?? []) as unknown as Reaction[]);
  }, []);

  useEffect(() => {
    if (!user) return;
    let alive = true;
    loadConvo();
    (async () => {
      const { data } = await supabase.from("direct_messages" as never)
        .select("id, conversation_id, sender_id, body, reply_to_id, pinned_at, deleted_at, created_at")
        .eq("conversation_id", id).order("created_at", { ascending: false }).limit(300);
      if (!alive) return;
      const list = ((data ?? []) as unknown as Msg[]).reverse();
      setMsgs(list);
      loadReactions(list.map((m) => m.id));
      toBottom();
      if (isAdmin && list.some((m) => m.deleted_at)) {
        const { data: rm } = await supabase.from("direct_message_removals" as never).select("message_id, body").in("message_id", list.filter((m) => m.deleted_at).map((m) => m.id));
        if (alive) setRemoved(Object.fromEntries(((rm ?? []) as unknown as { message_id: string; body: string }[]).map((r) => [r.message_id, r.body])));
      }
    })();
    const ch = supabase.channel(uniqueChannel(`dm-${id}`))
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "direct_messages", filter: `conversation_id=eq.${id}` }, (p) => {
        const m = p.new as Msg;
        setMsgs((prev) => (prev && !prev.some((x) => x.id === m.id) ? [...prev, m] : prev));
        toBottom(true);
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "direct_messages", filter: `conversation_id=eq.${id}` }, (p) => {
        const m = p.new as Msg;
        setMsgs((prev) => prev?.map((x) => (x.id === m.id ? { ...x, ...m } : x)) ?? prev);
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "message_reactions" }, () => {
        setMsgs((prev) => { if (prev) loadReactions(prev.map((m) => m.id)); return prev; });
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "conversations", filter: `id=eq.${id}` }, loadConvo)
      .subscribe();
    return () => { alive = false; supabase.removeChannel(ch); };
  }, [id, user?.id, isAdmin]); // eslint-disable-line react-hooks/exhaustive-deps

  // Opening the thread, or a new message arriving while it's open, marks it read.
  useEffect(() => { if (msgs && participant) markRead(); }, [msgs?.length, participant]); // eslint-disable-line react-hooks/exhaustive-deps

  const byId = useMemo(() => new Map((msgs ?? []).map((m) => [m.id, m])), [msgs]);
  const pinned = useMemo(() => (msgs ?? []).filter((m) => m.pinned_at && !m.deleted_at).sort((a, b) => (a.pinned_at! < b.pinned_at! ? 1 : -1)), [msgs]);
  const nameOf = (uid: string) => (uid === user?.id ? "You" : !convo ? "" : uid === convo.scout_id ? convo.scout_name ?? "Scout" : convo.player_name ?? "Player");

  const jump = (mid: string) => {
    document.getElementById(`m-${mid}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
    setFlash(mid); window.setTimeout(() => setFlash((f) => (f === mid ? null : f)), 1400);
  };

  const send = async () => {
    const body = text.trim();
    if (!user || !body || !canAct || sending) return;
    setSending(true);
    const { data, error } = await supabase.from("direct_messages" as never)
      .insert({ conversation_id: id, sender_id: user.id, body, reply_to_id: replyTo?.id ?? null } as never)
      .select("id, conversation_id, sender_id, body, reply_to_id, pinned_at, deleted_at, created_at").single();
    setSending(false);
    if (error) {
      toast.error("Message not sent", { description: error.message.includes("too many") ? "You're sending very fast. Wait a moment."
        : error.code === "42501" ? "This conversation isn't open for messages." : "Check your connection and try again." });
      loadConvo();
      return;
    }
    const m = data as unknown as Msg;
    setMsgs((prev) => (prev?.some((x) => x.id === m.id) ? prev : [...(prev ?? []), m]));
    setText(""); setReplyTo(null); toBottom(true);
    inputRef.current?.focus();
  };

  const react = async (m: Msg, emoji: string) => {
    if (!user || !canAct) return;
    const mineNow = reactions.find((r) => r.message_id === m.id && r.user_id === user.id);
    const rest = reactions.filter((r) => !(r.message_id === m.id && r.user_id === user.id));
    if (mineNow?.emoji === emoji) {
      setReactions(rest);
      await supabase.from("message_reactions" as never).delete().eq("message_id", m.id).eq("user_id", user.id);
    } else {
      setReactions([...rest, { message_id: m.id, user_id: user.id, emoji }]);
      const { error } = await supabase.from("message_reactions" as never).upsert({ message_id: m.id, user_id: user.id, emoji } as never, { onConflict: "message_id,user_id" });
      if (error) { setReactions(reactions); toast.error("Couldn't add that reaction"); }
    }
    haptic("light");
  };

  const togglePin = async (m: Msg) => {
    const { data, error } = await supabase.rpc("dm_toggle_pin" as never, { _message_id: m.id } as never);
    if (error) { toast.error(error.message.includes("up to 3") ? "You can pin up to 3 messages" : "Couldn't pin that message", { description: error.message.includes("up to 3") ? "Unpin one first." : undefined }); return; }
    setMsgs((prev) => prev?.map((x) => (x.id === m.id ? { ...x, pinned_at: data ? new Date().toISOString() : null } : x)) ?? prev);
    toast.success(data ? "Message pinned" : "Message unpinned");
  };
  const unsend = async (m: Msg) => {
    const { error } = await supabase.rpc("dm_delete_message" as never, { _message_id: m.id } as never);
    if (error) { toast.error("Couldn't unsend"); return; }
    setMsgs((prev) => prev?.map((x) => (x.id === m.id ? { ...x, body: "", deleted_at: new Date().toISOString(), pinned_at: null } : x)) ?? prev);
    setReactions((r) => r.filter((x) => x.message_id !== m.id));
  };
  const report = async (m: Msg) => {
    const { error } = await supabase.rpc("report_message" as never, { _message_id: m.id, _reason: "Reported from the conversation" } as never);
    if (error) toast.error("Report not sent", { description: error.message.includes("too many") ? "You've sent several reports recently." : undefined });
    else toast.success("Reported to the Cholo Kheli team", { description: "They can see this conversation and will review it." });
  };
  const setStatus = async (open: boolean) => {
    const { error } = await supabase.rpc("admin_set_conversation_status" as never, { _conversation_id: id, _open: open, _reason: open ? null : closeReason.trim() } as never);
    if (error) { toast.error("That didn't work", { description: error.message }); return; }
    toast.success(open ? "Conversation reopened" : "Conversation closed", { description: "Both people have been told." });
    setAdminMenu(false); setCloseReason(""); loadConvo();
  };

  if (convo === null) {
    return (
      <div className="px-8 py-20 text-center">
        <h1 className="title-2">Conversation unavailable</h1>
        <p className="mt-2 text-[15px] text-muted-foreground">It may have been removed, or you're not part of it.</p>
        <Link to="/messages" className="press mt-5 inline-flex h-11 items-center rounded-full bg-primary px-5 text-[15px] font-semibold text-primary-foreground">Back to messages</Link>
      </div>
    );
  }

  const title = isAdmin && !participant ? `${convo?.scout_name ?? "Scout"} and ${convo?.player_name ?? "Player"}` : convo?.other_name ?? "";
  const shownPin = pinned[pinIndex % Math.max(1, pinned.length)];
  let lastDay = "";

  return (
    <div className="fixed inset-0 z-[45] mx-auto flex w-full max-w-[430px] flex-col bg-background md:max-w-[680px] lg:sticky lg:top-0 lg:z-auto lg:h-[100dvh] lg:max-w-none lg:bg-transparent">
      <header className="ios-bar shrink-0 border-b border-border/70" style={{ paddingTop: "env(safe-area-inset-top)" }}>
        <div className="flex h-14 items-center gap-1 px-1">
          <button type="button" onClick={() => navigate({ to: "/messages" })} aria-label="Back to messages" className="press grid h-10 w-9 place-items-center text-primary"><ChevronLeft className="h-7 w-7" /></button>
          <Link to={`/resume/${isAdmin ? convo?.player_id : convo?.other_id}` as never} className="flex min-w-0 flex-1 items-center gap-2.5">
            <span className="h-9 w-9 shrink-0 overflow-hidden rounded-full bg-secondary">
              {convo?.other_avatar ? <img src={safeMediaUrl(convo.other_avatar)} alt="" className="h-full w-full object-cover" />
                : <span className="grid h-full w-full place-items-center font-semibold text-muted-foreground">{title.charAt(0)}</span>}
            </span>
            <span className="min-w-0">
              <span className="flex items-center gap-1 truncate text-[16px] font-semibold">{title}{!isAdmin && convo?.other_is_scout && <ShieldCheck className="h-4 w-4 shrink-0 text-primary" aria-label="Verified scout" />}</span>
              <span className="block truncate text-[12px] text-muted-foreground">{isAdmin ? "Admin view, read only" : convo?.other_is_scout ? "Verified scout" : convo?.other_username ? `@${convo.other_username}` : "Player"}</span>
            </span>
          </Link>
          {isAdmin && <button type="button" onClick={() => setAdminMenu(true)} aria-label="Conversation options" className="press grid h-10 w-10 place-items-center text-primary"><MoreHorizontal className="h-6 w-6" /></button>}
        </div>
        {shownPin && (
          <button type="button" onClick={() => { jump(shownPin.id); setPinIndex((i) => i + 1); }} className="flex w-full items-center gap-2 border-t border-border/70 px-4 py-2 text-left">
            <Pin className="h-4 w-4 shrink-0 text-primary" />
            <span className="min-w-0 flex-1">
              <span className="block text-[12px] font-semibold text-primary">Pinned{pinned.length > 1 ? ` ${(pinIndex % pinned.length) + 1} of ${pinned.length}` : ""}</span>
              <span className="block truncate text-[14px]">{shownPin.body}</span>
            </span>
          </button>
        )}
      </header>

      <ul ref={listRef} aria-live="polite" className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 py-3">
        <li className="mx-auto mb-4 flex max-w-[300px] items-start gap-2 rounded-2xl bg-secondary px-3 py-2 text-[12px] leading-snug text-muted-foreground">
          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
          <span>The Cholo Kheli team approved this conversation and can read it. Don't share phone numbers, addresses or payments here.</span>
        </li>
        {msgs === null ? <li className="grid place-items-center py-10"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></li>
          : msgs.map((m) => {
            const day = dayLabel(m.created_at);
            const sep = day !== lastDay; lastDay = day;
            const q = m.reply_to_id ? byId.get(m.reply_to_id) ?? null : undefined;
            return (
              <Fragment key={m.id}>
                {sep && <li className="my-3 text-center text-[12px] font-medium text-muted-foreground">{day}</li>}
                {isAdmin && !participant && <li className={`mb-0.5 px-2 text-[11px] font-semibold text-muted-foreground ${m.sender_id === convo?.scout_id ? "text-right" : ""}`}>{nameOf(m.sender_id)}</li>}
                <Bubble m={m} mine={isAdmin && !participant ? m.sender_id === convo?.scout_id : m.sender_id === user?.id} canAct={!!canAct}
                  quoted={q} quotedName={q ? nameOf(q.sender_id) : ""} reactions={reactions.filter((r) => r.message_id === m.id)} myId={user?.id}
                  removedText={isAdmin ? removed[m.id] : undefined} highlight={flash === m.id}
                  onReply={() => { setReplyTo(m); inputRef.current?.focus(); }} onHeart={() => react(m, "❤️")} onMenu={() => setMenuFor(m)}
                  onJump={jump} onToggleReaction={(e) => react(m, e)} />
              </Fragment>
            );
          })}
        {msgs?.length === 0 && <li className="py-8 text-center text-[15px] text-muted-foreground">{canAct ? "No messages yet. Say hello." : "No messages yet."}</li>}
      </ul>

      {convo?.status === "closed" ? (
        <p className="shrink-0 border-t border-border/70 px-4 py-3 text-center text-[14px] text-muted-foreground" style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 12px + var(--thread-nav, 0px))" }}>
          <Lock className="mr-1 inline h-4 w-4" />This conversation was closed by the Cholo Kheli team{convo.closed_reason ? `: ${convo.closed_reason}` : "."}
        </p>
      ) : isAdmin && !participant ? (
        <p className="shrink-0 border-t border-border/70 px-4 py-3 text-center text-[14px] text-muted-foreground" style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 12px + var(--thread-nav, 0px))" }}>You're viewing as an admin. Use the menu to close this conversation.</p>
      ) : (
        <div className="shrink-0 border-t border-border/70 bg-background" style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + var(--thread-nav, 0px))" }}>
          {replyTo && (
            <div className="flex items-center gap-2 border-b border-border/70 px-4 py-2">
              <CornerUpLeft className="h-4 w-4 shrink-0 text-primary" />
              <span className="min-w-0 flex-1 border-l-[3px] border-primary pl-2">
                <span className="block text-[12px] font-semibold text-primary">Replying to {nameOf(replyTo.sender_id) === "You" ? "yourself" : nameOf(replyTo.sender_id)}</span>
                <span className="block truncate text-[14px] text-muted-foreground">{replyTo.body}</span>
              </span>
              <button type="button" onClick={() => setReplyTo(null)} aria-label="Cancel reply" className="grid h-8 w-8 place-items-center text-muted-foreground"><X className="h-4 w-4" /></button>
            </div>
          )}
          <form className="flex items-end gap-2 px-3 py-2" onSubmit={(e) => { e.preventDefault(); send(); }}>
            <label htmlFor="dm-input" className="sr-only">Message</label>
            <textarea id="dm-input" ref={inputRef}
              onFocus={() => document.documentElement.classList.add("ck-typing")}
              onBlur={() => window.setTimeout(() => { if (document.activeElement?.id !== "dm-input") document.documentElement.classList.remove("ck-typing"); }, 200)} rows={1} maxLength={2000} value={text} disabled={!canAct}
              onChange={(e) => { setText(e.target.value); e.target.style.height = "auto"; e.target.style.height = Math.min(e.target.scrollHeight, 120) + "px"; }}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey && !("ontouchstart" in window)) { e.preventDefault(); send(); } }}
              placeholder={canAct ? "Message…" : "Messaging isn't available right now"}
              className="max-h-[120px] min-h-[40px] flex-1 resize-none rounded-[20px] bg-secondary px-4 py-2.5 text-[16px] outline-none focus:ring-2 focus:ring-ring" />
            <button type="submit" disabled={!text.trim() || sending || !canAct} aria-label="Send"
              onMouseDown={(e) => e.preventDefault()}
              className="press grid h-10 w-10 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground disabled:opacity-40">
              {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <SendHorizontal className="h-4 w-4" />}
            </button>
          </form>
        </div>
      )}

      {/* press-and-hold menu */}
      <BottomSheet open={!!menuFor} onClose={() => setMenuFor(null)} title="Message" height="auto">
        {menuFor && (
          <div className="p-3">
            <div className="mb-3 flex justify-between rounded-full bg-secondary px-2 py-1.5" role="group" aria-label="React">
              {EMOJI.map((e) => {
                const on = reactions.some((r) => r.message_id === menuFor.id && r.user_id === user?.id && r.emoji === e);
                return (
                  <button key={e} type="button" aria-label={`React ${e}`} aria-pressed={on} onClick={() => { react(menuFor, e); setMenuFor(null); }}
                    className={`press grid h-10 w-10 place-items-center rounded-full text-[24px] ${on ? "bg-card shadow" : ""}`}>{e}</button>
                );
              })}
            </div>
            <div className="ios-group">
              <button type="button" className="ios-row w-full text-left text-[16px]" onClick={() => { setReplyTo(menuFor); setMenuFor(null); window.setTimeout(() => inputRef.current?.focus(), 250); }}>
                <CornerUpLeft className="h-5 w-5 text-primary" /><span className="flex-1">Reply</span></button>
              <button type="button" className="ios-row w-full text-left text-[16px]" onClick={() => { togglePin(menuFor); setMenuFor(null); }}>
                {menuFor.pinned_at ? <PinOff className="h-5 w-5 text-primary" /> : <Pin className="h-5 w-5 text-primary" />}<span className="flex-1">{menuFor.pinned_at ? "Unpin" : "Pin"}</span></button>
              <button type="button" className="ios-row w-full text-left text-[16px]" onClick={() => { navigator.clipboard?.writeText(menuFor.body).then(() => toast.success("Copied")).catch(() => {}); setMenuFor(null); }}>
                <Copy className="h-5 w-5 text-primary" /><span className="flex-1">Copy</span></button>
              {menuFor.sender_id === user?.id ? (
                <button type="button" className="ios-row w-full text-left text-[16px] text-destructive" onClick={() => { unsend(menuFor); setMenuFor(null); }}>
                  <Trash2 className="h-5 w-5" /><span className="flex-1">Unsend</span></button>
              ) : (
                <button type="button" className="ios-row w-full text-left text-[16px] text-destructive" onClick={() => { report(menuFor); setMenuFor(null); }}>
                  <Flag className="h-5 w-5" /><span className="flex-1">Report</span></button>
              )}
            </div>
          </div>
        )}
      </BottomSheet>

      {/* admin controls */}
      <BottomSheet open={adminMenu} onClose={() => setAdminMenu(false)} title="Conversation" height="auto">
        <div className="space-y-3 p-4">
          {convo?.status === "open" ? (
            <>
              <label htmlFor="close-reason" className="block text-[13px] font-medium text-muted-foreground">Reason for closing, shown to both people</label>
              <input id="close-reason" value={closeReason} onChange={(e) => setCloseReason(e.target.value)} maxLength={300} placeholder="For example: asked for personal contact details"
                className="h-11 w-full rounded-xl bg-secondary px-4 text-[16px] outline-none focus:ring-2 focus:ring-ring" />
              <button type="button" disabled={!closeReason.trim()} onClick={() => setStatus(false)} className="press h-12 w-full rounded-full bg-destructive text-[16px] font-semibold text-white disabled:opacity-40">Close conversation</button>
            </>
          ) : (
            <button type="button" onClick={() => setStatus(true)} className="press h-12 w-full rounded-full bg-primary text-[16px] font-semibold text-primary-foreground">Reopen conversation</button>
          )}
          <div className="ios-group">
            <Link to={`/resume/${convo?.player_id}` as never} className="ios-row text-[16px]">Open {convo?.player_name ?? "player"}'s profile</Link>
          </div>
        </div>
      </BottomSheet>
    </div>
  );
};

export default Thread;
