import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { AlertTriangle, Ban, Clock, Film, Loader2, ShieldCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import SettingsShell from "@/components/settings/SettingsShell";
import { SettingsSection } from "@/components/settings/SettingsControls";

type Notice = { id: string; title: string; message: string | null; type: string; created_at: string };
type Removed = { id: string; title: string | null; flag_reason: string | null; created_at: string };

/** Your standing: any active restriction, warnings you've received, and highlights the team removed. */
const AccountStatusPage = () => {
  const { user, role } = useAuth();
  const [notices, setNotices] = useState<Notice[] | null>(null);
  const [removed, setRemoved] = useState<Removed[]>([]);
  const [ban, setBan] = useState<{ ban_reason: string | null; ban_message: string | null; banned_until: string | null } | null>(null);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const [n, v, b] = await Promise.all([
        supabase.from("notifications").select("id, title, message, type, created_at").eq("user_id", user.id)
          .in("type", ["account_notice", "video_removed", "video_restored"]).order("created_at", { ascending: false }).limit(50),
        supabase.from("videos").select("id, title, flag_reason, created_at").eq("user_id", user.id).eq("status", "rejected").order("created_at", { ascending: false }),
        supabase.rpc("get_my_ban_status"),
      ]);
      setNotices((n.data ?? []) as Notice[]);
      setRemoved((v.data ?? []) as Removed[]);
      const row = ((b.data ?? []) as { is_banned: boolean; ban_reason: string | null; ban_message: string | null; banned_until: string | null }[])[0];
      setBan(row?.is_banned ? row : null);
    })();
  }, [user]);

  if (notices === null) return <SettingsShell title="Account status"><div className="grid place-items-center py-16"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div></SettingsShell>;

  const clean = !ban && removed.length === 0 && notices.filter((n) => n.type === "account_notice").length === 0;
  return (
    <SettingsShell title="Account status" description="Your account's standing with Cholo Kheli">
      {ban ? (
        <div className="ios-group p-5">
          <div className="flex items-start gap-3">
            {ban.banned_until ? <Clock className="h-6 w-6 shrink-0 text-destructive" /> : <Ban className="h-6 w-6 shrink-0 text-destructive" />}
            <div>
              <p className="headline">{ban.banned_until ? `Suspended until ${new Date(ban.banned_until).toLocaleString([], { dateStyle: "medium", timeStyle: "short" })}` : "Your account is banned"}</p>
              {ban.ban_reason && <p className="mt-1 text-[15px]">Reason: {ban.ban_reason}</p>}
              {ban.ban_message && <p className="mt-1 text-[15px] text-muted-foreground">{ban.ban_message}</p>}
            </div>
          </div>
        </div>
      ) : clean ? (
        <div className="ios-group p-6 text-center">
          <ShieldCheck className="mx-auto h-10 w-10 text-primary" />
          <p className="headline mt-3">Your account is in good standing</p>
          <p className="footnote mt-1">No warnings, restrictions or removed highlights.</p>
        </div>
      ) : (
        <div className="ios-group flex items-start gap-3 p-5">
          <ShieldCheck className="h-6 w-6 shrink-0 text-primary" />
          <p className="text-[15px]">Your account is active. Past notices are listed below so you know what happened.</p>
        </div>
      )}

      {role === "player" && removed.length > 0 && (
        <SettingsSection label="Removed highlights" footer="Think a highlight was removed by mistake? Message the team.">
          {removed.map((r) => (
            <div key={r.id} className="ios-row items-start">
              <Film className="mt-0.5 h-5 w-5 shrink-0 text-destructive" />
              <div className="min-w-0 flex-1"><p className="text-[16px]">{r.title ?? "Highlight"}</p>{r.flag_reason && <p className="footnote">{r.flag_reason}</p>}</div>
            </div>
          ))}
        </SettingsSection>
      )}

      {notices.length > 0 && (
        <SettingsSection label="Notices">
          {notices.map((n) => (
            <div key={n.id} className="ios-row items-start">
              <AlertTriangle className={`mt-0.5 h-5 w-5 shrink-0 ${n.type === "video_restored" ? "text-primary" : "text-amber-500"}`} />
              <div className="min-w-0 flex-1">
                <p className="text-[16px] font-medium">{n.title}</p>
                {n.message && <p className="mt-0.5 whitespace-pre-line text-[14px] text-muted-foreground">{n.message}</p>}
                <p className="footnote mt-1">{new Date(n.created_at).toLocaleDateString([], { dateStyle: "medium" })}</p>
              </div>
            </div>
          ))}
        </SettingsSection>
      )}
      <p className="footnote px-4 pt-4"><Link to="/player/settings/messages" className="text-primary">Message the Cholo Kheli team</Link> if you have a question about a decision.</p>
    </SettingsShell>
  );
};

export default AccountStatusPage;
