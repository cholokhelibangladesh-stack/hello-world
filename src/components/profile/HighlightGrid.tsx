import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Eye, Film, Heart, Pencil, Trash2, X } from "lucide-react";
import StorageVideo from "@/components/StorageVideo";
import { formatCount } from "@/lib/taxonomy";

export type Highlight = {
  id: string; title: string | null; description: string | null; video_url: string | null; status: string;
  flagged?: boolean | null; flag_reason?: string | null; view_count?: number; like_count?: number; created_at: string;
};

const badge = (h: Highlight) =>
  h.status === "rejected" ? { text: "Removed", cls: "bg-destructive text-white" }
  : h.flagged ? { text: "In review", cls: "bg-amber-500 text-white" }
  : h.status !== "live" ? { text: "Processing", cls: "bg-black/60 text-white" }
  : null;

/** Three-column grid of highlights with a full-screen player. Owners can delete from the player. */
const HighlightGrid = ({ items, onDelete, onEdit, emptyText, emptyTitle = "No highlights yet" }: { items: Highlight[]; onDelete?: (h: Highlight) => void; onEdit?: (h: Highlight) => void; emptyText: string; emptyTitle?: string }) => {
  const [open, setOpen] = useState<Highlight | null>(null);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(null);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => { window.removeEventListener("keydown", onKey); document.body.style.overflow = prev; };
  }, [open]);

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 px-6 py-14 text-center">
        <span className="grid h-14 w-14 place-items-center rounded-full border-2 border-foreground/80"><Film className="h-6 w-6" /></span>
        <p className="headline">{emptyTitle}</p>
        <p className="footnote">{emptyText}</p>
      </div>
    );
  }

  return (
    <>
      <ul className="grid grid-cols-3 gap-[2px]">
        {items.map((h) => {
          const b = badge(h);
          return (
            <li key={h.id}>
              <button type="button" onClick={() => h.video_url && setOpen(h)} aria-label={`Play ${h.title ?? "highlight"}`}
                className="relative block aspect-[3/4] w-full overflow-hidden bg-secondary">
                <StorageVideo src={h.video_url} fragment="#t=1" muted playsInline preload="metadata" className="absolute inset-0 h-full w-full object-cover" />
                {b && <span className={`absolute left-1.5 top-1.5 rounded-full px-2 py-0.5 text-[11px] font-semibold ${b.cls}`}>{b.text}</span>}
                <span className="absolute bottom-1 left-1.5 flex items-center gap-1 text-[12px] font-semibold text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.7)]">
                  <Eye className="h-3.5 w-3.5" /> {formatCount(h.view_count ?? 0)}
                </span>
              </button>
            </li>
          );
        })}
      </ul>

      {open && typeof document !== "undefined" && createPortal(
        <div role="dialog" aria-modal="true" aria-label={open.title ?? "Highlight"} className="fixed inset-0 z-[90] mx-auto flex max-w-[430px] flex-col bg-black text-white shadow-[0_0_0_100vmax_rgba(0,0,0,0.88)] md:max-w-[520px]">
          <div className="flex items-center justify-between px-2" style={{ paddingTop: "calc(env(safe-area-inset-top) + 6px)" }}>
            <button type="button" onClick={() => setOpen(null)} aria-label="Close" className="press grid h-11 w-11 place-items-center"><X className="h-6 w-6" /></button>
            <span className="flex-1" />
            {onEdit && (
              <button type="button" aria-label="Edit highlight" className="press grid h-11 w-11 place-items-center"
                onClick={() => { const h = open; setOpen(null); onEdit(h); }}>
                <Pencil className="h-5 w-5" />
              </button>
            )}
            {onDelete && (
              <button type="button" aria-label="Delete highlight" className="press grid h-11 w-11 place-items-center text-[#FF6B6B]"
                onClick={() => { const h = open; setOpen(null); onDelete(h); }}>
                <Trash2 className="h-5 w-5" />
              </button>
            )}
          </div>
          <div className="relative min-h-0 flex-1">
            <StorageVideo key={open.id} src={open.video_url} autoPlay controls playsInline loop className="absolute inset-0 h-full w-full object-contain" />
          </div>
          <div className="space-y-1 px-4 py-3" style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 12px)" }}>
            {open.title && <p className="headline">{open.title}</p>}
            {open.description && <p className="text-[14px] text-white/80">{open.description}</p>}
            {open.status === "rejected" && open.flag_reason && <p className="text-[14px] text-[#FF8A8A]">Removed: {open.flag_reason}</p>}
            <p className="flex gap-4 text-[13px] text-white/70">
              <span className="inline-flex items-center gap-1"><Eye className="h-4 w-4" /> {formatCount(open.view_count ?? 0)}</span>
              <span className="inline-flex items-center gap-1"><Heart className="h-4 w-4" /> {formatCount(open.like_count ?? 0)}</span>
            </p>
          </div>
        </div>,
        document.body,
      )}
    </>
  );
};

export default HighlightGrid;
