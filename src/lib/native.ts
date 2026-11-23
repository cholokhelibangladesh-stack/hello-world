/**
 * Capacitor native runtime bootstrap. All calls are no-ops on the web —
 * `Capacitor.isNativePlatform()` returns false in the browser so plugin
 * imports never touch the DOM window.
 */
import { Capacitor } from "@capacitor/core";

export const isNative = () => {
  try {
    return Capacitor.isNativePlatform();
  } catch {
    return false;
  }
};

export async function initNative(onBack?: () => boolean) {
  if (!isNative()) return;

  try {
    const { StatusBar, Style } = await import("@capacitor/status-bar");
    await StatusBar.setOverlaysWebView({ overlay: false }).catch(() => {});
    // Keep the status bar in step with the app theme (the <html> "dark" class).
    const sync = () => {
      const dark = document.documentElement.classList.contains("dark");
      StatusBar.setStyle({ style: dark ? Style.Dark : Style.Light }).catch(() => {});
      StatusBar.setBackgroundColor({ color: dark ? "#0A171C" : "#F2F4F6" }).catch(() => {});
    };
    sync();
    new MutationObserver(sync).observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
  } catch (e) {
    console.warn("[native] StatusBar init skipped", e);
  }

  try {
    const { SplashScreen } = await import("@capacitor/splash-screen");
    await SplashScreen.hide();
  } catch (e) {
    console.warn("[native] SplashScreen hide skipped", e);
  }

  try {
    const { App } = await import("@capacitor/app");
    App.addListener("backButton", ({ canGoBack }) => {
      // Give the app a chance to handle back (e.g. close a modal / go back
      // in the router). If nothing handles it and we can't go back, exit.
      const handled = onBack?.() ?? false;
      if (handled) return;
      if (canGoBack) {
        window.history.back();
      } else {
        App.exitApp();
      }
    });
    // Google sign-in comes back through the com.cholokheli.app://auth deep link.
    App.addListener("appUrlOpen", ({ url }) => {
      import("@/lib/oauth").then(({ completeNativeOAuth }) => completeNativeOAuth(url)).catch(() => {});
    });
  } catch (e) {
    console.warn("[native] App back-button init skipped", e);
  }

  try {
    const { Keyboard } = await import("@capacitor/keyboard");
    Keyboard.addListener("keyboardWillShow", () => {
      document.body.classList.add("keyboard-open");
    });
    Keyboard.addListener("keyboardWillHide", () => {
      document.body.classList.remove("keyboard-open");
    });
  } catch {
    /* keyboard plugin optional */
  }
}

export async function haptic(kind: "light" | "medium" | "heavy" = "light") {
  if (!isNative()) return;
  try {
    const { Haptics, ImpactStyle } = await import("@capacitor/haptics");
    const style =
      kind === "heavy" ? ImpactStyle.Heavy : kind === "medium" ? ImpactStyle.Medium : ImpactStyle.Light;
    await Haptics.impact({ style });
  } catch {
    /* haptics optional */
  }
}
