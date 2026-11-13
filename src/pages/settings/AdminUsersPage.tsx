import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { Ban, Loader2, Megaphone, Search, User as UserIcon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import SettingsShell from "@/components/settings/SettingsShell";
import BottomSheet from "@/components/social/BottomSheet";
import BanDialog from "@/components/admin/BanDialog";
import { safeMediaUrl } from "@/lib/sanitize";
import { timeAgo } from "@/lib/taxonomy";

type Row = {
  user_id: string; full_name: string | null; username: string | null; avatar_url: string | null; sport: string | null;
  is_banned: boolean; banned_until: string | null; ban_reason: string | null; created_at: string; role?: string;
};
type RoleFilter = "all" | "player" | "scout" | "admin";
type StatusFilter = "all" | "restricted";
const PAGE = 50;

/** Find any account, see its standing, and act on it. Search and filters run in the database. */
const AdminUsersPage = () => {
  const [rows, setRows] = useState<Row[] | null>(null);
  const [q, setQ] = useState("");
  const [debounced, setDebounced] = useState("");
  const [role, setRole] = useState<RoleFilter>("all");
  const [status, setStatus] = useState<StatusFilter>("all");
  const [limit, setLimit] = useState(PAGE);
  const [selected, setSelected] = useState<Row | null>(null);
  const [moderate, setModerate] = useState<Row | null>(null);
  const [emails, setEmails] = useState<Record<string, string>>({});
  const [history, setHistory] = useState<{ action: string; reason: string | null; created_at: string }[] | null>(null);
  const [notice, setNotice] = useState({ title: "", message: "" });

  useEffect(() => { const t = setTimeout(() => setDebounced(q.trim()), 300); return () => clearTimeout(t); }, [q]);

  const load = async () => {
    let ids: string[] | null = null;
    if (role !== "all") {
      const { data } = await supabase.from("user_roles").select("user_id").eq("role", role).limit(5000);
      ids = (data ?? []).map((r) => r.user_id);
      if (!ids.length) { setRows([]); return; }
    }
    let query = supabase.from("profiles")
      .select("user_id, full_name, username, avatar_url, sport, is_banned, banned_until, ban_reason, created_at")
      .order("created_at", { ascending: false }).limit(limit);
    if (ids) query = query.in("user_id", ids.slice(0, 1000));
    if (status === "restricted") query = query.eq("is_banned", true);
    if (debounced) {
      const s = debounced.replace(/[%,()]/g, " ");
      query = query.or(`full_name.ilike.%${s}%,username.ilike.%${s.replace(/^@/, "")}%`);
    }
    const { data, error } = await query;
    if (error) { toast.error("Couldn't load accounts"); setRows([]); return; }
    const list = (data ?? []) as Row[];
    const { data: rs } = list.length ? await supabase.from("user_roles").select("user_id, role").in("user_id", list.map((r) => r.user_id)) : { data: [] };
    const priority = ["admin", "scout", "player"];
    const rm = new Map<string, string>();
    (rs ?? []).forEach((r) => { const cur = rm.get(r.user_id); if (!cur || priority.indexOf(r.role) < priority.indexOf(cur)) rm.set(r.user_id, r.role); });
    setRows(list.map((r) => ({ ...r, role: rm.get(r.user_id) ?? "none" })));
  };
  useEffect(() => { setRows(null); load(); }, [debounced, role, status, limit]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!selected) return;
    setHistory(null); setNotice({ title: "", message: "" });
    if (!Object.keys(emails).length) {
      supabase.rpc("get_admin_user_emails").then(({ data }) => setEmails(Object.fromEntries(((data ?? []) as { user_id: string; email: string }[]).map((r) => [r.user_id, r.email]))));
    }
    supabase.from("admin_actions" as never).select("action, reason, created_at").eq("target_user", selected.user_id).order("created_at", { ascending: false }).limit(20)
      .then(({ data }) => setHistory((data ?? []) as never));
  }, [selected?.user_id]); // eslint-disable-line react-hooks/exhaustive-deps

  const sendNotice = async () => {
    if (!selected || !notice.title.trim()) return;
    const { error } = await supabase.rpc("admin_send_notice" as never, { _title: notice.title.trim(), _message: notice.message.trim(), _audience: "user", _user_id: selected.user_id } as never);
    if (error) { toast.error("Notice not sent", { description: error.message }); return; }
    toast.success("Notice sent");
    setNotice({ title: "", message: "" });
  };

  const restricted = (r: Row) => r.is_banned && (!r.banned_until || new Date(r.banned_until) > new Date());
  const roleBadge = (r: Row) => <span className="rounded-full bg-secondary px-2 py-0.5 text-[12px] font-medium capitalize">{r.role}</span>;

  return (
    <SettingsShell title="Users" description="Search, filter and moderate accounts">
      <div className="space-y-2 pb-3">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <label htmlFor="user-search" className="sr-only">Search users</label>
          <input id="user-search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Name or @username"
            className="h-10 w-full rounded-xl bg-card pl-9 pr-3 text-[16px] outline-none focus:ring-2 focus:ring-ring" />
        </div>
        <div className="grid grid-cols-4 rounded-xl bg-card p-1" role="radiogroup" aria-label="Role">
          {(["all", "player", "scout", "admin"] as const).map((r) => (
            <button key={r} type="button" role="radio" aria-checked={role === r} onClick={() => setRole(r)}
              className={`h-8 rounded-[9px] text-[14px] font-medium capitalize ${role === r ? "bg-secondary" : "text-muted-foreground"}`}>{r === "all" ? "All" : `${r}s`}</button>
          ))}
        </div>
        <label className="flex items-center gap-2 px-1 text-[15px]">
          <input type="checkbox" checked={status === "restricted"} onChange={(e) => setStatus(e.target.checked ? "restricted" : "all")} className="h-4 w-4" />
          Only suspended or banned
        </label>
      </div>

      {rows === null ? <div className="grid place-items-center py-16"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
        : rows.length === 0 ? <p className="py-16 text-center text-[15px] text-muted-foreground">No accounts match.</p>
        : (
          <ul className="ios-group">
            {rows.map((r) => (
              <li key={r.user_id}>
                <button type="button" onClick={() => setSelected(r)} className="ios-row w-full text-left">
                  <span className="h-10 w-10 shrink-0 overflow-hidden rounded-full bg-secondary">
                    {r.avatar_url ? <img src={safeMediaUrl(r.avatar_url)} alt="" className="h-full w-full object-cover" /> : <UserIcon className="m-2.5 h-5 w-5 text-muted-foreground" />}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[15px] font-medium">{r.full_name || "Unnamed"}</span>
                    <span className="block truncate text-[13px] text-muted-foreground">@{r.username ?? "none"} · joined {timeAgo(r.created_at)}</span>
                  </span>
                  {restricted(r) ? <span className="status-pill is-declined">{r.banned_until ? "Suspended" : "Banned"}</span> : roleBadge(r)}
                </button>
              </li>
            ))}
          </ul>
        )}
      {rows && rows.length >= limit && <button type="button" onClick={() => setLimit((l) => l + PAGE)} className="press mt-3 h-11 w-full rounded-full bg-card text-[15px] font-semibold">Load more</button>}

      <BottomSheet open={!!selected} onClose={() => setSelected(null)} title={selected?.full_name ?? "Account"} height="86dvh">
        {selected && (
          <div className="h-full space-y-4 overflow-y-auto p-4">
            <div className="flex items-center gap-3">
              <span className="h-14 w-14 overflow-hidden rounded-full bg-secondary">{selected.avatar_url && <img src={safeMediaUrl(selected.avatar_url)} alt="" className="h-full w-full object-cover" />}</span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[17px] font-semibold">{selected.full_name}</p>
                <p className="truncate text-[14px] text-muted-foreground">@{selected.username} · {emails[selected.user_id] ?? "…"}</p>
              </div>
              {roleBadge(selected)}
            </div>
            {restricted(selected) && (
              <p className="rounded-xl bg-destructive/10 px-3 py-2 text-[14px] text-destructive">
                {selected.banned_until ? `Suspended until ${new Date(selected.banned_until).toLocaleString()}` : "Banned"}{selected.ban_reason ? `: ${selected.ban_reason}` : ""}
              </p>
            )}
            <div className="ios-group">
              <Link to={`/resume/${selected.user_id}` as never} className="ios-row text-[16px]"><UserIcon className="h-5 w-5 text-primary" /><span className="flex-1">Open profile</span></Link>
              {selected.role !== "admin" && (
                <button type="button" onClick={() => setModerate(selected)} className="ios-row w-full text-left text-[16px]">
                  <Ban className="h-5 w-5 text-primary" /><span className="flex-1">{restricted(selected) ? "Lift restriction" : "Warn, suspend or ban"}</span>
                </button>
              )}
            </div>
            <section className="space-y-2">
              <h3 className="ios-group-label !px-0 flex items-center gap-1.5"><Megaphone className="h-4 w-4" /> Send a notice</h3>
              <input value={notice.title} onChange={(e) => setNotice({ ...notice, title: e.target.value })} maxLength={200} placeholder="Title"
                className="h-11 w-full rounded-xl bg-secondary px-4 text-[16px] outline-none focus:ring-2 focus:ring-ring" />
              <textarea value={notice.message} onChange={(e) => setNotice({ ...notice, message: e.target.value })} rows={3} maxLength={2000} placeholder="Message"
                className="w-full resize-none rounded-xl bg-secondary px-4 py-3 text-[16px] outline-none focus:ring-2 focus:ring-ring" />
              <button type="button" onClick={sendNotice} disabled={!notice.title.trim()} className="press h-11 w-full rounded-full bg-primary text-[15px] font-semibold text-primary-foreground disabled:opacity-40">Send</button>
            </section>
            <section>
              <h3 className="ios-group-label !px-0">History</h3>
              {history === null ? <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                : history.length === 0 ? <p className="text-[14px] text-muted-foreground">No moderation actions.</p>
                : <ul className="ios-group">{history.map((h, i) => (
                    <li key={i} className="ios-row items-start"><span className="flex-1 text-[15px]"><span className="font-medium capitalize">{h.action.replace("_", " ")}</span>{h.reason ? `: ${h.reason}` : ""}</span><span className="text-[13px] text-muted-foreground">{timeAgo(h.created_at)}</span></li>
                  ))}</ul>}
            </section>
          </div>
        )}
      </BottomSheet>
      {moderate && <BanDialog open onOpenChange={(o) => !o && setModerate(null)} targetUserId={moderate.user_id} targetName={moderate.full_name ?? "this user"}
        initialAction={restricted(moderate) ? "unban" : "suspend"} onDone={() => { setSelected(null); load(); }} />}
    </SettingsShell>
  );
};

export default AdminUsersPage;
