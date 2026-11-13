/**
 * Public web address for links that leave the app: share links, invites,
 * and Supabase email redirects (sign-up confirmation, password reset).
 *
 * In the browser this is the current origin. Inside the Android/iOS app the
 * WebView origin is https://localhost / capacitor://localhost, which is
 * useless outside the device, so we use VITE_PUBLIC_SITE_URL instead.
 * That URL must also be listed under Auth -> URL Configuration -> Redirect URLs in Supabase.
 */
const DEFAULT_PUBLIC_SITE_URL = "https://cholokheli.lovable.app";

export function isNativeApp(): boolean {
  if (typeof window === "undefined") return false;
  // Capacitor injects window.Capacitor in its WebView.
  return Boolean((window as unknown as { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor?.isNativePlatform?.());
}

export function publicOrigin(): string {
  const configured = (import.meta.env.VITE_PUBLIC_SITE_URL as string | undefined)?.replace(/\/+$/, "");
  if (typeof window === "undefined" || isNativeApp()) return configured || DEFAULT_PUBLIC_SITE_URL;
  return window.location.origin;
}

export function publicUrl(path = "/"): string {
  return publicOrigin() + (path.startsWith("/") ? path : `/${path}`);
}
