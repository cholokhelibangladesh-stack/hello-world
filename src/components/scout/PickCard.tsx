import { motion, useReducedMotion } from "framer-motion";
import { CheckCircle2, Clock, Eye, FileText, Loader2, RotateCcw, X, XCircle } from "lucide-react";
import { safeMediaUrl } from "@/lib/sanitize";
import MessageButton from "@/pages/messages/MessageButton";

export type PickStatus = "pending" | "approved" | "rejected";

const STATUS = {
  approved: { label: "Approved", Icon: CheckCircle2, cls: "bg-[#5FD3B5]/35 text-white" },
  rejected: { label: "Declined", Icon: XCircle, cls: "bg-[#E5484D]/40 text-white" },
  pending: { label: "Pending", Icon: Clock, cls: "bg-white/20 text-white" },
} as const;

const Action = ({ label, onClick, busy, tone = "glass", children }: {
  label: string; onClick?: () => void; busy?: boolean; tone?: "glass" | "white" | "danger"; children: React.ReactNode;
}) => (
  <button type="button" onClick={(e) => { e.stopPropagation(); onClick?.(); }} disabled={busy} aria-label={label}
    className={`press flex h-10 flex-1 items-center justify-center gap-1 rounded-full text-[13px] font-semibold disabled:opacity-50 ${
      tone === "white" ? "bg-white text-[#0B1F26]" : tone === "danger" ? "bg-[#E5484D]/30 text-white" : "bg-white/15 text-white ring-1 ring-white/25"}`}>
    {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : children}
  </button>
);

/**
 * A player the scout picked, as a small glass photo card. Tapping it slides the photo up and reveals
 * what the scout can do next; tapping again (or another card) puts it back.
 */
const PickCard = ({ name, avatar, sport, status, open, onToggle, busy, playerId, onView, onDetails, onCancel, onRetry }: {
  name: string; avatar?: string | null; sport?: string | null; status: PickStatus; open: boolean; onToggle: () => void; busy?: boolean;
  playerId: string; onView: () => void; onDetails?: () => void; onCancel?: () => void; onRetry?: () => void;
}) => {
  const reduce = useReducedMotion();
  const s = STATUS[status];
  const initial = (name || "?").trim().charAt(0).toUpperCase();
  const lift = status === "approved" ? -102 : -56;

  return (
    <div className="relative aspect-[3/4] overflow-hidden rounded-[24px] bg-[#0B1F26] shadow-[0_18px_40px_-22px_rgba(11,31,38,0.7)]" data-testid="pick-card" data-status={status}>
      {/* Options, revealed when the photo slides up */}
      <div className="absolute inset-x-0 bottom-0 space-y-1.5 p-2.5" aria-hidden={!open} inert={!open ? true : undefined}>
        {status === "approved" && (
          <div className="flex gap-1.5">
            <div className="flex-1 empty:hidden [&>a]:h-10 [&>a]:w-full [&>a]:rounded-full [&>a]:bg-white [&>a]:text-[13px] [&>a]:font-semibold [&>a]:text-[#0B1F26]" onClick={(e) => e.stopPropagation()}>
              <MessageButton otherId={playerId} className="press inline-flex items-center justify-center gap-1" />
            </div>
            {onDetails && <Action label="Details" onClick={onDetails}><FileText className="h-4 w-4" /> Details</Action>}
          </div>
        )}
        <div className="flex gap-1.5">
          <Action label="View profile" onClick={onView} tone={status === "approved" ? "glass" : "white"}><Eye className="h-4 w-4" /> Profile</Action>
          {status === "pending" && onCancel && <Action label="Cancel request" onClick={onCancel} busy={busy} tone="danger"><X className="h-4 w-4" /> Cancel</Action>}
          {status === "rejected" && onRetry && <Action label="Retry request" onClick={onRetry} busy={busy}><RotateCcw className="h-4 w-4" /> Retry</Action>}
        </div>
      </div>

      {/* The photo card itself */}
      <motion.button type="button" onClick={onToggle} aria-expanded={open} aria-label={`${name}, ${s.label}. ${open ? "Hide" : "Show"} options`}
        className="absolute inset-0 overflow-hidden rounded-[24px] text-left"
        initial={false}
        animate={{ y: open ? lift : 0 }}
        transition={reduce ? { duration: 0 } : { type: "spring", stiffness: 380, damping: 32 }}>
        {avatar ? (
          <img src={safeMediaUrl(avatar)} alt="" loading="lazy" decoding="async" className="absolute inset-0 h-full w-full object-cover" />
        ) : (
          <span aria-hidden className="absolute inset-0 grid place-items-center text-[56px] font-semibold text-white/85"
            style={{ background: "radial-gradient(70% 60% at 25% 20%, #7EC8FF 0%, transparent 70%), radial-gradient(70% 70% at 80% 80%, #13738F 0%, transparent 70%), #0E2A33" }}>{initial}</span>
        )}
        <span className="absolute inset-x-2 bottom-2 rounded-[18px] bg-black/30 px-3 py-2.5 text-white ring-1 ring-white/25 backdrop-blur-xl">
          <span className="block truncate text-[15px] font-semibold">{name}</span>
          <span className="mt-1 flex items-center justify-between gap-2">
            <span className="truncate text-[12px] capitalize text-white/70">{sport ?? ""}</span>
            <span className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${s.cls}`}>
              <s.Icon className="h-3 w-3" />{s.label}
            </span>
          </span>
        </span>
      </motion.button>
    </div>
  );
};

export default PickCard;
