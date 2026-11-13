import { useState } from "react";
import { Flag, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

/** Files a report with report_user(); admins review it under Admin › User reports. */
const ReportUserButton = ({ userId, name }: { userId: string; name: string }) => {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const submit = async () => {
    setBusy(true);
    const { error } = await supabase.rpc("report_user", { _reported_user: userId, _reason: reason.trim() });
    setBusy(false);
    if (error) {
      toast.error("Report not sent", { description: error.message.includes("too many") ? "You've sent several reports recently. Try again later." : "Please try again." });
      return;
    }
    setOpen(false); setReason("");
    toast.success("Report sent", { description: "An admin will review it. Thank you for keeping Cholo Kheli safe." });
  };
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button type="button" className="press inline-flex items-center gap-1.5 py-2 text-[15px] text-destructive">
          <Flag className="h-4 w-4" aria-hidden="true" /> Report {name}
        </button>
      </DialogTrigger>
      <DialogContent className="max-w-sm rounded-[18px]">
        <DialogHeader>
          <DialogTitle>Report {name}</DialogTitle>
          <DialogDescription>Tell the team what happened. Only admins see reports, and {name} won't be told who sent it.</DialogDescription>
        </DialogHeader>
        <label htmlFor="report-reason" className="sr-only">What happened</label>
        <textarea id="report-reason" rows={4} maxLength={2000} value={reason} onChange={(e) => setReason(e.target.value)}
          placeholder="What happened?" className="w-full resize-none rounded-xl bg-secondary px-4 py-3 text-[16px] outline-none focus:ring-2 focus:ring-ring" />
        <button type="button" disabled={!reason.trim() || busy} onClick={submit}
          className="press flex h-12 w-full items-center justify-center rounded-full bg-destructive text-[17px] font-semibold text-white disabled:opacity-40">
          {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : "Send report"}
        </button>
      </DialogContent>
    </Dialog>
  );
};
export default ReportUserButton;
