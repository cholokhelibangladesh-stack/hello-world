import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Check, FileText, Loader2, ShieldAlert, ShieldCheck, ShieldQuestion } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import SettingsShell from "@/components/settings/SettingsShell";
import { SettingsSection, SettingsDetail } from "@/components/settings/SettingsControls";
import { removeStoredObject, resolveMediaUrl, storageUrl } from "@/lib/media";

type Scout = { verification_status: string; full_name: string; organization: string | null; created_at: string; is_banned: boolean };
type Doc = { id: string; type: string; name: string; url: string; created_at: string };

const DOC_TYPES = [
  { type: "scout_org_id", label: "Organisation ID card", hint: "Photo or scan of your club or academy ID." },
  { type: "scout_cv", label: "CV", hint: "Your scouting or coaching experience." },
] as const;
const ACCEPT = "application/pdf,image/jpeg,image/png,image/webp";
const MAX_BYTES = 10 * 1024 * 1024;

const ScoutVerificationPage = () => {
  const { user, refreshRole } = useAuth();
  const [scout, setScout] = useState<Scout | null>(null);
  const [docs, setDocs] = useState<Doc[]>([]);
  const [busyType, setBusyType] = useState<string | null>(null);
  const [org, setOrg] = useState("");
  const inputs = useRef<Record<string, HTMLInputElement | null>>({});

  const load = useCallback(async () => {
    if (!user) return;
    const [{ data: sp }, { data: d }] = await Promise.all([
      supabase.from("scout_profiles").select("verification_status, full_name, organization, created_at, is_banned").eq("user_id", user.id).maybeSingle(),
      supabase.from("documents").select("id, type, name, url, created_at").eq("user_id", user.id).order("created_at", { ascending: false }),
    ]);
    setScout(sp as Scout | null);
    setOrg((sp as Scout | null)?.organization ?? "");
    setDocs((d ?? []) as Doc[]);
  }, [user]);
  useEffect(() => { load(); }, [load]);

  const upload = async (type: string, file: File | undefined) => {
    if (!user || !file) return;
    if (!ACCEPT.split(",").includes(file.type)) { toast.error("Use a PDF, JPG, PNG or WebP file."); return; }
    if (file.size > MAX_BYTES) { toast.error("That file is over 10 MB."); return; }
    setBusyType(type);
    const ext = (file.name.split(".").pop() || "pdf").toLowerCase().replace(/[^a-z0-9]/g, "");
    const path = `${user.id}/${type}_${Date.now()}.${ext}`;
    const { error: upErr } = await supabase.storage.from("documents").upload(path, file, { contentType: file.type });
    if (upErr) { setBusyType(null); toast.error("Upload failed", { description: "Check your connection and try again." }); return; }
    const old = docs.filter((d) => d.type === type);
    const { error: rowErr } = await supabase.from("documents").insert({ user_id: user.id, type, name: file.name.slice(0, 200), url: storageUrl("documents", path) });
    if (rowErr) {
      await supabase.storage.from("documents").remove([path]);
      setBusyType(null); toast.error("Upload failed", { description: "Please try again." }); return;
    }
    for (const d of old) { await removeStoredObject(d.url, "documents"); await supabase.from("documents").delete().eq("id", d.id); }
    setBusyType(null);
    toast.success("Document uploaded");
    load();
  };

  const open = async (d: Doc) => {
    const url = await resolveMediaUrl(d.url, "documents");
    if (url) window.open(url, "_blank", "noopener"); else toast.error("Couldn't open that file.");
  };

  const saveOrg = async () => {
    if (!user || org.trim() === (scout?.organization ?? "")) return;
    const { error } = await supabase.from("scout_profiles").update({ organization: org.trim().slice(0, 120) }).eq("user_id", user.id);
    if (error) toast.error("Couldn't save organisation"); else { toast.success("Organisation saved"); load(); }
  };

  if (!scout) {
    return <SettingsShell title="Verification"><div className="grid place-items-center py-16"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" aria-label="Loading" /></div></SettingsShell>;
  }

  const status = scout.is_banned ? "suspended" : scout.verification_status;
  const S = status === "active" ? { Icon: ShieldCheck, label: "Verified", cls: "text-success", text: "You have full access to scouting tools." }
    : status === "pending" ? { Icon: ShieldQuestion, label: "In review", cls: "text-primary", text: "An admin reviews your documents before you can see players." }
    : { Icon: ShieldAlert, label: status === "suspended" ? "Suspended" : "Not approved", cls: "text-destructive", text: "Message the team from Settings if you think this is a mistake." };

  return (
    <SettingsShell title="Verification">
      <SettingsSection>
        <div className="ios-row">
          <S.Icon className={`h-7 w-7 shrink-0 ${S.cls}`} aria-hidden="true" />
          <div>
            <p className={`headline ${S.cls}`}>{S.label}</p>
            <p className="footnote">{S.text}</p>
          </div>
        </div>
      </SettingsSection>

      <SettingsSection label="Documents" footer="Only Cholo Kheli admins can see these files. Uploading a new file replaces the old one.">
        {DOC_TYPES.map((t) => {
          const current = docs.find((d) => d.type === t.type);
          return (
            <div key={t.type} className="ios-row">
              <span className={`grid h-[30px] w-[30px] shrink-0 place-items-center rounded-[8px] ${current ? "bg-success" : "bg-muted"}`}>
                {current ? <Check className="h-4 w-4 text-white" strokeWidth={3} /> : <FileText className="h-4 w-4 text-muted-foreground" />}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-[16px]">{t.label}</p>
                {current
                  ? <button type="button" onClick={() => open(current)} className="block max-w-full truncate text-left text-[13px] text-primary">{current.name}</button>
                  : <p className="footnote">{t.hint}</p>}
              </div>
              <input ref={(el) => { inputs.current[t.type] = el; }} type="file" accept={ACCEPT} className="hidden"
                onChange={(e) => { upload(t.type, e.target.files?.[0]); e.target.value = ""; }} />
              <button type="button" disabled={busyType !== null} onClick={() => inputs.current[t.type]?.click()}
                className="press rounded-full bg-secondary px-3.5 py-1.5 text-[15px] font-medium text-primary disabled:opacity-50">
                {busyType === t.type ? <Loader2 className="h-4 w-4 animate-spin" aria-label="Uploading" /> : current ? "Replace" : "Upload"}
              </button>
            </div>
          );
        })}
      </SettingsSection>

      <SettingsSection label="Your details">
        <SettingsDetail label="Name" value={scout.full_name || "—"} />
        <div className="ios-row">
          <label htmlFor="org" className="shrink-0 text-[16px]">Organisation</label>
          <input id="org" value={org} maxLength={120} onChange={(e) => setOrg(e.target.value)} onBlur={saveOrg}
            placeholder="Club or academy" className="min-w-0 flex-1 bg-transparent text-right text-[16px] text-muted-foreground outline-none focus:text-foreground" />
        </div>
        <SettingsDetail label="Applied" value={new Date(scout.created_at).toLocaleDateString()} />
      </SettingsSection>

      {status !== "active" && (
        <button type="button" onClick={() => refreshRole()} className="mt-6 w-full py-2 text-[16px] text-primary">Check status</button>
      )}
    </SettingsShell>
  );
};

export default ScoutVerificationPage;
