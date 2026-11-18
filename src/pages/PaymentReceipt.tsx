import { useEffect, useState } from "react";
import { Link, useParams, useSearch } from "@tanstack/react-router";
import { CheckCircle2, Download, Loader2, XCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import CholoKheliMark from "@/components/CholoKheliMark";
import { takaFmt } from "@/lib/payments";

type Payment = {
  id: string; status: string; amount: number; invoice_no: string; certificate_no: string | null;
  transaction_id: string | null; payer_account: string | null; video_title: string | null; payer_name: string | null;
  created_at: string; paid_at: string | null; video_id: string | null;
};

const fmtDate = (s: string | null) => (s ? new Date(s).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" }) : "-");

/**
 * Where bKash sends a player back after paying the upload fee, and where the invoice and certificate
 * notifications open. Both documents print cleanly (Save as PDF) one at a time.
 */
const PaymentReceipt = () => {
  const { id } = useParams({ strict: false }) as { id: string };
  const search = useSearch({ strict: false }) as { result?: string; doc?: string };
  const { user, role } = useAuth();
  const [p, setP] = useState<Payment | null | undefined>(undefined);
  const [printing, setPrinting] = useState<"invoice" | "certificate" | null>(null);

  useEffect(() => {
    if (!user) return;
    let tries = 0;
    const load = async () => {
      const { data } = await supabase.from("payments")
        .select("id, status, amount, invoice_no, certificate_no, transaction_id, payer_account, video_title, payer_name, created_at, paid_at, video_id")
        .eq("id", id).maybeSingle();
      setP((data as Payment | null) ?? null);
      // Right after bKash, the confirmation can land a moment after the redirect.
      if (data && data.status === "pending" && search.result === "paid" && tries++ < 5) setTimeout(load, 1200);
    };
    load();
  }, [id, user, search.result]);

  useEffect(() => {
    if (search.doc === "certificate") setTimeout(() => document.getElementById("certificate")?.scrollIntoView({ behavior: "smooth" }), 300);
  }, [search.doc, p]);

  const print = (which: "invoice" | "certificate") => {
    setPrinting(which);
    setTimeout(() => { window.print(); setPrinting(null); }, 60);
  };

  const home = role === "admin" ? "/admin" : "/player/upload";
  if (p === undefined) return <div className="grid min-h-[50dvh] place-items-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  if (p === null) return (
    <div className="mx-auto max-w-md px-5 py-16 text-center">
      <p className="title-2">Payment not found</p>
      <Link to={home as never} className="press mt-6 inline-flex h-11 items-center rounded-full bg-primary px-5 font-semibold text-primary-foreground">Back</Link>
    </div>
  );

  const paid = p.status === "paid";
  return (
    <div className={`mx-auto max-w-xl space-y-5 px-4 pb-10 pt-4 ${printing ? `print-only-${printing}` : ""}`}>
      <section className="no-print rounded-[24px] bg-card p-5 text-center">
        {paid ? <CheckCircle2 className="mx-auto h-12 w-12 text-[#1E9E6A]" /> : p.status === "pending" ? <Loader2 className="mx-auto h-10 w-10 animate-spin text-muted-foreground" /> : <XCircle className="mx-auto h-12 w-12 text-destructive" />}
        <h1 className="title-2 mt-3">{paid ? "Payment successful" : p.status === "pending" ? "Confirming your payment" : p.status === "cancelled" ? "Payment cancelled" : "Payment didn't go through"}</h1>
        <p className="mt-1 text-[15px] text-muted-foreground">
          {paid ? "Your highlight is live. Your invoice and certificate are below and in your notifications."
            : p.status === "pending" ? "This takes a few seconds."
            : "No money was taken. Your highlight is saved; you can pay again from Upload."}
        </p>
        <Link to={home as never} className="press mt-4 inline-flex h-11 items-center rounded-full bg-secondary px-5 text-[15px] font-semibold">Back to uploads</Link>
      </section>

      <section id="invoice" className="doc-invoice rounded-[24px] bg-white p-6 text-[#0E2A33] shadow-sm ring-1 ring-black/5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-2"><CholoKheliMark className="h-7 w-8" /><span className="text-[17px] font-bold">Cholo Kheli</span></div>
          <div className="text-right">
            <p className="text-[12px] uppercase tracking-wide text-[#5F6B71]">Invoice</p>
            <p className="font-semibold tabular-nums">{p.invoice_no}</p>
          </div>
        </div>
        <dl className="mt-5 grid grid-cols-2 gap-x-4 gap-y-2 text-[14px]">
          <dt className="text-[#5F6B71]">Billed to</dt><dd className="text-right font-medium" translate="no">{p.payer_name ?? "-"}</dd>
          <dt className="text-[#5F6B71]">Date</dt><dd className="text-right">{fmtDate(p.paid_at ?? p.created_at)}</dd>
          <dt className="text-[#5F6B71]">Status</dt><dd className="text-right font-medium">{paid ? "Paid" : p.status}</dd>
          <dt className="text-[#5F6B71]">Paid with</dt><dd className="text-right">bKash {p.payer_account ?? ""}</dd>
          <dt className="text-[#5F6B71]">bKash transaction</dt><dd className="text-right tabular-nums">{p.transaction_id ?? "-"}</dd>
        </dl>
        <div className="mt-5 border-t border-dashed border-[#0E2A33]/20 pt-4">
          <div className="flex items-center justify-between text-[15px]">
            <span>Highlight upload fee<br /><span className="text-[13px] text-[#5F6B71]" translate="no">“{p.video_title ?? "Highlight"}”</span></span>
            <span className="tabular-nums">{takaFmt(Number(p.amount))}</span>
          </div>
          <div className="mt-3 flex items-center justify-between border-t border-[#0E2A33]/10 pt-3 text-[17px] font-bold">
            <span>Total</span><span className="tabular-nums">{takaFmt(Number(p.amount))}</span>
          </div>
        </div>
        <p className="mt-5 text-[12px] text-[#5F6B71]">Cholo Kheli · cholokheli.com · This is a computer-generated invoice and needs no signature.</p>
      </section>
      {paid && (
        <button type="button" onClick={() => print("invoice")} className="no-print press flex h-11 w-full items-center justify-center gap-2 rounded-full bg-secondary text-[15px] font-semibold">
          <Download className="h-4 w-4" /> Save invoice as PDF
        </button>
      )}

      {paid && (
        <>
          <section id="certificate" className="doc-certificate relative overflow-hidden rounded-[24px] p-[3px]" style={{ background: "linear-gradient(135deg,#7EC8FF,#5FD3B5,#F2C98A)" }}>
            <div className="rounded-[21px] bg-white px-6 py-8 text-center text-[#0E2A33]">
              <CholoKheliMark className="mx-auto h-10 w-12" />
              <p className="mt-3 text-[12px] uppercase tracking-[0.2em] text-[#13738F]">Certificate of participation</p>
              <p className="mt-5 text-[14px] text-[#5F6B71]">This certifies that</p>
              <p className="mt-1 text-[28px] font-bold leading-tight" translate="no">{p.payer_name}</p>
              <p className="mx-auto mt-3 max-w-sm text-[15px] leading-relaxed">
                took part in the Cholo Kheli grassroots talent programme by submitting the highlight
                <span translate="no"> “{p.video_title ?? "Highlight"}”</span> for review by verified scouts.
              </p>
              <div className="mt-7 flex items-end justify-between text-left text-[12px] text-[#5F6B71]">
                <div><p className="font-semibold text-[#0E2A33]">{fmtDate(p.paid_at)}</p><p>Date</p></div>
                <div className="text-right"><p className="font-semibold tabular-nums text-[#0E2A33]">{p.certificate_no}</p><p>Certificate no.</p></div>
              </div>
            </div>
          </section>
          <button type="button" onClick={() => print("certificate")} className="no-print press flex h-11 w-full items-center justify-center gap-2 rounded-full bg-secondary text-[15px] font-semibold">
            <Download className="h-4 w-4" /> Save certificate as PDF
          </button>
        </>
      )}
    </div>
  );
};

export default PaymentReceipt;
