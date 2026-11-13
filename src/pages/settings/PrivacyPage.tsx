import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { Lock, MessageCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import SettingsShell from "@/components/settings/SettingsShell";
import { SettingsSection, SettingsToggle } from "@/components/settings/SettingsControls";
import { safeMediaUrl } from "@/lib/sanitize";

type Blocked = { blocked_id: string; full_name: string | null; username: string | null; avatar_url: string | null };

/** Private account, comments on your highlights, and the people you've blocked. All enforced by the database. */
const PrivacyPage = () => {
  const { user, role } = useAuth();
  const isPlayer = role === "player";
  const [settings, setSettings] = useState<{ is_private: boolean; comment_control: string } | null>(null);
  const [blocked, setBlocked] = useState<Blocked[] | null>(null);
  const [muted, setMuted] = useState<Blocked[]>([]);

  useEffect(() => {
    if (!user) return;
    supabase.from("privacy_settings").select("is_private, comment_control").eq("user_id", user.id).maybeSingle()
      .then(({ data }) => setSettings({ is_private: data?.is_private ?? false, comment_control: data?.comment_control ?? "everyone" }));
    (async () => {
      const { data } = await supabase.from("blocked_users").select("blocked_id").eq("blocker_id", user.id);
      const ids = (data ?? []).map((r) => r.blocked_id);
      if (!ids.length) { setBlocked([]); return; }
      const { data: p } = await supabase.from("profiles").select("user_id, full_name, username, avatar_url").in("user_id", ids);
      const map = new Map((p ?? []).map((x) => [x.user_id, x]));
      setBlocked(ids.map((id) => ({ blocked_id: id, full_name: map.get(id)?.full_name ?? null, username: (map.get(id) as { username?: string } | undefined)?.username ?? null, avatar_url: map.get(id)?.avatar_url ?? null })));
    })();
    (async () => {
      const { data } = await supabase.from("muted_users").select("muted_id").eq("user_id", user.id);
      const ids = (data ?? []).map((r) => r.muted_id);
      if (!ids.length) return;
      const { data: p } = await supabase.from("profiles").select("user_id, full_name, username, avatar_url").in("user_id", ids);
      setMuted((p ?? []).map((x) => ({ blocked_id: x.user_id, full_name: x.full_name, username: (x as { username?: string }).username ?? null, avatar_url: x.avatar_url })));
    })();
  }, [user]);

  const unmute = async (b: Blocked) => {
    if (!user) return;
    const { error } = await supabase.from("muted_users").delete().eq("user_id", user.id).eq("muted_id", b.blocked_id);
    if (error) { toast.error("Couldn't update"); return; }
    setMuted((list) => list.filter((x) => x.blocked_id !== b.blocked_id));
    toast.success(`${b.full_name ?? "Their"} highlights are back in Explore`);
  };

  const save = async (patch: Partial<{ is_private: boolean; comment_control: string }>, done: string) => {
    if (!user || !settings) return;
    const prev = settings;
    setSettings({ ...settings, ...patch });
    const { error } = await supabase.from("privacy_settings").upsert({ user_id: user.id, ...patch }, { onConflict: "user_id" });
    if (error) { setSettings(prev); toast.error("Couldn't save that", { description: "Check your connection and try again." }); return; }
    toast.success(done);
  };

  const unblock = async (b: Blocked) => {
    if (!user) return;
    const { error } = await supabase.from("blocked_users").delete().eq("blocker_id", user.id).eq("blocked_id", b.blocked_id);
    if (error) { toast.error("Couldn't unblock"); return; }
    setBlocked((list) => (list ?? []).filter((x) => x.blocked_id !== b.blocked_id));
    toast.success(`${b.full_name ?? "They"} can see your highlights again`);
  };

  return (
    <SettingsShell title="Privacy">
      {isPlayer && (
        <SettingsSection
          footer={settings?.is_private
            ? "Only you and Cholo Kheli admins can see your highlights. Scouts won't find you in Explore, but admins can still share your profile with a verified scout you've been matched with."
            : "Your live highlights appear in Explore for other players and verified scouts. Your phone number, birth date and guardian details are never shown to them."}>
          <SettingsToggle icon={Lock} title="Private account" checked={!!settings?.is_private} disabled={!settings}
            onChange={(v) => save({ is_private: v }, v ? "Your account is now private" : "Your account is now public")} />
        </SettingsSection>
      )}
      {isPlayer && (
        <SettingsSection footer="When this is off, nobody can comment on your highlights and existing comments stay visible to you.">
          <SettingsToggle icon={MessageCircle} title="Allow comments" checked={settings?.comment_control !== "off"} disabled={!settings}
            onChange={(v) => save({ comment_control: v ? "everyone" : "off" }, v ? "Comments are on" : "Comments are off")} />
        </SettingsSection>
      )}
      <SettingsSection label="Blocked accounts" footer="Blocked people can't see your highlights, follow you or comment, and you won't see theirs.">
        {blocked === null ? <div className="ios-row"><div className="sk-shimmer h-5 w-40 rounded" /></div>
          : blocked.length === 0 ? <div className="ios-row text-[16px] text-muted-foreground">You haven't blocked anyone.</div>
          : blocked.map((b) => (
            <div key={b.blocked_id} className="ios-row">
              <Link to={`/resume/${b.blocked_id}` as never} className="flex min-w-0 flex-1 items-center gap-3">
                <span className="h-9 w-9 shrink-0 overflow-hidden rounded-full bg-secondary">
                  {b.avatar_url ? <img src={safeMediaUrl(b.avatar_url)} alt="" className="h-full w-full object-cover" /> : null}
                </span>
                <span className="min-w-0 truncate text-[16px]">{b.username ? `@${b.username}` : b.full_name ?? "Account"}</span>
              </Link>
              <button type="button" onClick={() => unblock(b)} className="press h-8 rounded-full bg-secondary px-3 text-[14px] font-semibold">Unblock</button>
            </div>
          ))}
      </SettingsSection>
      {muted.length > 0 && (
        <SettingsSection label="Hidden from your feed" footer="Players you marked as Not interested. They aren't told.">
          {muted.map((b) => (
            <div key={b.blocked_id} className="ios-row">
              <span className="min-w-0 flex-1 truncate text-[16px]">{b.username ? `@${b.username}` : b.full_name ?? "Account"}</span>
              <button type="button" onClick={() => unmute(b)} className="press h-8 rounded-full bg-secondary px-3 text-[14px] font-semibold">Show again</button>
            </div>
          ))}
        </SettingsSection>
      )}
    </SettingsShell>
  );
};
export default PrivacyPage;
