import { useEffect, useState } from"react";
import { motion } from"framer-motion";
import { Shield, Users, Video, DollarSign, CheckCircle, XCircle, Clock, Loader2, Eye, AlertTriangle, MessageSquare, UserPlus, Send, User, Search, Filter, Ban, Power, Mail, Trash2 } from"lucide-react";
import AdminSafety from"@/components/admin/AdminSafety";
import { Button } from"@/components/ui/button";
import { Badge } from"@/components/ui/badge";
import { Input } from"@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from"@/components/ui/tabs";
import { useAuth } from"@/hooks/useAuth";
import { supabase } from"@/integrations/supabase/client";
import { useNavigate } from"@tanstack/react-router";
import { useToast } from"@/hooks/use-toast";
import ProfileTab from"@/components/ProfileTab";
import AdminNoticeForm from"@/components/AdminNoticeForm";
import AdminStats from "@/components/admin/AdminStats";
import AdminAuditLog from "@/components/admin/AdminAuditLog";
import RemoveVideoDialog from "@/components/admin/RemoveVideoDialog";
import UsernameAuditTab from"@/components/UsernameAuditTab";
import AdminNewsManager from"@/components/AdminNewsManager";
import BanDialog from"@/components/admin/BanDialog";
import ShareToScoutDialog from"@/components/admin/ShareToScoutDialog";
import ScoutDocuments from "@/components/admin/ScoutDocuments";


interface ScoutRow { id: string; user_id: string; organization: string | null; verification_status: string; created_at: string; full_name?: string; username?: string | null; email?: string | null; is_banned?: boolean; }
interface PlayerRow { user_id: string; full_name: string; username?: string | null; email?: string | null; is_banned?: boolean; sport?: string | null; }
interface VideoRow { id: string; user_id: string; title: string | null; description: string | null; video_url: string | null; status: string; created_at: string; full_name?: string; username?: string | null; email?: string | null; }
interface MessageRow { id: string; sender_id: string; receiver_id: string; content: string; flagged: boolean; flag_reason: string | null; created_at: string; sender_name?: string; receiver_name?: string; }
interface ScoutRequestRow { id: string; scout_id: string; player_id: string; status: string; notes: string | null; admin_response: string | null; created_at: string; scout_name?: string; player_name?: string; scout_username?: string | null; player_username?: string | null; scout_email?: string | null; player_email?: string | null; }
interface ContactMessageRow { id: string; name: string; email: string; subject: string | null; message: string; is_read: boolean; created_at: string; }
interface ModerationAlertRow { id: string; kind:"scout_request" |"video" |"scout"; target_id: string; target_user_id: string | null; status:"new" |"resolved"; created_at: string; resolved_at: string | null; resolved_by: string | null; target_name?: string; target_email?: string | null; }
interface Stats { totalPlayers: number; totalScouts: number; activeScouts: number; pendingScouts: number; liveVideos: number; flaggedMessages: number; pendingRequests: number; unreadContacts: number; openAlerts: number; }

// Persisted state for the moderation queue: filter/sort/search choices survive reloads.
const MOD_STORAGE_PREFIX ="adminMod:";
const readPersisted = (key: string, fallback: string): string => {
 if (typeof window ==="undefined") return fallback;
 try {
 const v = window.localStorage.getItem(MOD_STORAGE_PREFIX + key);
 return v === null ? fallback : v;
 } catch {
 return fallback;
 }
};
const writePersisted = (key: string, value: string) => {
 if (typeof window ==="undefined") return;
 try { window.localStorage.setItem(MOD_STORAGE_PREFIX + key, value); } catch { /* ignore quota */ }
};
const usePersistedString = (key: string, initial: string): [string, (v: string) => void] => {
 const [value, setValue] = useState<string>(() => readPersisted(key, initial));
 useEffect(() => { writePersisted(key, value); }, [key, value]);
 return [value, setValue];
};

const SORT_OPTIONS = [
 { value:"date_desc", label:"Newest first" },
 { value:"date_asc", label:"Oldest first" },
 { value:"status_asc", label:"Status (pending first)" },
 { value:"status_desc", label:"Status (resolved first)" },
 { value:"target_asc", label:"Account A–Z" },
 { value:"target_desc", label:"Account Z–A" },
];

// Hoisted out of AdminDashboard so React does not re-create the component
// tree on every parent render — that would unmount the search Input mid-keystroke.
const SearchFilterBar = ({ search, setSearch, filter, setFilter, filters, placeholder, sort, setSort, testKey }: { search: string; setSearch: (v: string) => void; filter: string; setFilter: (v: string) => void; filters: { value: string; label: string }[]; placeholder: string; sort?: string; setSort?: (v: string) => void; testKey: string }) => (
 <div className="flex flex-col sm:flex-row gap-2 mb-4" data-testid={`mod-filterbar-${testKey}`}>
 <div className="relative flex-1">
 <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
 <Input
 placeholder={placeholder}
 className="pl-10 bg-secondary border-border rounded-xl text-sm"
 value={search}
 onChange={(e) => setSearch(e.target.value)}
 data-testid={`mod-search-${testKey}`}
 aria-label={`Search ${testKey} by name, email, or username`}
 />
 </div>
 <div className="flex gap-1.5 flex-wrap items-center">
 {filters.map((f) => (
 <Button key={f.value} size="sm" variant="outline"
 onClick={() => setFilter(filter === f.value ?"all" : f.value)}
 data-testid={`mod-filter-${testKey}-${f.value}`}
 className={`text-xs rounded-full border-border ${filter === f.value ?"border-primary text-primary bg-primary/10" :"text-muted-foreground"}`}>
 <Filter className="h-3 w-3 mr-1" /> {f.label}
 </Button>
))}
 {setSort && (
 <select
 aria-label="Sort"
 value={sort}
 onChange={(e) => setSort(e.target.value)}
 data-testid={`mod-sort-${testKey}`}
 className="h-8 rounded-full border border-border bg-secondary text-xs px-3 text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
 >
 {SORT_OPTIONS.map((o) => (
 <option key={o.value} value={o.value}>{o.label}</option>
))}
 </select>
)}
 </div>
 </div>
);


/* ── Horizontal glass cards for the admin lists ── */
const initialOf = (name?: string | null) => (name || "?").trim().charAt(0).toUpperCase();
const AdminCard = ({ name, sub, meta, badge, struck, tone = "sky", children, actions, trailing, ...rest }: {
  name: string; sub?: React.ReactNode; meta?: React.ReactNode; badge?: React.ReactNode; struck?: boolean;
  tone?: "sky" | "mint" | "sand"; children?: React.ReactNode; actions?: React.ReactNode; trailing?: React.ReactNode;
} & Record<`data-${string}`, string | undefined>) => (
  <div {...rest} className="rounded-[22px] bg-card p-3.5">
    <div className="flex items-center gap-3">
      <span aria-hidden className={`grid h-11 w-11 shrink-0 place-items-center rounded-full text-[17px] font-semibold ${{
        sky: "bg-[#7EC8FF]/25 text-[#13738F]", mint: "bg-[#5FD3B5]/25 text-[#0F7A60]", sand: "bg-[#F2C98A]/35 text-[#8A5A14]" }[tone]}`}>
        {initialOf(name)}
      </span>
      <div className="min-w-0 flex-1">
        <p className={`truncate text-[15px] font-semibold ${struck ? "text-muted-foreground line-through" : "text-foreground"}`}>{name}</p>
        {sub && <p className="truncate text-[13px] text-muted-foreground">{sub}</p>}
        {meta && <p className="truncate text-[12px] text-muted-foreground/80">{meta}</p>}
      </div>
      {badge}
      {trailing}
    </div>
    {children}
    {actions && <div className="mt-3 flex gap-2">{actions}</div>}
  </div>
);
const ActionBtn = ({ kind = "plain", className = "", ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { kind?: "primary" | "danger" | "plain" }) => (
  <button type="button" {...props}
    className={`press inline-flex h-10 flex-1 items-center justify-center gap-1.5 rounded-full px-3 text-[14px] font-medium disabled:opacity-50 ${{
      primary: "bg-primary text-primary-foreground", danger: "bg-destructive/10 text-destructive", plain: "bg-secondary text-foreground" }[kind]} ${className}`} />
);
const StatusPill = ({ status }: { status: string }) => (
  <span className={`shrink-0 rounded-full px-2.5 py-1 text-[12px] font-medium capitalize ${
    ["active", "live", "approved"].includes(status) ? "bg-[#5FD3B5]/25 text-[#0F7A60]"
    : ["rejected", "banned"].includes(status) ? "bg-destructive/10 text-destructive" : "bg-[#F2C98A]/35 text-[#8A5A14]"}`}>{status}</span>
);

// The admin console is split across three bottom-bar tabs so no single screen is crowded.
export type AdminSection = "review" | "manage" | "insights";
const SECTIONS: Record<AdminSection, { title: string; sub: string; tabs: string[] }> = {
  review: { title: "Review", sub: "Everything waiting on an admin", tabs: ["alerts", "scouts", "requests", "contact", "safety"] },
  manage: { title: "Manage", sub: "People, content and platform settings", tabs: ["players", "videos", "notices", "news", "controls"] },
  insights: { title: "Insights", sub: "Platform statistics and the audit trail", tabs: ["stats", "activity", "audit"] },
};

const AdminDashboard = ({ section = "review" }: { section?: AdminSection }) => {
  const sectionCfg = SECTIONS[section];


 const { user, role, loading: authLoading } = useAuth();
 const [scouts, setScouts] = useState<ScoutRow[]>([]);
 const [players, setPlayers] = useState<PlayerRow[]>([]);
 const [videos, setVideos] = useState<VideoRow[]>([]);
 const [messages, setMessages] = useState<MessageRow[]>([]);
 const [scoutRequests, setScoutRequests] = useState<ScoutRequestRow[]>([]);
 const [contactMessages, setContactMessages] = useState<ContactMessageRow[]>([]);
 const [stats, setStats] = useState<Stats | null>(null);
 const [alerts, setAlerts] = useState<ModerationAlertRow[]>([]);
 const [loading, setLoading] = useState(true);
 const [feedbackInputs, setFeedbackInputs] = useState<Record<string, string>>({});
 const [uploadsHalted, setUploadsHalted] = useState(false);
 const [pushDays, setPushDays] = useState(30);
 const [feeOn, setFeeOn] = useState(false);
 const [feeAmount, setFeeAmount] = useState(100);
  const [haltLoading, setHaltLoading] = useState(false);
  // Ban dialog / share dialog state
  const [banTarget, setBanTarget] = useState<{ userId: string; name: string; scope:"profile" |"scout"; lift?: boolean } | null>(null);
  const [removeTarget, setRemoveTarget] = useState<{ id: string; title: string } | null>(null);
  const [shareTarget, setShareTarget] = useState<{ userId: string; name: string } | null>(null);
 // Search & filter states — persisted across reloads via localStorage
 const [scoutSearch, setScoutSearch] = usePersistedString("scoutSearch","");
 const [scoutFilter, setScoutFilter] = usePersistedString("scoutFilter","all");
 const [scoutSort, setScoutSort] = usePersistedString("scoutSort","date_desc");
 const [videoSearch, setVideoSearch] = usePersistedString("videoSearch","");
 const [videoFilter, setVideoFilter] = usePersistedString("videoFilter","all");
 const [videoSort, setVideoSort] = usePersistedString("videoSort","date_desc");
 const [requestSearch, setRequestSearch] = usePersistedString("requestSearch","");
 const [requestFilter, setRequestFilter] = usePersistedString("requestFilter","all");
 const [requestSort, setRequestSort] = usePersistedString("requestSort","date_desc");
 const [messageSearch, setMessageSearch] = usePersistedString("messageSearch","");
 const [messageFilter, setMessageFilter] = usePersistedString("messageFilter","all");
 const [storedTab, setActiveTab] = usePersistedString(`activeTab:${section}`, sectionCfg.tabs[0]);
 const [linkedTab] = useState(() => {
   try { const t = new URLSearchParams(window.location.search).get("tab"); return t && sectionCfg.tabs.includes(t) ? t : null; } catch { return null; }
 });
 useEffect(() => { if (linkedTab) setActiveTab(linkedTab); }, [linkedTab, setActiveTab]);
 // A ?tab= link wins on arrival; after that the admin's own choice sticks.
 const activeTab = sectionCfg.tabs.includes(storedTab) ? storedTab : sectionCfg.tabs[0];
 const navigate = useNavigate();
 const { toast } = useToast();

 useEffect(() => {
 if (authLoading) return;
 if (!user || role !=="admin") { navigate({ to:"/" as any }); return; }
 fetchAll();
 }, [user, role, authLoading]);

 const fetchAll = async () => {
 setLoading(true);
 const [scoutRes, videoRes, roleRes, msgRes, reqRes, settingsRes, contactRes, alertRes] = await Promise.all([
 supabase.from("scout_profiles").select("*").order("created_at", { ascending: false }),
 supabase.from("videos").select("*").order("created_at", { ascending: false }),
 supabase.from("user_roles").select("role, user_id"),
 supabase.from("messages").select("*").order("created_at", { ascending: false }).limit(100),
 supabase.from("scout_requests").select("*").order("created_at", { ascending: false }),
 supabase.from("app_settings" as any).select("key, value"),
 supabase.from("contact_messages" as any).select("*").order("created_at", { ascending: false }),
 supabase.from("moderation_alerts" as any).select("*").order("created_at", { ascending: false }).limit(200),
]);

 const scoutData = scoutRes.data || [];
 const videoData = videoRes.data || [];
 const roles = roleRes.data || [];
 const msgData = msgRes.data || [];
 const reqData = (reqRes.data || []) as ScoutRequestRow[];

 // Parse settings
 const settingsData = (settingsRes.data || []) as any[];
 const haltSetting = settingsData.find((s: any) => s.key ==="video_uploads_halted");
 setUploadsHalted(haltSetting?.value ==="true" || haltSetting?.value === true);
 const feeOnSetting = settingsData.find((x: any) => x.key === "upload_fee_enabled");
 setFeeOn(feeOnSetting?.value === true || feeOnSetting?.value === "true");
 const feeSetting = settingsData.find((x: any) => x.key === "upload_fee_bdt");
 if (feeSetting && Number(feeSetting.value) > 0) setFeeAmount(Number(feeSetting.value));
 const pushSetting = settingsData.find((x: any) => x.key ==="reel_push_days");
 if (pushSetting && Number(pushSetting.value) > 0) setPushDays(Number(pushSetting.value));

 const playerUserIds = roles.filter((r) => r.role ==="player").map((r) => r.user_id);

 const allUserIds = [...new Set([
...scoutData.map((s) => s.user_id),
...videoData.map((v) => v.user_id),
...msgData.flatMap((m) => [m.sender_id, m.receiver_id]),
...reqData.flatMap((r) => [r.scout_id, r.player_id]),
...playerUserIds,
])];

 let profileMap = new Map<string, { name: string; username: string | null; is_banned: boolean; sport?: string | null }>();
 if (allUserIds.length > 0) {
 const { data: profiles } = await supabase.from("profiles").select("user_id, full_name, username, is_banned, sport").in("user_id", allUserIds);
 (profiles || []).forEach((p) => profileMap.set(p.user_id, {
 name: p.full_name,
 username: (p as any).username ?? null,
 is_banned: (p as any).is_banned || false,
 sport: (p as any).sport,
 }));
 }

 // Admin-only helper: pull emails so the moderation search can match by email too.
 const emailMap = new Map<string, string>();
 const { data: emailRows } = await supabase.rpc("get_admin_user_emails" as any);
 ((emailRows as any[]) || []).forEach((r) => emailMap.set(r.user_id, r.email));

 setScouts(scoutData.map((s) => ({
...s,
 full_name: profileMap.get(s.user_id)?.name ||"Unknown",
 username: profileMap.get(s.user_id)?.username ?? null,
 email: emailMap.get(s.user_id) ?? null,
 is_banned: (s as any).is_banned || false,
 })));
 setPlayers(playerUserIds.map((uid) => ({
 user_id: uid,
 full_name: profileMap.get(uid)?.name ||"Unknown",
 username: profileMap.get(uid)?.username ?? null,
 email: emailMap.get(uid) ?? null,
 is_banned: profileMap.get(uid)?.is_banned || false,
 sport: profileMap.get(uid)?.sport,
 })));
 setVideos(videoData.map((v) => ({
...v,
 full_name: profileMap.get(v.user_id)?.name ||"Unknown",
 username: profileMap.get(v.user_id)?.username ?? null,
 email: emailMap.get(v.user_id) ?? null,
 })));
 setMessages(msgData.map((m) => ({...m, sender_name: profileMap.get(m.sender_id)?.name ||"Unknown", receiver_name: profileMap.get(m.receiver_id)?.name ||"Unknown" })));
 setScoutRequests(reqData.map((r) => ({
...r,
 scout_name: profileMap.get(r.scout_id)?.name ||"Unknown",
 player_name: profileMap.get(r.player_id)?.name ||"Unknown",
 scout_username: profileMap.get(r.scout_id)?.username ?? null,
 player_username: profileMap.get(r.player_id)?.username ?? null,
 scout_email: emailMap.get(r.scout_id) ?? null,
 player_email: emailMap.get(r.player_id) ?? null,
 })));

 const contactData = ((contactRes.data as unknown) as ContactMessageRow[]) || [];
 setContactMessages(contactData);

 const alertRows = ((alertRes.data as unknown) as ModerationAlertRow[]) || [];
 const enrichedAlerts = alertRows.map((a) => ({
...a,
 target_name: (a.target_user_id && profileMap.get(a.target_user_id)?.name) ||"Unknown",
 target_email: (a.target_user_id && emailMap.get(a.target_user_id)) || null,
 }));
 setAlerts(enrichedAlerts);

 setStats({
 totalPlayers: roles.filter((r) => r.role ==="player").length,
 totalScouts: roles.filter((r) => r.role ==="scout").length,
 activeScouts: scoutData.filter((s) => s.verification_status ==="active").length,
 pendingScouts: scoutData.filter((s) => s.verification_status ==="pending").length,
 liveVideos: videoData.filter((v) => v.status ==="live").length,
 flaggedMessages: msgData.filter((m) => m.flagged).length,
 pendingRequests: reqData.filter((r) => r.status ==="pending").length,
 unreadContacts: contactData.filter((c) => !c.is_read).length,
 openAlerts: enrichedAlerts.filter((a) => a.status ==="new").length,
 });
 setLoading(false);
 };

 const resolveAlert = async (id: string) => {
 const { error } = await supabase
.from("moderation_alerts" as any)
.update({ status:"resolved", resolved_at: new Date().toISOString(), resolved_by: user?.id } as any)
.eq("id", id);
 if (error) toast({ title:"Error", description: error.message, variant:"destructive" });
 else { toast({ title:"Alert resolved" }); fetchAll(); }
 };

 const reopenAlert = async (id: string) => {
 const { error } = await supabase
.from("moderation_alerts" as any)
.update({ status:"new", resolved_at: null, resolved_by: null } as any)
.eq("id", id);
 if (error) toast({ title:"Error", description: error.message, variant:"destructive" });
 else fetchAll();
 };

 const toggleContactRead = async (id: string, isRead: boolean) => {
 const { error } = await supabase.from("contact_messages" as any).update({ is_read: !isRead } as any).eq("id", id);
 if (error) toast({ title:"Error", description: error.message, variant:"destructive" });
 else fetchAll();
 };

 const deleteContact = async (id: string) => {
 const { error } = await supabase.from("contact_messages" as any).delete().eq("id", id);
 if (error) toast({ title:"Error", description: error.message, variant:"destructive" });
 else { toast({ title:"Message deleted" }); fetchAll(); }
 };

 const updateScoutStatus = async (scoutId: string, status:"active" |"rejected", scoutUserId?: string) => {
 const { error } = await supabase.from("scout_profiles").update({ verification_status: status }).eq("id", scoutId);
 if (error) { toast({ title:"Error", description: error.message, variant:"destructive" }); return; }
 if (scoutUserId) {
 await supabase.from("notifications").insert({
 user_id: scoutUserId,
 type: "scout_verification",
 title: status === "active" ? "You're verified" : "Scout application not approved",
 message: status === "active"
 ? "Your scout account is approved. You can now explore players and send requests through Cholo Kheli."
 : "We couldn't verify your scout application. Open Messages in Settings to talk to the team.",
 });
 }
 toast({ title: `Scout ${status ==="active" ?"approved" :"rejected"}` }); fetchAll();
 };

  // Lifting or applying a restriction both go through the moderation dialog, so the user always gets a notice.
  const banScout = (scoutUserId: string, banned: boolean, name: string) => setBanTarget({ userId: scoutUserId, name, scope: "scout", lift: banned });
  const banPlayer = (playerUserId: string, banned: boolean, name: string) => setBanTarget({ userId: playerUserId, name, scope: "profile", lift: banned });

 const saveFee = async (patch: { on?: boolean; amount?: number }) => {
 const prevOn = feeOn, prevAmt = feeAmount;
 if (patch.on !== undefined) setFeeOn(patch.on);
 if (patch.amount !== undefined) setFeeAmount(patch.amount);
 const writes = [];
 if (patch.on !== undefined) writes.push(supabase.from("app_settings" as any).update({ value: patch.on, updated_by: user?.id } as any).eq("key", "upload_fee_enabled"));
 if (patch.amount !== undefined) writes.push(supabase.from("app_settings" as any).update({ value: patch.amount, updated_by: user?.id } as any).eq("key", "upload_fee_bdt"));
 const res = await Promise.all(writes);
 const err = res.find((r: any) => r.error)?.error;
 if (err) { setFeeOn(prevOn); setFeeAmount(prevAmt); toast({ title: "Couldn't save", description: err.message, variant: "destructive" }); }
 else toast({ title: patch.on === false ? "Uploads are free again" : patch.on ? "Upload fee switched on" : "Upload fee updated" });
 };

 const savePushDays = async (days: number) => {
 const prev = pushDays; setPushDays(days);
 const { error } = await supabase.from("app_settings" as any).update({ value: days, updated_by: user?.id } as any).eq("key", "reel_push_days");
 if (error) { setPushDays(prev); toast({ title:"Couldn't save", description: error.message, variant:"destructive" }); }
 else toast({ title: `Reels now stay in the feed for ${days} days` });
 };

 const toggleUploadsHalt = async () => {
 setHaltLoading(true);
 const newVal = !uploadsHalted ?"true" :"false";
 const { error } = await supabase.from("app_settings" as any).update({ value: newVal, updated_by: user?.id } as any).eq("key","video_uploads_halted");
 if (error) toast({ title:"Error", description: error.message, variant:"destructive" });
 else { setUploadsHalted(!uploadsHalted); toast({ title: !uploadsHalted ?"Video uploads halted" :"Video uploads resumed" }); }
 setHaltLoading(false);
 };

 // Rejecting asks for a reason that the player is sent; approving a removed video restores it and tells them.
 const updateVideoStatus = async (videoId: string, status:"live" |"rejected") => {
 const v = videos.find((x) => x.id === videoId);
 if (status === "rejected") { setRemoveTarget({ id: videoId, title: (v as { title?: string } | undefined)?.title ?? "Highlight" }); return; }
 const { error } = v?.status === "rejected"
   ? await supabase.rpc("admin_restore_video" as never, { _video_id: videoId, _note: null } as never)
   : await supabase.from("videos").update({ status: "live", flagged: false, flag_reason: null }).eq("id", videoId);
 if (error) { toast({ title:"Error", description: error.message, variant:"destructive" }); }
 else { toast({ title: "Video approved" }); fetchAll(); }
 };

 const toggleFlag = async (msgId: string, currentlyFlagged: boolean) => {
 const { error } = await supabase.from("messages").update({ flagged: !currentlyFlagged, flag_reason: !currentlyFlagged ?"Flagged by admin for review" : null }).eq("id", msgId);
 if (error) { toast({ title:"Error", description: error.message, variant:"destructive" }); }
 else { toast({ title: !currentlyFlagged ?"Message flagged" :"Flag removed" }); fetchAll(); }
 };

 const handleScoutRequest = async (reqId: string, status:"approved" |"rejected", playerId: string, playerName: string, scoutName: string, scoutId: string) => {
 const { error } = await supabase.from("scout_requests").update({ status, admin_response: status ==="approved" ?"Player details forwarded" :"Request denied" } as any).eq("id", reqId);
 if (error) { toast({ title:"Error", description: error.message, variant:"destructive" }); return; }

 if (status ==="approved") {
 // Get full player details to forward to scout
 const [{ data: playerPublic }, { data: playerPrivate }] = await Promise.all([
 supabase.from("profiles").select("*").eq("user_id", playerId).maybeSingle(),
 supabase.from("profile_private").select("phone, date_of_birth, guardian_contact").eq("user_id", playerId).maybeSingle(),
 ]);
 const playerProfile = playerPublic ? { ...playerPublic, phone: playerPrivate?.phone ?? null, date_of_birth: playerPrivate?.date_of_birth ?? null, guardian_contact: playerPrivate?.guardian_contact ?? null } : null;
 const playerDetails = playerProfile
 ? `Name: ${playerProfile.full_name}\nPhone: ${playerProfile.phone ||"N/A"}\nSport: ${playerProfile.sport ||"N/A"}\nGender: ${playerProfile.gender ||"N/A"}\nDOB: ${playerProfile.date_of_birth ||"N/A"}\nGuardian: ${playerProfile.guardian_contact ||"N/A"}\nBio: ${playerProfile.bio ||"N/A"}`
 :"Player details unavailable";

 // Notify SCOUT with full player details (scout-only, not visible to players)
 await supabase.from("notifications").insert({
 user_id: scoutId,
 title: ` Player Details: ${playerName}`,
 message: playerDetails,
 type:"selection",
 metadata: {
 player_id: playerId,
 player_name: playerName,
 phone: playerProfile?.phone,
 sport: playerProfile?.sport,
 gender: playerProfile?.gender,
 dob: playerProfile?.date_of_birth,
 guardian: playerProfile?.guardian_contact,
 bio: playerProfile?.bio,
 avatar_url: playerProfile?.avatar_url,
 },
 } as any);

 // Notify PLAYER (congratulations only — no private details exposed)
 await supabase.from("notifications").insert({
 user_id: playerId,
 title:" Congratulations! You've been selected!",
 message: `A scout (${scoutName}) has shown interest in you! Your details have been shared. Keep up the great work!`,
 type:"selection",
 } as any);
 } else {
 // Rejected: notify both player and scout so scout sees a decision landed
 await supabase.from("notifications").insert({
 user_id: playerId,
 title:" Scouting Update",
 message: `A scout reviewed your profile but decided not to proceed at this time. Keep improving and uploading new highlights!`,
 type:"feedback",
 } as any);
 await supabase.from("notifications").insert({
 user_id: scoutId,
 title:"Request declined",
 message: `Your request for ${playerName} was declined by the admin.`,
 type:"selection",
 metadata: { player_id: playerId, player_name: playerName, status: "rejected" },
 } as any);
 }

 toast({ title: `Request ${status}.`, description: status ==="approved" ?"Player details forwarded to scout. Player notified." :"Player notified." });
 fetchAll();
 };

 const sendPersonalizedFeedback = async (reqId: string, scoutId: string, scoutName: string, playerId: string, playerName: string) => {
 const feedback = feedbackInputs[reqId];
 if (!feedback?.trim()) return;

 // Send feedback to PLAYER
 await supabase.from("notifications").insert({
 user_id: playerId,
 title:" Personalized Feedback from Admin",
 message: feedback,
 type:"feedback",
 } as any);

 // Also send feedback context to SCOUT so they know admin responded
 await supabase.from("notifications").insert({
 user_id: scoutId,
 title: ` Admin Note on ${playerName}`,
 message: `Admin feedback regarding your request for ${playerName}:"${feedback}"`,
 type:"feedback",
 } as any);

 toast({ title: `Feedback sent to ${playerName} and noted to ${scoutName}` });
 setFeedbackInputs((prev) => ({...prev, [reqId]:"" }));
 };

 // Sort helpers
 const sortByDate = (a: any, b: any, dir:"asc" |"desc") => {
 const da = new Date(a.created_at).getTime();
 const db = new Date(b.created_at).getTime();
 return dir ==="asc" ? da - db : db - da;
 };
 const sortByStr = (a: string, b: string, dir:"asc" |"desc") =>
 dir ==="asc" ? (a ||"").localeCompare(b ||"") : (b ||"").localeCompare(a ||"");
 const statusRank: Record<string, number> = { pending: 0, pending_payment: 0, draft: 1, live: 2, approved: 2, active: 2, rejected: 3 };
 const sortByStatus = (a: string, b: string, dir:"asc" |"desc") => {
 const ra = statusRank[a] ?? 99; const rb = statusRank[b] ?? 99;
 return dir ==="asc" ? ra - rb : rb - ra;
 };
 const applySort = <T extends any>(rows: T[], sort: string, statusKey: keyof T, targetKey: keyof T): T[] => {
 const [field, dir] = sort.split("_") as [string,"asc" |"desc"];
 const arr = [...rows];
 if (field ==="date") arr.sort((a: any, b: any) => sortByDate(a, b, dir));
 else if (field ==="status") arr.sort((a: any, b: any) => sortByStatus(a[statusKey], b[statusKey], dir) || sortByDate(a, b,"desc"));
 else if (field ==="target") arr.sort((a: any, b: any) => sortByStr(a[targetKey], b[targetKey], dir) || sortByDate(a, b,"desc"));
 return arr;
 };

 // Case-insensitive substring match across a bundle of fields (name/email/username/etc.)
 const matchAny = (needle: string, hay: (string | null | undefined)[]): boolean => {
 if (!needle) return true;
 const q = needle.trim().toLowerCase();
 if (!q) return true;
 return hay.some((v) => (v ||"").toLowerCase().includes(q));
 };

 // Filtered + sorted data
 const filteredScouts = applySort(
 scouts.filter((s) => {
 const matchSearch = matchAny(scoutSearch, [s.full_name, s.organization, s.username, s.email]);
 const matchFilter = scoutFilter ==="all" || s.verification_status === scoutFilter;
 return matchSearch && matchFilter;
 }),
 scoutSort,"verification_status" as any,"full_name" as any,
);

 const filteredVideos = applySort(
 videos.filter((v) => {
 const matchSearch = matchAny(videoSearch, [v.full_name, v.description, v.username, v.email]);
 const matchFilter = videoFilter ==="all" || v.status === videoFilter;
 return matchSearch && matchFilter;
 }),
 videoSort,"status" as any,"full_name" as any,
);

 const filteredRequests = applySort(
 scoutRequests.filter((r) => {
 const matchSearch = matchAny(requestSearch, [
 r.scout_name, r.player_name, r.scout_username, r.player_username, r.scout_email, r.player_email,
]);
 const matchFilter = requestFilter ==="all" || r.status === requestFilter;
 return matchSearch && matchFilter;
 }),
 requestSort,"status" as any,"player_name" as any,
);

 const filteredMessages = messages.filter((m) => {
 const matchSearch = !messageSearch || m.sender_name?.toLowerCase().includes(messageSearch.toLowerCase()) || m.receiver_name?.toLowerCase().includes(messageSearch.toLowerCase()) || m.content.toLowerCase().includes(messageSearch.toLowerCase());
 const matchFilter = messageFilter ==="all" || (messageFilter ==="flagged" && m.flagged) || (messageFilter ==="clean" && !m.flagged);
 return matchSearch && matchFilter;
 });

 if (authLoading || loading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;




  const count = (n?: number) => (n ? ` (${n})` : "");
 const tabLabel = (t: string): string => ({
   alerts: `Inbox${count(stats?.openAlerts)}`,
   scouts: `Scouts${count(stats?.pendingScouts)}`,
   requests: `Requests${count(stats?.pendingRequests)}`,
   contact: `Contact${count(stats?.unreadContacts)}`,
   safety: `Safety${count(stats?.flaggedMessages)}`,
   players: "Players", videos: "Videos", notices: "Notifications", news: "News", controls: "Controls", profile: "My profile",
   stats: "Overview", activity: "Activity log", audit: "Usernames",
 } as Record<string, string>)[t] ?? t;

 return (
    <div className="pb-8">
      <div className="container">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-2 mb-4 pt-2">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl grid place-items-center" style={{ background: "linear-gradient(135deg, hsl(var(--teal-deep)) 0%, hsl(174 100% 24%) 100%)", boxShadow: "inset 0 1px 0 rgba(255,255,255,0.25)" }}>
                <Shield className="h-5 w-5 text-white" />
              </div>
              <div>
                <h1 className="font-display text-2xl sm:text-3xl text-foreground leading-none">{sectionCfg.title}</h1>
                <p className="text-xs text-muted-foreground mt-1">{sectionCfg.sub}</p>
              </div>
            </div>
          </div>


          <Tabs value={activeTab} onValueChange={setActiveTab} className="lg:flex lg:gap-6 space-y-4 lg:space-y-0" orientation="vertical">
            {/* Sidebar (desktop) / scrollable pill row (mobile) */}
            <div className="lg:w-56 lg:shrink-0">
              <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0 lg:overflow-visible lg:sticky lg:top-20">
                <TabsList className="bg-card border border-border rounded-2xl p-1.5 flex w-max min-w-full lg:w-full lg:flex-col lg:items-stretch lg:h-auto lg:gap-1">
                  {sectionCfg.tabs.map((t) => (
                    <TabsTrigger key={t} value={t} data-testid={`tab-${t}`}
                      className="flex-1 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground text-xs whitespace-nowrap px-3 lg:flex-none lg:justify-start lg:rounded-xl lg:py-2.5">
                      {tabLabel(t)}
                    </TabsTrigger>
                  ))}
                </TabsList>
              </div>
            </div>

            {/* Content pane */}
            <div className="flex-1 min-w-0 space-y-4">


 {/* Moderation Alerts Inbox */}
 <TabsContent value="alerts" className="space-y-3">
 <div className="rounded-[22px] bg-card p-4 flex items-start gap-3">
 <AlertTriangle className="h-5 w-5 text-primary shrink-0 mt-0.5" />
 <p className="text-sm text-muted-foreground">
 New scout requests, videos, and scout signups that need review. Mark items resolved once you've actioned them.
 </p>
 </div>
 {alerts.filter((a) => a.status ==="new").length === 0 ? (
 <p className="text-muted-foreground text-center py-12" data-testid="alerts-empty-new">No open alerts.</p>
) : (
 <div className="space-y-2">{alerts.filter((a) => a.status ==="new").map((a) => (
 <AdminCard key={a.id} data-testid="alert-row" data-alert-id={a.id} data-alert-kind={a.kind} data-alert-status={a.status}
   tone={a.kind === "video" ? "sky" : a.kind === "scout_request" ? "mint" : "sand"}
   name={a.target_name || "Unknown"}
   sub={<><span className="font-medium text-foreground/80">{a.kind ==="scout_request" ?"Request" : a.kind ==="video" ?"Video" :"Scout"}</span>{a.target_email ? ` · ${a.target_email}` : ""}</>}
   meta={new Date(a.created_at).toLocaleString()}
   trailing={
     <button type="button" onClick={() => resolveAlert(a.id)} data-testid="alert-resolve" aria-label="Mark resolved"
       className="press grid h-10 w-10 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground">
       <CheckCircle className="h-5 w-5" />
     </button>} />
))}</div>
)}
 {alerts.some((a) => a.status ==="resolved") && (
 <details className="pt-2">
 <summary className="text-xs text-muted-foreground cursor-pointer hover:text-foreground" data-testid="alerts-resolved-toggle">
 Recently resolved ({alerts.filter((a) => a.status ==="resolved").length})
 </summary>
 <div className="space-y-2 mt-2">
 {alerts.filter((a) => a.status ==="resolved").slice(0, 30).map((a) => (
 <div key={a.id} data-testid="alert-row" data-alert-id={a.id} data-alert-kind={a.kind} data-alert-status={a.status}
 className="bg-secondary/50 border border-border rounded-xl p-3 flex items-center justify-between gap-3">
 <div className="flex-1 min-w-0">
 <p className="text-xs font-medium text-muted-foreground truncate">
 <span className=" mr-2">{a.kind}</span>{a.target_name}
 </p>
 <p className="text-[10px] text-muted-foreground">Resolved {a.resolved_at ? new Date(a.resolved_at).toLocaleString() :""}</p>
 </div>
 <Button size="sm" variant="outline" onClick={() => reopenAlert(a.id)} data-testid="alert-reopen"
 className="rounded-full text-xs border-border text-muted-foreground shrink-0">
 Reopen
 </Button>
 </div>
))}
 </div>
 </details>
)}
 </TabsContent>

 {/* Scouts Tab */}
 <TabsContent value="scouts" className="space-y-3">
 <SearchFilterBar testKey="scouts" search={scoutSearch} setSearch={setScoutSearch} filter={scoutFilter} setFilter={setScoutFilter} placeholder="Search scouts by name, email, or username..."
 sort={scoutSort} setSort={setScoutSort}
 filters={[{ value:"pending", label:"Pending" }, { value:"active", label:"Active" }, { value:"rejected", label:"Rejected" }]} />
 {filteredScouts.length === 0 ? <p className="text-muted-foreground text-center py-12">No scouts found.</p> : <div className="space-y-2">{filteredScouts.map((s) => (
 <AdminCard key={s.id} data-testid="mod-row-scouts" data-account={s.full_name ||""} data-status={s.verification_status} data-created-at={s.created_at}
   tone="mint" name={s.full_name || "Scout"} struck={s.is_banned}
   sub={s.organization || "No organisation"} meta={`Joined ${new Date(s.created_at).toLocaleDateString()}${s.is_banned ? " · Banned" : ""}`}
   badge={<StatusPill status={s.verification_status} />}
   actions={<>
     {s.verification_status ==="pending" && <>
       <ActionBtn kind="primary" onClick={() => updateScoutStatus(s.id,"active", s.user_id)}>Approve</ActionBtn>
       <ActionBtn onClick={() => updateScoutStatus(s.id,"rejected", s.user_id)}>Reject</ActionBtn>
     </>}
     <ActionBtn kind={s.is_banned ? "plain" : "danger"} onClick={() => banScout(s.user_id, s.is_banned || false, s.full_name ||"scout")}>
       <Ban className="h-4 w-4" />{s.is_banned ?"Unban" :"Ban"}
     </ActionBtn>
   </>}>
   {s.verification_status !=="active" && <div className="mt-3"><ScoutDocuments userId={s.user_id} /></div>}
 </AdminCard>
))}</div>}
 </TabsContent>

 {/* Players Tab */}
 <TabsContent value="players" className="space-y-3">
 <p className="text-xs text-muted-foreground mb-2">{players.length} registered players</p>
 {players.length === 0 ? <p className="text-muted-foreground text-center py-12">No players found.</p> : <div className="space-y-2">{players.map((p) => (
 <AdminCard key={p.user_id} name={p.full_name || "Player"} struck={p.is_banned}
   sub={<span className="capitalize">{p.sport || "No sport"}</span>} meta={p.is_banned ? "Banned" : undefined}
   trailing={<button type="button" onClick={() => navigate({ to: `/resume/${p.user_id}` as any })} aria-label={`Open ${p.full_name}'s profile`}
     className="press grid h-10 w-10 shrink-0 place-items-center rounded-full bg-secondary"><Eye className="h-[18px] w-[18px]" /></button>}
   actions={<>
     <ActionBtn kind="primary" onClick={() => setShareTarget({ userId: p.user_id, name: p.full_name })}><Send className="h-4 w-4" /> Share to scout</ActionBtn>
     <ActionBtn kind={p.is_banned ? "plain" : "danger"} onClick={() => banPlayer(p.user_id, p.is_banned || false, p.full_name)}><Ban className="h-4 w-4" />{p.is_banned ?"Unban" :"Ban"}</ActionBtn>
   </>} />
))}</div>}
 </TabsContent>

 {/* Videos Tab */}
 <TabsContent value="videos" className="space-y-3">
 <SearchFilterBar testKey="videos" search={videoSearch} setSearch={setVideoSearch} filter={videoFilter} setFilter={setVideoFilter} placeholder="Search videos by uploader name, email, or username..."
 sort={videoSort} setSort={setVideoSort}
 filters={[{ value:"live", label:"Live" }, { value:"rejected", label:"Rejected" }, { value:"draft", label:"Draft" }]} />
 {filteredVideos.length === 0 ? <p className="text-muted-foreground text-center py-12">No videos found.</p> : <div className="space-y-2">{filteredVideos.map((v) => (
 <AdminCard key={v.id} data-testid="mod-row-videos" data-account={v.full_name ||""} data-status={v.status} data-created-at={v.created_at}
   name={v.full_name || "Player"} sub={v.description || "No description"} meta={new Date(v.created_at).toLocaleDateString()}
   badge={<StatusPill status={v.status} />}
   trailing={v.video_url ? <button type="button" onClick={() => navigate({ to: `/resume/${v.user_id}` as any })} aria-label="View"
     className="press grid h-10 w-10 shrink-0 place-items-center rounded-full bg-secondary"><Eye className="h-[18px] w-[18px]" /></button> : undefined}
   actions={(v.status ==="pending_payment" || v.status ==="draft") ? <>
     <ActionBtn kind="primary" onClick={() => updateVideoStatus(v.id,"live")}>Approve</ActionBtn>
     <ActionBtn kind="danger" onClick={() => updateVideoStatus(v.id,"rejected")}>Reject</ActionBtn>
   </> : undefined} />
))}</div>}
 </TabsContent>

 {/* Scout Requests Tab */}
 <TabsContent value="requests" className="space-y-3">
 <SearchFilterBar testKey="requests" search={requestSearch} setSearch={setRequestSearch} filter={requestFilter} setFilter={setRequestFilter} placeholder="Search requests by scout or player name, email, or username..."
 sort={requestSort} setSort={setRequestSort}
 filters={[{ value:"pending", label:"Pending" }, { value:"approved", label:"Approved" }, { value:"rejected", label:"Rejected" }]} />
 {filteredRequests.length === 0 ? <p className="text-muted-foreground text-center py-12">No requests found.</p> : <div className="space-y-2">{filteredRequests.map((r) => (
 <AdminCard key={r.id} data-testid="mod-row-requests" data-account={r.player_name ||""} data-scout={r.scout_name ||""} data-status={r.status} data-created-at={r.created_at}
   tone="mint" name={`${r.scout_name} → ${r.player_name}`} sub={r.notes || "No notes"} meta={new Date(r.created_at).toLocaleDateString()}
   badge={<StatusPill status={r.status} />}
   actions={r.status ==="pending" ? <>
     <ActionBtn kind="primary" onClick={() => handleScoutRequest(r.id,"approved", r.player_id, r.player_name ||"", r.scout_name ||"", r.scout_id)}>Approve & Forward</ActionBtn>
     <ActionBtn kind="danger" onClick={() => handleScoutRequest(r.id,"rejected", r.player_id, r.player_name ||"", r.scout_name ||"", r.scout_id)}>Reject</ActionBtn>
   </> : undefined}>
   <div className="mt-3 flex gap-2">
     <Input placeholder={`Feedback to ${r.player_name}...`} className="h-10 rounded-full border-0 bg-secondary text-sm" value={feedbackInputs[r.id] ||""} onChange={(e) => setFeedbackInputs((prev) => ({...prev, [r.id]: e.target.value }))} />
     <button type="button" aria-label="Send feedback" onClick={() => sendPersonalizedFeedback(r.id, r.scout_id, r.scout_name ||"", r.player_id, r.player_name ||"")}
       className="press grid h-10 w-10 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground"><Send className="h-4 w-4" /></button>
   </div>
 </AdminCard>
))}</div>}
 </TabsContent>
 <TabsContent value="safety" className="space-y-3">
 <div className="rounded-[22px] bg-card p-4 flex items-start gap-3">
 <AlertTriangle className="h-5 w-5 text-primary shrink-0 mt-0.5" />
 <p className="text-sm text-muted-foreground">Every scout and player conversation. Open one to read it, see reported messages, or close it.</p>
 </div>
 <AdminSafety />
 </TabsContent>

 {/* Controls Tab */}
  <TabsContent value="controls" className="space-y-2">
 <div className="flex items-center gap-3 rounded-[22px] bg-card p-3.5">
   <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-full ${uploadsHalted ? "bg-destructive/15 text-destructive" : "bg-[#5FD3B5]/25 text-[#0F7A60]"}`}><Power className="h-5 w-5" /></span>
   <div className="min-w-0 flex-1">
     <p className="text-[15px] font-semibold">Video uploads</p>
     <p className="text-[13px] text-muted-foreground">{uploadsHalted ? "Halted. Players see a pause message." : "Players can upload highlights."}</p>
   </div>
   <button type="button" onClick={toggleUploadsHalt} disabled={haltLoading}
     className={`press inline-flex h-10 shrink-0 items-center gap-1.5 rounded-full px-4 text-[14px] font-medium ${uploadsHalted ? "bg-primary text-primary-foreground" : "bg-destructive/10 text-destructive"}`}>
     {haltLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Power className="h-4 w-4" />}{uploadsHalted ?"Resume Uploads" :"Halt Uploads"}
   </button>
 </div>
 <div className="flex items-center gap-3 rounded-[22px] bg-card p-3.5">
   <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-[#7EC8FF]/25 text-[#13738F]"><Clock className="h-5 w-5" /></span>
   <div className="min-w-0 flex-1">
     <p className="text-[15px] font-semibold">Reel push window</p>
     <p className="text-[13px] text-muted-foreground">Reels leave the main feed after this many days. Search and profiles still show them.</p>
   </div>
   <select aria-label="Reel push window in days" value={pushDays} onChange={(e) => savePushDays(Number(e.target.value))}
     className="h-10 shrink-0 rounded-full bg-secondary px-3 text-[14px] font-medium">
     {[7, 14, 30, 60, 90, 180, 365].map((d) => <option key={d} value={d}>{d} days</option>)}
   </select>
 </div>
 <div className="flex items-center gap-3 rounded-[22px] bg-card p-3.5">
   <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-[#E2136E]/15 text-[13px] font-bold text-[#E2136E]">৳</span>
   <div className="min-w-0 flex-1">
     <p className="text-[15px] font-semibold">Upload fee (bKash)</p>
     <p className="text-[13px] text-muted-foreground">{feeOn ? "New highlights go live after the player pays. They get an invoice and a certificate." : "Off: uploads are free and go live at once."}</p>
   </div>
   <select aria-label="Upload fee in taka" value={feeAmount} onChange={(e) => saveFee({ amount: Number(e.target.value) })}
     className="h-10 shrink-0 rounded-full bg-secondary px-3 text-[14px] font-medium">
     {[50, 100, 150, 200].map((a) => <option key={a} value={a}>৳{a}</option>)}
   </select>
   <button type="button" role="switch" aria-checked={feeOn} aria-label="Charge an upload fee" onClick={() => saveFee({ on: !feeOn })}
     className={`relative h-8 w-[52px] shrink-0 rounded-full transition-colors ${feeOn ? "bg-[#1E9E6A]" : "bg-secondary"}`}>
     <span className={`absolute top-1 h-6 w-6 rounded-full bg-white shadow transition-all ${feeOn ? "left-[24px]" : "left-1"}`} />
   </button>
 </div>
 </TabsContent>

 {/* News Tab */}
 <TabsContent value="news">
 <AdminNewsManager />
 </TabsContent>

 {/* Notices Tab */}
 <TabsContent value="notices">
 <AdminNoticeForm />
 </TabsContent>

 {/* Contact Messages Tab */}
 <TabsContent value="contact" className="space-y-3">
 <div className="rounded-[22px] bg-card p-4 flex items-start gap-3">
 <Mail className="h-5 w-5 text-primary shrink-0 mt-0.5" />
 <p className="text-sm text-muted-foreground">
 Messages submitted through the public Contact Us form. Click the email address to reply directly from your mail client.
 </p>
 </div>
 {contactMessages.length === 0 ? (
 <p className="text-muted-foreground text-center py-12">No contact messages yet.</p>
) : (
 <div className="space-y-2">{contactMessages.map((c) => (
 <AdminCard key={c.id} tone="sand" name={c.name || "Visitor"}
   sub={<a href={`mailto:${c.email}?subject=Re: ${encodeURIComponent(c.subject ||"Your message to Cholo Kheli")}`} className="text-primary hover:underline">{c.email}</a>}
   meta={new Date(c.created_at).toLocaleString()}
   badge={!c.is_read ? <span className="shrink-0 rounded-full bg-primary px-2.5 py-1 text-[12px] font-semibold text-primary-foreground">New</span> : undefined}
   actions={<>
     <a href={`mailto:${c.email}?subject=Re: ${encodeURIComponent(c.subject ||"Your message to Cholo Kheli")}`}
       className="press inline-flex h-10 flex-1 items-center justify-center gap-1.5 rounded-full bg-primary px-3 text-[14px] font-medium text-primary-foreground"><Send className="h-4 w-4" /> Reply</a>
     <ActionBtn onClick={() => toggleContactRead(c.id, c.is_read)}><CheckCircle className="h-4 w-4" /> {c.is_read ?"Mark unread" :"Mark read"}</ActionBtn>
     <button type="button" aria-label="Delete message" onClick={() => deleteContact(c.id)}
       className="press grid h-10 w-10 shrink-0 place-items-center rounded-full bg-destructive/10 text-destructive"><Trash2 className="h-4 w-4" /></button>
   </>}>
   <div className="mt-3 rounded-[16px] bg-secondary px-3.5 py-3">
     {c.subject && <p className="text-[14px] font-semibold">{c.subject}</p>}
     <p className="whitespace-pre-wrap text-[14px] text-muted-foreground">{c.message}</p>
   </div>
 </AdminCard>
))}</div>
)}
 </TabsContent>

 {/* Profile Tab */}
 <TabsContent value="profile">
 <ProfileTab />
 </TabsContent>

 {/* Username Audit Tab */}
 <TabsContent value="audit">
 <UsernameAuditTab />
  </TabsContent>
 <TabsContent value="stats">
   <AdminStats />
 </TabsContent>
 <TabsContent value="activity">
   <AdminAuditLog />
 </TabsContent>
            </div>
          </Tabs>

 </motion.div>
 </div>

 {banTarget && (
   <BanDialog
     open={!!banTarget}
     onOpenChange={(v) => { if (!v) setBanTarget(null); }}
     targetUserId={banTarget.userId}
     targetName={banTarget.name}
     scope={banTarget.scope}
     initialAction={banTarget.lift ? "unban" : "suspend"}
     onDone={fetchAll}
   />
 )}
 {removeTarget && (
   <RemoveVideoDialog videoId={removeTarget.id} title={removeTarget.title} open
     onOpenChange={(o) => { if (!o) setRemoveTarget(null); }} onDone={fetchAll} />
 )}
 {shareTarget && (
   <ShareToScoutDialog
     open={!!shareTarget}
     onOpenChange={(v) => { if (!v) setShareTarget(null); }}
     playerId={shareTarget.userId}
     playerName={shareTarget.name}
   />
 )}
 </div>
);
};

export default AdminDashboard;
