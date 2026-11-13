import { useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Loader2, MessageCircleOff, SendHorizontal, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { safeMediaUrl } from "@/lib/sanitize";
import { timeAgo } from "@/lib/taxonomy";
import { uniqueChannel } from "@/lib/realtime";
import BottomSheet from "./BottomSheet";

type Comment = {
  id: string; user_id: string; body: string; created_at: string;
  author?: { full_name: string | null; username: string | null; avatar_url: string | null };
};

type Props = {
  open: boolean; onClose: () => void;
  videoId: string; videoOwnerId: string; enabled: boolean;
  onCountChange?: (delta: number) => void;
};

const CommentsSheet = ({ open, onClose, videoId, videoOwnerId, enabled, onCountChange }: Props) => {
  const { user, role } = useAuth();
  const [comments, setComments] = useState<Comment[] | null>(null);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const listRef = useRef<HTMLUListElement>(null);

  const withAuthors = async (rows: Comment[]) => {
    const ids = [...new Set(rows.map((r) => r.user_id))];
    if (!ids.length) return rows;
    const { data } = await supabase.from("profiles").select("user_id, full_name, username, avatar_url").in("user_id", ids);
    const map = new Map((data ?? []).map((p) => [p.user_id, p]));
    return rows.map((r) => ({ ...r, author: map.get(r.user_id) as Comment["author"] }));
  };

  useEffect(() => {
    if (!open) return;
    let alive = true;
    setComments(null);
    (async () => {
      const { data } = await supabase.from("video_comments" as never)
        .select("id, user_id, body, created_at").eq("video_id", videoId)
        .order("created_at", { ascending: false }).limit(100);
      const rows = await withAuthors((data ?? []) as unknown as Comment[]);
      if (alive) setComments(rows);
    })();
    const ch = supabase.channel(uniqueChannel(`comments-${videoId}`))
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "video_comments", filter: `video_id=eq.${videoId}` },
        async (p) => {
          const [row] = await withAuthors([p.new as Comment]);
          setComments((prev) => (prev && !prev.some((c) => c.id === row.id) ? [row, ...prev] : prev));
        })
      .on("postgres_changes", { event: "DELETE", schema: "public", table: "video_comments" },
        (p) => setComments((prev) => prev?.filter((c) => c.id !== (p.old as Comment).id) ?? prev))
      .subscribe();
    return () => { alive = false; supabase.removeChannel(ch); };
  }, [open, videoId]); // eslint-disable-line react-hooks/exhaustive-deps

  const post = async () => {
    const body = text.trim();
    if (!user || !body) return;
    setBusy(true);
    const { data, error } = await supabase.from("video_comments" as never)
      .insert({ video_id: videoId, user_id: user.id, body } as never).select("id, user_id, body, created_at").single();
    setBusy(false);
    if (error) {
      toast.error("Comment not posted", {
        description: error.message.includes("too many") ? "You're commenting very fast. Wait a moment."
          : error.code === "42501" ? "Comments aren't available on this highlight." : "Check your connection and try again.",
      });
      return;
    }
    const [row] = await withAuthors([data as unknown as Comment]);
    setComments((prev) => (prev?.some((c) => c.id === row.id) ? prev : [row, ...(prev ?? [])]));
    setText("");
    onCountChange?.(1);
    listRef.current?.scrollTo({ top: 0, behavior: "smooth" });
  };

  const remove = async (c: Comment) => {
    const { error } = await supabase.from("video_comments" as never).delete().eq("id", c.id);
    if (error) { toast.error("Couldn't delete that comment"); return; }
    setComments((prev) => prev?.filter((x) => x.id !== c.id) ?? prev);
    onCountChange?.(-1);
  };

  const canDelete = (c: Comment) => user && (c.user_id === user.id || videoOwnerId === user.id || role === "admin");

  return (
    <BottomSheet open={open} onClose={onClose} title="Comments">
      <div className="flex h-full flex-col">
        <ul ref={listRef} className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-2" aria-live="polite">
          {comments === null ? (
            <li className="grid place-items-center py-12"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></li>
          ) : comments.length === 0 ? (
            <li className="py-12 text-center">
              <p className="headline">No comments yet</p>
              <p className="footnote mt-1">{enabled ? "Be the first to say something encouraging." : "Comments are turned off for this highlight."}</p>
            </li>
          ) : comments.map((c) => (
            <li key={c.id} className="group flex gap-3 py-2.5">
              <Link to={`/resume/${c.user_id}` as never} onClick={onClose} className="h-9 w-9 shrink-0 overflow-hidden rounded-full bg-secondary">
                {c.author?.avatar_url
                  ? <img src={safeMediaUrl(c.author.avatar_url)} alt="" className="h-full w-full object-cover" loading="lazy" />
                  : <span className="grid h-full w-full place-items-center text-[13px] font-semibold text-muted-foreground">{(c.author?.full_name ?? "?").charAt(0)}</span>}
              </Link>
              <div className="min-w-0 flex-1">
                <p className="text-[13px]">
                  <span className="font-semibold">{c.author?.username ? `@${c.author.username}` : c.author?.full_name ?? "Player"}</span>
                  <span className="ml-2 text-muted-foreground">{timeAgo(c.created_at)}</span>
                </p>
                <p className="whitespace-pre-line break-words text-[15px] leading-snug">{c.body}</p>
              </div>
              {canDelete(c) && (
                <button type="button" onClick={() => remove(c)} aria-label="Delete comment"
                  className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-muted-foreground hover:text-destructive">
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
            </li>
          ))}
        </ul>
        {enabled ? (
          <form className="flex shrink-0 items-end gap-2 border-t border-border/70 px-3 py-2" onSubmit={(e) => { e.preventDefault(); post(); }}>
            <label htmlFor="comment-input" className="sr-only">Add a comment</label>
            <textarea id="comment-input" value={text} rows={1} maxLength={500} onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); post(); } }}
              placeholder="Add a comment…"
              className="max-h-28 min-h-[40px] flex-1 resize-none rounded-[20px] bg-secondary px-4 py-2.5 text-[16px] outline-none focus:ring-2 focus:ring-ring" />
            <button type="submit" disabled={!text.trim() || busy} aria-label="Post comment"
              className="press grid h-10 w-10 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground disabled:opacity-40">
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <SendHorizontal className="h-4 w-4" />}
            </button>
          </form>
        ) : (
          <p className="flex shrink-0 items-center justify-center gap-2 border-t border-border/70 py-3 text-[14px] text-muted-foreground">
            <MessageCircleOff className="h-4 w-4" /> Comments are off
          </p>
        )}
      </div>
    </BottomSheet>
  );
};

export default CommentsSheet;
