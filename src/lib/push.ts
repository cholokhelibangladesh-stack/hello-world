/**
 * Push notifications on Android/iOS through Firebase Cloud Messaging.
 *
 * Push stays off until the native project has Firebase configured (android/app/google-services.json)
 * and the app is built with VITE_PUSH_ENABLED=true; calling the plugin without Firebase would fail.
 * The device token is stored with register_push_token() so the send-notification edge function
 * can reach this phone. Tapping a push opens the related screen.
 */
import { supabase } from "@/integrations/supabase/client";
import { isNative } from "@/lib/native";

export const pushConfigured = () => isNative() && import.meta.env.VITE_PUSH_ENABLED === "true";

let listening = false;
let lastToken: string | null = null;

export type PushPermission = "granted" | "denied" | "prompt" | "unavailable";

export async function pushPermission(): Promise<PushPermission> {
  if (!pushConfigured()) return "unavailable";
  try {
    const { PushNotifications } = await import("@capacitor/push-notifications");
    const p = await PushNotifications.checkPermissions();
    return p.receive === "granted" ? "granted" : p.receive === "denied" ? "denied" : "prompt";
  } catch {
    return "unavailable";
  }
}

/** Asks for permission (only if `ask`), registers the device and saves its token. */
export async function enablePush(onOpen: (path: string) => void, ask = false): Promise<PushPermission> {
  if (!pushConfigured()) return "unavailable";
  try {
    const { PushNotifications } = await import("@capacitor/push-notifications");
    let perm = await PushNotifications.checkPermissions();
    if (perm.receive !== "granted" && ask) perm = await PushNotifications.requestPermissions();
    if (perm.receive !== "granted") return perm.receive === "denied" ? "denied" : "prompt";

    if (!listening) {
      listening = true;
      await PushNotifications.createChannel?.({ id: "default", name: "Cholo Kheli", importance: 4, visibility: 1, lightColor: "#13738F" }).catch(() => {});
      await PushNotifications.addListener("registration", async ({ value }) => {
        lastToken = value;
        const platform = (await import("@capacitor/core")).Capacitor.getPlatform();
        await supabase.rpc("register_push_token" as never, { _token: value, _platform: platform === "ios" ? "ios" : "android" } as never);
      });
      await PushNotifications.addListener("pushNotificationActionPerformed", ({ notification }) => {
        const d = (notification.data ?? {}) as Record<string, string>;
        onOpen(pathForNotification(d.type, d));
      });
    }
    await PushNotifications.register();
    return "granted";
  } catch (e) {
    console.warn("[push] unavailable", e);
    return "unavailable";
  }
}

/** Removes this device's token on sign-out so the next account doesn't get these pushes. */
export async function disablePushForThisDevice() {
  if (!lastToken) return;
  await supabase.from("push_tokens" as never).delete().eq("token", lastToken);
  lastToken = null;
}

/** Where a notification should take you when tapped (bell or push). */
export function pathForNotification(type: string | undefined, meta: Record<string, unknown> | null | undefined, role?: string | null): string {
  const base = role === "scout" ? "/scout" : role === "admin" ? "/admin" : "/player";
  const m = meta ?? {};
  switch (type) {
    case "follow": return m.actor_id ? `/resume/${m.actor_id}` : `${base}/profile`;
    case "like":
    case "comment":
    case "video_removed":
    case "video_restored": return role === "player" || !role ? "/player/profile" : `${base}/profile`;
    case "new_video": return m.actor_id ? `/resume/${m.actor_id}` : `${base}/explore`;
    case "dm": return m.conversation_id ? `/messages/${m.conversation_id}` : "/messages";
    case "message": return role === "admin" ? "/admin/panel" : "/player/settings/messages";
    case "account_notice": return "/player/settings/account-status";
    case "scout_verification": return "/scout/settings/verification";
    case "selection":
    case "scout_request":
    case "request_update": return role === "scout" ? "/scout/selections" : `${base}`;
    default: return base;
  }
}
