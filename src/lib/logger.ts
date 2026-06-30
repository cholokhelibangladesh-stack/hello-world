/**
 * Lightweight runtime logger.
 *
 * Captures a clean, structured record for crashes and failed Supabase /
 * network requests. Strips sensitive fields (passwords, tokens, auth
 * headers, cookies) before anything is emitted or stored.
 *
 * In dev: logs to the console.
 * In prod: kept in a small in-memory ring buffer (accessible via
 * `getRecentLogs()`) and forwarded to an optional sink. Wire `setLogSink`
 * to Sentry / Logflare / a server fn when ready.
 *
 * No UI, no component, no workflow changes.
 */

const isDev = import.meta.env.DEV;
const MAX_BUFFER = 50;

export interface LogEntry {
  timestamp: string;     // ISO
  level: "error" | "warn" | "info";
  name: string;          // error name / event name
  message: string;       // user-safe message (no stack, no PII)
  route: string;         // current pathname
  context?: Record<string, unknown>;
}

type Sink = (entry: LogEntry) => void;

let sink: Sink | null = null;
const buffer: LogEntry[] = [];

const SENSITIVE_KEYS = new Set([
  "password",
  "new_password",
  "newpassword",
  "current_password",
  "currentpassword",
  "confirm_password",
  "confirmpassword",
  "pass",
  "pwd",
  "token",
  "access_token",
  "refresh_token",
  "id_token",
  "auth_token",
  "apikey",
  "api_key",
  "authorization",
  "cookie",
  "set-cookie",
  "secret",
  "client_secret",
  "service_role",
  "session",
  "jwt",
  "otp",
  "code",
  "verifier",
  "bkash_number",
  "credit_card",
  "card_number",
  "cvv",
  "ssn",
  "nid",
]);

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

/** Recursively scrub object/array of sensitive keys. Caps depth + size. */
function scrub(value: unknown, depth = 0): unknown {
  if (depth > 4) return "[truncated]";
  if (value === null || value === undefined) return value;

  if (typeof value === "string") {
    // Strip obvious bearer tokens / JWT-looking strings
    if (/^Bearer\s+/i.test(value)) return "[redacted]";
    if (/^eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(value)) return "[redacted]";
    return value.length > 500 ? value.slice(0, 500) + "…" : value;
  }

  if (typeof value === "number" || typeof value === "boolean") return value;

  if (Array.isArray(value)) {
    return value.slice(0, 20).map((v) => scrub(v, depth + 1));
  }

  if (isPlainObject(value)) {
    const out: Record<string, unknown> = {};
    let count = 0;
    for (const [k, v] of Object.entries(value)) {
      if (count++ > 30) {
        out["…"] = "[truncated]";
        break;
      }
      if (SENSITIVE_KEYS.has(k.toLowerCase())) {
        out[k] = "[redacted]";
        continue;
      }
      out[k] = scrub(v, depth + 1);
    }
    return out;
  }

  // Functions, symbols, class instances: drop
  return undefined;
}

function currentRoute(): string {
  if (typeof window === "undefined") return "(ssr)";
  return window.location.pathname + window.location.search;
}

function nameOf(err: unknown): string {
  if (err instanceof Error) return err.name || "Error";
  if (typeof err === "object" && err !== null) {
    const n = (err as Record<string, unknown>).name;
    if (typeof n === "string") return n;
    const code = (err as Record<string, unknown>).code;
    if (typeof code === "string") return code;
  }
  return "UnknownError";
}

function safeMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (typeof err === "string") return err;
  if (typeof err === "object" && err !== null) {
    const m = (err as Record<string, unknown>).message;
    if (typeof m === "string") return m;
  }
  return "Unknown error";
}

function push(entry: LogEntry): void {
  buffer.push(entry);
  if (buffer.length > MAX_BUFFER) buffer.shift();

  if (isDev) {
    // eslint-disable-next-line no-console
    console[entry.level === "error" ? "error" : entry.level === "warn" ? "warn" : "log"](
      `[log:${entry.level}]`,
      entry,
    );
  }

  if (sink) {
    try {
      sink(entry);
    } catch {
      /* never let the sink throw */
    }
  }
}

/** Log a thrown error (component crash, server fn throw, etc). */
export function logError(err: unknown, context?: Record<string, unknown>): void {
  push({
    timestamp: new Date().toISOString(),
    level: "error",
    name: nameOf(err),
    message: safeMessage(err),
    route: currentRoute(),
    context: context ? (scrub(context) as Record<string, unknown>) : undefined,
  });
}

/** Log a failed Supabase / network call. Pass the supabase error + request meta. */
export function logSupabaseError(
  err: unknown,
  meta: { operation: string; table?: string; method?: string },
): void {
  push({
    timestamp: new Date().toISOString(),
    level: "error",
    name: nameOf(err),
    message: safeMessage(err),
    route: currentRoute(),
    context: scrub({
      source: "supabase",
      ...meta,
      code: (err as { code?: string } | null)?.code,
      status: (err as { status?: number } | null)?.status,
    }) as Record<string, unknown>,
  });
}

/** Generic warn (e.g. recoverable issues). */
export function logWarn(message: string, context?: Record<string, unknown>): void {
  push({
    timestamp: new Date().toISOString(),
    level: "warn",
    name: "Warning",
    message,
    route: currentRoute(),
    context: context ? (scrub(context) as Record<string, unknown>) : undefined,
  });
}

/** Replace the sink with your reporter (Sentry, /api/log, etc). */
export function setLogSink(fn: Sink | null): void {
  sink = fn;
}

/** Inspect the in-memory ring buffer (e.g. attach to a bug report). */
export function getRecentLogs(): LogEntry[] {
  return [...buffer];
}

// Capture top-level browser errors that bypass React boundaries.
if (typeof window !== "undefined") {
  window.addEventListener("error", (ev) => {
    logError(ev.error ?? ev.message, { source: "window.error", filename: ev.filename });
  });
  window.addEventListener("unhandledrejection", (ev) => {
    logError(ev.reason, { source: "unhandledrejection" });
  });
}
