import { useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const REASONS = ["Not a sports highlight", "Someone else's video", "Bullying or abuse", "Unsafe for young players", "Spam or scam"];

/** Reports a highlight. It goes to the admin moderation queue with the video attached. */
const ReportVideoDialog = ({ videoId, open, onOpenChange }: { videoId: string; open: boolean; onOpenChange: (o: boolean) => void }) => {
  const [reason, setReason] = useState("");
  const [detail, setDetail] = useState("");
  const [busy, setBusy] = useState(false);
  const submit = async () => {
    setBusy(true);
    const text = [reason, detail.trim()].filter(Boolean).join(": ");
    const { error } = await supabase.rpc("report_video" as never, { _video_id: videoId, _reason: text } as never);
    setBusy(false);
    if (error) {
      toast.error("Report not sent", { description: error.message.includes("too many") ? "You've sent several reports recently. Try again later." : "Please try again." });
      return;
    }
    onOpenChange(false); setReason(""); setDetail("");
    toast.success("Thanks, we'll take a look", { description: "An admin reviews every report." });
  };
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm rounded-[18px]">
        <DialogHeader>
          <DialogTitle>Report highlight</DialogTitle>
          <DialogDescription>The player won't see who reported it.</DialogDescription>
        </DialogHeader>
        <div className="ios-group" role="radiogroup" aria-label="Reason">
          {REASONS.map((r) => (
            <button key={r} type="button" role="radio" aria-checked={reason === r} onClick={() => setReason(r)}
              className="ios-row w-full text-left text-[16px]">
              <span className="flex-1">{r}</span>
              <span className={`h-5 w-5 rounded-full border-2 ${reason === r ? "border-primary bg-primary" : "border-border"}`} aria-hidden="true" />
            </button>
          ))}
        </div>
        <label htmlFor="report-detail" className="sr-only">More detail</label>
        <textarea id="report-detail" rows={2} maxLength={500} value={detail} onChange={(e) => setDetail(e.target.value)}
          placeholder="Anything else? (optional)" className="w-full resize-none rounded-xl bg-secondary px-4 py-3 text-[16px] outline-none focus:ring-2 focus:ring-ring" />
        <button type="button" disabled={!reason || busy} onClick={submit}
          className="press flex h-12 w-full items-center justify-center rounded-full bg-destructive text-[17px] font-semibold text-white disabled:opacity-40">
          {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : "Send report"}
        </button>
      </DialogContent>
    </Dialog>
  );
};

export default ReportVideoDialog;
