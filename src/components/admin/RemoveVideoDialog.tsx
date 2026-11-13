import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const REASONS = ["Not a sports highlight", "Uses someone else's footage", "Inappropriate or unsafe content", "Shows personal contact details", "Misleading title or tags"];

/** Takes a highlight down and sends the owner a notice with the reason. It can be restored later. */
const RemoveVideoDialog = ({ videoId, title, open, onOpenChange, onDone }: {
  videoId: string; title: string; open: boolean; onOpenChange: (o: boolean) => void; onDone?: () => void;
}) => {
  const [reason, setReason] = useState("");
  const [notify, setNotify] = useState(true);
  const [busy, setBusy] = useState(false);
  useEffect(() => { if (open) { setReason(""); setNotify(true); } }, [open]);
  const submit = async () => {
    setBusy(true);
    const { error } = await supabase.rpc("admin_remove_video" as never, { _video_id: videoId, _reason: reason.trim(), _notify: notify } as never);
    setBusy(false);
    if (error) { toast.error("Couldn't remove it", { description: error.message }); return; }
    toast.success("Highlight removed", { description: notify ? "The player has been told why." : undefined });
    onOpenChange(false); onDone?.();
  };
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md rounded-[18px]">
        <DialogHeader>
          <DialogTitle>Remove “{title}”</DialogTitle>
          <DialogDescription>It disappears from Explore and the profile. You can restore it from Removed.</DialogDescription>
        </DialogHeader>
        <div className="flex flex-wrap gap-1.5">
          {REASONS.map((r) => (
            <button key={r} type="button" onClick={() => setReason(r)} className={`press rounded-full px-3 py-1 text-[13px] ${reason === r ? "bg-primary text-primary-foreground" : "bg-secondary"}`}>{r}</button>
          ))}
        </div>
        <label htmlFor="rm-reason" className="sr-only">Reason</label>
        <textarea id="rm-reason" rows={3} maxLength={500} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Reason, shown to the player"
          className="w-full resize-none rounded-xl bg-secondary px-4 py-3 text-[16px] outline-none focus:ring-2 focus:ring-ring" />
        <label className="flex items-center gap-3 text-[15px]">
          <input type="checkbox" checked={notify} onChange={(e) => setNotify(e.target.checked)} className="h-5 w-5 accent-[hsl(var(--primary))]" />
          Send the player a notice
        </label>
        <button type="button" onClick={submit} disabled={!reason.trim() || busy}
          className="press flex h-12 w-full items-center justify-center rounded-full bg-destructive text-[17px] font-semibold text-white disabled:opacity-40">
          {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : "Remove highlight"}
        </button>
      </DialogContent>
    </Dialog>
  );
};

export default RemoveVideoDialog;
