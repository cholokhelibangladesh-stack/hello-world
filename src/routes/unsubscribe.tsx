import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Loader2, MailX } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import CholoKheliMark from "@/components/CholoKheliMark";
import { BusinessDetails } from "@/pages/legal/LegalPage";

/** Landing page for the unsubscribe link in Cholo Kheli emails. Works without signing in. */
function Unsubscribe() {
  const { u, t } = Route.useSearch();
  const [state, setState] = useState<"idle" | "busy" | "done" | "error">("idle");
  const valid = /^[0-9a-f-]{36}$/i.test(u) && /^[0-9a-f]{32}$/.test(t);

  const confirm = async () => {
    setState("busy");
    const { error } = await supabase.functions.invoke(`send-notification?unsubscribe=1&u=${encodeURIComponent(u)}&t=${encodeURIComponent(t)}`, { method: "POST", body: {} });
    setState(error ? "error" : "done");
  };

  return (
    <main className="mx-auto flex min-h-[100dvh] max-w-md flex-col px-5" style={{ paddingTop: "calc(1.5rem + env(safe-area-inset-top))" }}>
      <Link to="/" aria-label="Cholo Kheli home" className="inline-flex w-fit items-center gap-2 py-2">
        <CholoKheliMark className="h-7 w-8" /><span className="text-[15px] font-semibold">Cholo Kheli</span>
      </Link>
      <div className="mt-10 grid h-14 w-14 place-items-center rounded-full bg-accent text-primary"><MailX className="h-7 w-7" aria-hidden="true" /></div>
      <h1 className="large-title mt-4">{state === "done" ? "You're unsubscribed" : "Stop Cholo Kheli emails?"}</h1>
      <p className="mt-2 text-[16px] text-muted-foreground" role="status">
        {state === "done" ? "We won't email you notifications any more. Account and security emails, like password resets, still arrive. You can turn emails back on in Settings, Notifications."
          : state === "error" ? "That link didn't work. It may be old or incomplete. You can turn emails off in Settings, Notifications."
          : !valid ? "This link is incomplete. Open it again from the email, or turn emails off in Settings, Notifications."
          : "You'll stop getting notification emails. Push notifications in the app aren't affected."}
      </p>
      {valid && state !== "done" && state !== "error" && (
        <button type="button" onClick={confirm} disabled={state === "busy"}
          className="press mt-6 flex h-[52px] items-center justify-center gap-2 rounded-full bg-primary text-[17px] font-semibold text-primary-foreground disabled:opacity-60">
          {state === "busy" ? <Loader2 className="h-5 w-5 animate-spin" aria-label="Working" /> : "Unsubscribe"}
        </button>
      )}
      <BusinessDetails className="mt-auto pb-8 pt-10" />
    </main>
  );
}

export const Route = createFileRoute("/unsubscribe")({
  validateSearch: (s: Record<string, unknown>) => ({ u: typeof s.u === "string" ? s.u : "", t: typeof s.t === "string" ? s.t : "" }),
  head: () => ({ meta: [{ title: "Unsubscribe · Cholo Kheli" }, { name: "robots", content: "noindex" }] }),
  component: Unsubscribe,
});
