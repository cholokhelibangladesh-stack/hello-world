import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { BellOff, BellRing, Heart, Mail, MessageCircle, Megaphone, Film, UserPlus, ClipboardList, Smartphone } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import SettingsShell from "@/components/settings/SettingsShell";
import { SettingsSection, SettingsToggle, SettingsChoice } from "@/components/settings/SettingsControls";
import { enablePush, pathForNotification, pushConfigured, pushPermission, type PushPermission } from "@/lib/push";

type Prefs = {
  pause_all_until: string | null; likes: boolean; comments: boolean; new_followers: boolean; messages: boolean;
  scout_requests: boolean; video_activity: boolean; from_cholo_kheli: boolean; email_notifications: boolean; push_notifications: boolean;
};
const DEFAULTS: Prefs = {
  pause_all_until: null, likes: true, comments: true, new_followers: true, messages: true, scout_requests: true,
  video_activity: true, from_cholo_kheli: true, email_notifications: true, push_notifications: true,
};
type Pause = "off" | "1h" | "8h" | "24h" | "7d";
const PAUSE_MS: Record<Exclude<Pause, "off">, number> = { "1h": 3_600_000, "8h": 28_800_000, "24h": 86_400_000, "7d": 604_800_000 };

/** Which notifications you get, and where: in the app, as a push on your phone, and by email. */
const NotificationsPage = () => {
  const { user, role } = useAuth();
  const navigate = useNavigate();
  const [prefs, setPrefs] = useState<Prefs | null>(null);
  const [perm, setPerm] = useState<PushPermission>("unavailable");

  useEffect(() => {
    if (!user) return;
    supabase.from("notification_preferences").select("*").eq("user_id", user.id).maybeSingle()
      .then(({ data }) => setPrefs({ ...DEFAULTS, ...(data ?? {}) } as Prefs));
    pushPermission().then(setPerm);
  }, [user]);

  const save = async (patch: Partial<Prefs>) => {
    if (!user || !prefs) return;
    const prev = prefs;
    const next = { ...prefs, ...patch };
    setPrefs(next);
    const { error } = await supabase.from("notification_preferences").upsert({ user_id: user.id, ...patch }, { onConflict: "user_id" });
    if (error) { setPrefs(prev); toast.error("Couldn't save that setting", { description: "Check your connection and try again." }); }
  };

  const turnOnPush = async () => {
    const p = await enablePush((path) => navigate({ to: path as never }), true);
    setPerm(p);
    if (p === "granted") { save({ push_notifications: true }); toast.success("Push notifications are on"); }
    else if (p === "denied") toast("Notifications are blocked", { description: "Allow them for Cholo Kheli in your phone's Settings, Apps, Notifications." });
  };

  if (!prefs) return <SettingsShell title="Notifications"><div className="sk-shimmer mx-4 h-40 rounded-[14px]" /></SettingsShell>;

  const pausedUntil = prefs.pause_all_until && new Date(prefs.pause_all_until) > new Date() ? new Date(prefs.pause_all_until) : null;
  const pauseValue: Pause = pausedUntil ? "1h" : "off";
  const t = (k: keyof Prefs) => !!prefs[k];

  return (
    <SettingsShell title="Notifications" description="Choose what you hear about">
      <SettingsSection label="Pause" footer={pausedUntil
        ? `Paused until ${pausedUntil.toLocaleString([], { weekday: "short", hour: "numeric", minute: "2-digit" })}. Notices about your account still come through.`
        : "Take a break from likes, comments and follows. Notices about your account still come through."}>
        {pausedUntil ? (
          <SettingsToggle icon={BellOff} title="Notifications paused" checked onChange={() => save({ pause_all_until: null })} />
        ) : (
          <SettingsChoice<Pause> value={pauseValue} onChange={(v) => save({ pause_all_until: v === "off" ? null : new Date(Date.now() + PAUSE_MS[v]).toISOString() })}
            options={[{ value: "off", title: "Don't pause" }, { value: "1h", title: "For 1 hour" }, { value: "8h", title: "For 8 hours" }, { value: "24h", title: "For 1 day" }, { value: "7d", title: "For 1 week" }]} />
        )}
      </SettingsSection>

      <SettingsSection label="How you're notified" footer={pushConfigured()
        ? "Push alerts appear on your phone even when Cholo Kheli is closed."
        : "Push alerts work in the Android app. In a browser, notifications appear under the bell."}>
        {pushConfigured() && perm !== "granted" ? (
          <button type="button" onClick={turnOnPush} className="ios-row w-full text-left">
            <Smartphone className="h-5 w-5 text-primary" />
            <span className="flex-1 text-[16px]">Turn on push notifications</span>
            <span className="text-[15px] text-primary">{perm === "denied" ? "Blocked" : "Allow"}</span>
          </button>
        ) : (
          <SettingsToggle icon={BellRing} title="Push notifications" description={pushConfigured() ? undefined : "Available in the Android app"}
            checked={t("push_notifications")} disabled={!pushConfigured()} onChange={(v) => save({ push_notifications: v })} />
        )}
        <SettingsToggle icon={Mail} title="Email" description="Messages from the team, account notices and scout updates. Never likes or follows."
          checked={t("email_notifications")} onChange={(v) => save({ email_notifications: v })} />
      </SettingsSection>

      <SettingsSection label="Activity">
        <SettingsToggle icon={Heart} title="Likes" checked={t("likes")} onChange={(v) => save({ likes: v })} />
        <SettingsToggle icon={MessageCircle} title="Comments" checked={t("comments")} onChange={(v) => save({ comments: v })} />
        <SettingsToggle icon={UserPlus} title={role === "player" ? "New followers and scout watchlists" : "New followers"} checked={t("new_followers")} onChange={(v) => save({ new_followers: v })} />
        <SettingsToggle icon={Film} title="New highlights from people you follow" checked={t("video_activity")} onChange={(v) => save({ video_activity: v })} />
      </SettingsSection>

      <SettingsSection label="From Cholo Kheli">
        <SettingsToggle icon={MessageCircle} title="Messages" checked={t("messages")} onChange={(v) => save({ messages: v })} />
        <SettingsToggle icon={ClipboardList} title="Scout requests and selections" checked={t("scout_requests")} onChange={(v) => save({ scout_requests: v })} />
        <SettingsToggle icon={Megaphone} title="News and announcements" checked={t("from_cholo_kheli")} onChange={(v) => save({ from_cholo_kheli: v })} />
      </SettingsSection>
      <p className="footnote px-8 pb-6">Warnings, suspensions and removed videos are always sent so you know what happened. <button type="button" className="text-primary" onClick={() => navigate({ to: pathForNotification("account_notice", null, role) as never })}>Account status</button></p>
    </SettingsShell>
  );
};

export default NotificationsPage;
