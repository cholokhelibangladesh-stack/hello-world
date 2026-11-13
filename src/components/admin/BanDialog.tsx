import { useEffect, useState } from "react";
import { toast } from "sonner";
import { AlertTriangle, Ban, Clock, Loader2, ShieldCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export type Action = "warn" | "suspend" | "ban" | "unban";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  targetUserId: string;
  targetName: string;
  /** Kept for older callers; scout and player records are both handled by the server. */
  scope?: "profile" | "scout";
  /** Pre-select an action (e.g. "unban" when the user is already banned). */
  initialAction?: Action;
  onDone?: (action: Action) => void;
}

const LENGTHS = [
  { hours: 24, label: "1 day" }, { hours: 72, label: "3 days" }, { hours: 168, label: "7 days" }, { hours: 720, label: "30 days" },
];
const REASONS = ["Abusive or bullying behaviour", "Uploading someone else's videos", "Fake or misleading profile", "Spam or scams", "Unsafe contact with young players"];

const ACTIONS: { value: Action; label: string; icon: typeof Ban; help: string }[] = [
  { value: "warn", label: "Warn", icon: AlertTriangle, help: "Sends a warning notice. Nothing is restricted." },
  { value: "suspend", label: "Suspend", icon: Clock, help: "Signs them out and blocks the account until the time runs out." },
  { value: "ban", label: "Ban", icon: Ban, help: "Signs them out and blocks the account until an admin lifts it." },
  { value: "unban", label: "Lift", icon: ShieldCheck, help: "Ends a suspension or ban and tells them." },
];

/** Warn, suspend, ban or lift a restriction. The user always gets a notice with the reason, and it's logged. */
const BanDialog = ({ open, onOpenChange, targetUserId, targetName, initialAction = "suspend", onDone }: Props) => {
  const [action, setAction] = useState<Action>(initialAction);
  const [reason, setReason] = useState("");
  const [note, setNote] = useState("");
  const [hours, setHours] = useState(168);
  const [busy, setBusy] = useState(false);
  useEffect(() => { if (open) { setAction(initialAction); setReason(""); setNote(""); setHours(168); } }, [open, initialAction]);

  const needsReason = action !== "unban";
  const submit = async () => {
    if (needsReason && !reason.trim()) { toast.error("Add a reason", { description: "The user sees it in the notice." }); return; }
    setBusy(true);
    const { error } = await supabase.rpc("admin_moderate_user" as never, {
      _target: targetUserId, _action: action, _reason: reason.trim() || null, _message: note.trim() || null,
      _hours: action === "suspend" ? hours : null,
    } as never);
    setBusy(false);
    if (error) { toast.error("That didn't work", { description: error.message }); return; }
    toast.success(
      action === "warn" ? `Warning sent to ${targetName}` : action === "suspend" ? `${targetName} suspended for ${LENGTHS.find((l) => l.hours === hours)?.label}`
        : action === "ban" ? `${targetName} banned` : `${targetName} can use Cholo Kheli again`,
      { description: action === "unban" ? undefined : "They've been sent a notice with your reason." },
    );
    onOpenChange(false);
    onDone?.(action);
  };

  const current = ACTIONS.find((a) => a.value === action)!;
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md rounded-[18px]">
        <DialogHeader>
          <DialogTitle>Moderate {targetName}</DialogTitle>
          <DialogDescription>{current.help}</DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-4 rounded-xl bg-secondary p-1" role="radiogroup" aria-label="Action">
          {ACTIONS.map((a) => (
            <button key={a.value} type="button" role="radio" aria-checked={action === a.value} onClick={() => setAction(a.value)}
              className={`flex h-12 flex-col items-center justify-center gap-0.5 rounded-[9px] text-[13px] font-medium ${action === a.value ? "bg-card shadow-[0_1px_3px_hsl(var(--foreground)/0.12)]" : "text-muted-foreground"} ${a.value === "ban" && action === a.value ? "text-destructive" : ""}`}>
              <a.icon className="h-4 w-4" />{a.label}
            </button>
          ))}
        </div>

        {action === "suspend" && (
          <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Length">
            {LENGTHS.map((l) => (
              <button key={l.hours} type="button" role="radio" aria-checked={hours === l.hours} onClick={() => setHours(l.hours)}
                className={`press rounded-full px-3.5 py-1.5 text-[15px] ${hours === l.hours ? "bg-primary text-primary-foreground" : "bg-secondary"}`}>{l.label}</button>
            ))}
          </div>
        )}

        {needsReason && (
          <div className="space-y-2">
            <label htmlFor="mod-reason" className="block text-[13px] font-medium text-muted-foreground">Reason, shown to {targetName}</label>
            <div className="flex flex-wrap gap-1.5">
              {REASONS.map((r) => (
                <button key={r} type="button" onClick={() => setReason(r)} className={`press rounded-full px-3 py-1 text-[13px] ${reason === r ? "bg-primary text-primary-foreground" : "bg-secondary"}`}>{r}</button>
              ))}
            </div>
            <input id="mod-reason" value={reason} onChange={(e) => setReason(e.target.value)} maxLength={300} placeholder="Or write your own"
              className="h-11 w-full rounded-xl bg-secondary px-4 text-[16px] outline-none focus:ring-2 focus:ring-ring" />
          </div>
        )}
        <div>
          <label htmlFor="mod-note" className="block text-[13px] font-medium text-muted-foreground">{action === "unban" ? "Message (optional)" : "Extra note (optional)"}</label>
          <textarea id="mod-note" value={note} onChange={(e) => setNote(e.target.value)} rows={3} maxLength={1000}
            placeholder={action === "unban" ? "Welcome back. Please follow the community rules." : "What they should do differently"}
            className="mt-1 w-full resize-none rounded-xl bg-secondary px-4 py-3 text-[16px] outline-none focus:ring-2 focus:ring-ring" />
        </div>
        <button type="button" onClick={submit} disabled={busy || (needsReason && !reason.trim())}
          className={`press flex h-12 w-full items-center justify-center rounded-full text-[17px] font-semibold text-white disabled:opacity-40 ${action === "unban" ? "bg-primary" : action === "warn" ? "bg-amber-600" : "bg-destructive"}`}>
          {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : action === "warn" ? "Send warning" : action === "suspend" ? "Suspend account" : action === "ban" ? "Ban account" : "Lift restriction"}
        </button>
      </DialogContent>
    </Dialog>
  );
};

export default BanDialog;
