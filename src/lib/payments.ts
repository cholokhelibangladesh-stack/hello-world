import { supabase } from "@/integrations/supabase/client";

export type PayResult = { ok: true } | { ok: false; reason: "not_configured" | "not_due" | "failed" };

/**
 * Opens bKash to pay the upload fee for a highlight that is waiting for payment. bKash sends the player
 * back to /payments/<id> in the app, where the invoice and certificate are shown.
 */
export const payUploadFee = async (videoId: string): Promise<PayResult> => {
  const { data, error } = await supabase.functions.invoke("bkash-payment", {
    body: { action: "create", video_id: videoId, return_url: `${window.location.origin}/player/upload` },
  });
  const code = (data as { error?: string } | null)?.error
    ?? ((error as { context?: Response } | null)?.context ? await (error as { context: Response }).context.json().then((j) => j.error).catch(() => null) : null);
  if (code === "payments_not_configured") return { ok: false, reason: "not_configured" };
  if (code === "not_awaiting_payment") return { ok: false, reason: "not_due" };
  const url = (data as { bkashURL?: string } | null)?.bkashURL;
  if (!url) return { ok: false, reason: "failed" };
  window.location.assign(url);
  return { ok: true };
};

export const takaFmt = (n: number) => `৳${n.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
