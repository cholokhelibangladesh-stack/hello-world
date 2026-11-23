import { supabase } from "@/integrations/supabase/client";
import { publicUrl } from "@/lib/publicUrl";
import { isNative } from "@/lib/native";

/** Deep link the Android/iOS app receives after Google sign-in (also listed in Supabase redirect URLs). */
export const NATIVE_AUTH_CALLBACK = "com.cholokheli.app://auth";
const ROLE_KEY = "ck.signup-role";

/** The role chosen on the sign-up screen, kept across the Google round trip. */
export const rememberSignupRole = (role: "player" | "scout") => { try { sessionStorage.setItem(ROLE_KEY, role); localStorage.setItem(ROLE_KEY, role); } catch { /* private mode */ } };
export const recalledSignupRole = (): "player" | "scout" | null => {
  try { const r = sessionStorage.getItem(ROLE_KEY) ?? localStorage.getItem(ROLE_KEY); return r === "scout" || r === "player" ? r : null; } catch { return null; }
};

/**
 * Starts "Continue with Google". On the web the browser leaves for Google and comes back to /auth.
 * In the app, Google opens in the system browser and returns through the deep link, which
 * completeNativeOAuth() turns into a session.
 */
export async function signInWithGoogle(): Promise<{ ok: boolean }> {
  const native = isNative();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: native ? NATIVE_AUTH_CALLBACK : publicUrl("/auth"),
      skipBrowserRedirect: native,
      queryParams: { prompt: "select_account" },
    },
  });
  if (error) return { ok: false };
  if (native && data?.url) {
    const { Browser } = await import("@capacitor/browser");
    await Browser.open({ url: data.url, presentationStyle: "popover" });
  }
  return { ok: true };
}

/** Handles com.cholokheli.app://auth?code=… or #access_token=… after Google sign-in in the app. */
export async function completeNativeOAuth(url: string): Promise<boolean> {
  if (!url.startsWith(NATIVE_AUTH_CALLBACK)) return false;
  try { const { Browser } = await import("@capacitor/browser"); await Browser.close(); } catch { /* already closed */ }
  const u = new URL(url.replace(/^com\.cholokheli\.app:\/\//, "https://callback.local/"));
  const hash = new URLSearchParams(u.hash.slice(1));
  const code = u.searchParams.get("code");
  if (code) return !(await supabase.auth.exchangeCodeForSession(code)).error;
  const access_token = hash.get("access_token"), refresh_token = hash.get("refresh_token");
  if (access_token && refresh_token) return !(await supabase.auth.setSession({ access_token, refresh_token })).error;
  return false;
}
