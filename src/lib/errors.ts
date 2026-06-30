/**
 * Safe error formatting layer.
 *
 * Goal: never leak raw DB errors, column names, SQL fragments, stack traces,
 * Supabase/PostgREST hints, or provider strings to end users in production.
 * Developers still see full details in the browser console during local dev.
 */

const isDev = import.meta.env.DEV;

const GENERIC_MESSAGE = "Something went wrong. Please try again.";

const FRIENDLY_BY_CODE: Record<string, string> = {
  // Supabase / PostgREST
  PGRST301: "You don't have permission to do that.",
  PGRST116: "We couldn't find what you were looking for.",
  "23505": "That already exists.",
  "23503": "This action references something that no longer exists.",
  "23502": "Some required information is missing.",
  "42501": "You don't have permission to do that.",
  // Supabase Auth common
  invalid_credentials: "Incorrect email or password.",
  email_not_confirmed: "Please confirm your email before signing in.",
  over_email_send_rate_limit: "Too many requests. Please wait a moment and try again.",
  over_request_rate_limit: "Too many requests. Please wait a moment and try again.",
  user_already_exists: "An account with that email already exists.",
  weak_password: "Please choose a stronger password.",
};

const FRIENDLY_BY_STATUS: Record<number, string> = {
  400: "That request couldn't be processed.",
  401: "Please sign in to continue.",
  403: "You don't have permission to do that.",
  404: "We couldn't find what you were looking for.",
  408: "The request took too long. Please try again.",
  409: "That conflicts with something that already exists.",
  413: "That upload is too large.",
  422: "Some of that information isn't valid.",
  429: "Too many requests. Please wait a moment and try again.",
  500: GENERIC_MESSAGE,
  502: "Our service is having a hiccup. Please try again.",
  503: "Our service is temporarily unavailable. Please try again.",
  504: "The server took too long to respond. Please try again.",
};

type AnyError = unknown;

function pick<T extends object, K extends string>(obj: T, key: K): unknown {
  return (obj as Record<string, unknown>)[key];
}

/**
 * Convert any thrown value into a short, user-safe message.
 * In dev, also logs the original error to the console for debugging.
 */
export function formatErrorForUser(err: AnyError, fallback: string = GENERIC_MESSAGE): string {
  if (isDev) {
    // Developers see everything locally.
     
    console.error("[error]", err);
  }

  if (!err) return fallback;

  if (typeof err === "object" && err !== null) {
    const code = pick(err, "code");
    if (typeof code === "string" && FRIENDLY_BY_CODE[code]) {
      return FRIENDLY_BY_CODE[code];
    }

    const status = pick(err, "status") ?? pick(err, "statusCode");
    if (typeof status === "number" && FRIENDLY_BY_STATUS[status]) {
      return FRIENDLY_BY_STATUS[status];
    }

    // Network failures (fetch throws TypeError "Failed to fetch")
    const name = pick(err, "name");
    if (name === "TypeError") {
      return "Network problem. Please check your connection and try again.";
    }

    // In dev only, surface the original message so devs can read it in toasts too.
    if (isDev) {
      const message = pick(err, "message");
      if (typeof message === "string" && message.length > 0) {
        return `[dev] ${message}`;
      }
    }
  }

  if (isDev && typeof err === "string") {
    return `[dev] ${err}`;
  }

  return fallback;
}

/**
 * Lightweight reporter hook. Funnels everything into the structured logger
 * (which scrubs sensitive fields, captures route + timestamp, and can
 * forward to a sink in production).
 */
import { logError } from "@/lib/logger";

export function reportError(err: AnyError, context?: Record<string, unknown>): void {
  logError(err, context);
}
