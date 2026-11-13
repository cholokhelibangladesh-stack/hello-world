import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Loader2, ShieldCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import SettingsShell from "@/components/settings/SettingsShell";
import BanDialog from "@/components/admin/BanDialog";

type Status = "new" | "reviewing" | "resolved" | "dismissed";
type Report = { id: string; reporter_id: string; reported_user_id: string; reason: string; status: Status; created_at: string };
type Person = { full_name: string | null; username: string | null };

const FILTERS: { value: Status | "open"; label: string }[] = [
  { value: "open", label: "Open" },
  { value: "resolved", label: "Resolved" },
  { value: "dismissed", label: "Dismissed" },
];

/** User reports filed with report_user(): review, resolve or dismiss, and ban from here. */
const AdminReportsPage = () => {
  const [filter, setFilter] = useState<Status | "open">("open");
  const [rows, setRows] = useState<Report[] | null>(null);
  const [people, setPeople] = useState<Record<string, Person>>({});
  const [roles, setRoles] = useState<Record<string, string>>({});
  const [banTarget, setBanTarget] = useState<{ id: string; name: string; scope: "profile" | "scout" } | null>(null);

  const load = useCallback(async () => {
    setRows(null);
    let q = supabase.from("user_reports").select("id, reporter_id, reported_user_id, reason, status, created_at").order("created_at", { ascending: false }).limit(100);
    q = filter === "open" ? q.in("status", ["new", "reviewing"]) : q.eq("status", filter);
    const { data, error } = await q;
    if (error) { toast.error("Couldn't load reports"); setRows([]); return; }
    const list = (data ?? []) as Report[];
    const ids = [...new Set(list.flatMap((r) => [r.reporter_id, r.reported_user_id]))];
    if (ids.length) {
      const [{ data: p }, { data: r }] = await Promise.all([
        supabase.from("profiles").select("user_id, full_name, username").in("user_id", ids),
        supabase.from("user_roles").select("user_id, role").in("user_id", ids),
      ]);
      setPeople(Object.fromEntries((p ?? []).map((x) => [x.user_id, { full_name: x.full_name, username: x.username }])));
      setRoles(Object.fromEntries((r ?? []).map((x) => [x.user_id, x.role as string])));
    }
    setRows(list);
  }, [filter]);
  useEffect(() => { load(); }, [load]);

  const setStatus = async (id: string, status: Status) => {
    const { error } = await supabase.from("user_reports").update({ status }).eq("id", id);
    if (error) { toast.error("Couldn't update the report"); return; }
    toast.success(status === "resolved" ? "Marked resolved" : status === "dismissed" ? "Report dismissed" : "Marked as reviewing");
    load();
  };

  const name = (id: string) => {
    const p = people[id];
    return p ? `${p.full_name ?? "Unknown"}${p.username ? ` (@${p.username})` : ""}` : "Deleted account";
  };

  return (
    <SettingsShell title="User reports">
      <div role="tablist" aria-label="Report status" className="grid grid-cols-3 rounded-xl bg-secondary p-1">
        {FILTERS.map((f) => (
          <button key={f.value} role="tab" aria-selected={filter === f.value} onClick={() => setFilter(f.value)}
            className={`h-8 rounded-[9px] text-[14px] font-medium ${filter === f.value ? "bg-card shadow-[0_1px_3px_hsl(var(--foreground)/0.12)]" : "text-muted-foreground"}`}>
            {f.label}
          </button>
        ))}
      </div>

      {rows === null ? (
        <div className="grid place-items-center py-16"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" aria-label="Loading" /></div>
      ) : rows.length === 0 ? (
        <div className="flex flex-col items-center py-16 text-center">
          <ShieldCheck className="h-9 w-9 text-success" aria-hidden="true" />
          <p className="headline mt-3">{filter === "open" ? "No open reports" : "Nothing here yet"}</p>
          <p className="footnote mt-1">Reports people file about other users appear here.</p>
        </div>
      ) : (
        <ul className="mt-5 space-y-3">
          {rows.map((r) => (
            <li key={r.id} className="ios-group p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="headline truncate">{name(r.reported_user_id)}</p>
                  <p className="footnote">{roles[r.reported_user_id] ?? "user"} · reported by {name(r.reporter_id)} · {new Date(r.created_at).toLocaleDateString()}</p>
                </div>
                <span className={`status-pill ${r.status === "resolved" ? "is-approved" : r.status === "dismissed" ? "is-pending" : "is-declined"}`}>{r.status}</span>
              </div>
              <p className="mt-3 whitespace-pre-wrap break-words text-[15px] leading-relaxed">{r.reason}</p>
              {(r.status === "new" || r.status === "reviewing") && (
                <div className="mt-4 flex flex-wrap gap-2">
                  {r.status === "new" && <button onClick={() => setStatus(r.id, "reviewing")} className="press rounded-full bg-secondary px-3.5 py-1.5 text-[14px] font-medium">Start review</button>}
                  <button onClick={() => setStatus(r.id, "resolved")} className="press rounded-full bg-primary px-3.5 py-1.5 text-[14px] font-medium text-primary-foreground">Resolve</button>
                  <button onClick={() => setStatus(r.id, "dismissed")} className="press rounded-full bg-secondary px-3.5 py-1.5 text-[14px] font-medium">Dismiss</button>
                  <button
                    onClick={() => setBanTarget({ id: r.reported_user_id, name: people[r.reported_user_id]?.full_name ?? "this user", scope: roles[r.reported_user_id] === "scout" ? "scout" : "profile" })}
                    className="press rounded-full bg-destructive/10 px-3.5 py-1.5 text-[14px] font-medium text-destructive">Ban user…</button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}

      {banTarget && (
        <BanDialog open onOpenChange={(v) => !v && setBanTarget(null)} targetUserId={banTarget.id} targetName={banTarget.name}
          scope={banTarget.scope} onDone={() => { setBanTarget(null); load(); }} />
      )}
    </SettingsShell>
  );
};
export default AdminReportsPage;
