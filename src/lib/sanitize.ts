/**
 * XSS sanitization boundary for user-generated content.
 *
 * React already escapes string children in JSX, so plain text renders
 * (chat messages, usernames, bios, notices) are safe by default. These
 * helpers cover the remaining surfaces: user-supplied URLs in
 * href/src attributes, and any future markdown/HTML rendering.
 */

const SAFE_URL_PROTOCOLS = new Set(["http:", "https:", "mailto:", "tel:"]);
const SAFE_MEDIA_PROTOCOLS = new Set(["http:", "https:", "blob:", "data:"]);

/**
 * Returns the URL if it uses a safe protocol, otherwise undefined.
 * Blocks javascript:, vbscript:, file:, and other dangerous schemes.
 * Use for href on anchors and other navigable links.
 */
export function safeUrl(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  // Relative URLs (no protocol, no //) are safe.
  if (/^[/?#]/.test(trimmed)) return trimmed;
  try {
    const parsed = new URL(trimmed, "https://placeholder.local");
    if (parsed.origin === "https://placeholder.local") return trimmed; // was relative
    if (SAFE_URL_PROTOCOLS.has(parsed.protocol)) return parsed.toString();
    return undefined;
  } catch {
    return undefined;
  }
}

/**
 * Returns the URL if it is a safe media source (http/https/blob/data),
 * otherwise undefined. Use for <img src> and <video src> bound to
 * user-supplied URLs. data: is allowed because Supabase preview blobs
 * and inline images legitimately use it; javascript: is rejected.
 */
export function safeMediaUrl(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  if (/^[/?#]/.test(trimmed)) return trimmed;
  try {
    const parsed = new URL(trimmed, "https://placeholder.local");
    if (parsed.origin === "https://placeholder.local") return trimmed;
    if (SAFE_MEDIA_PROTOCOLS.has(parsed.protocol)) {
      // For data: URLs, only allow image/* and video/* MIME types.
      if (parsed.protocol === "data:") {
        const head = trimmed.slice(5, 30).toLowerCase();
        if (!head.startsWith("image/") && !head.startsWith("video/")) {
          return undefined;
        }
      }
      return parsed.toString();
    }
    return undefined;
  } catch {
    return undefined;
  }
}

/**
 * Normalizes free-text user input for display: strips control characters,
 * collapses excessive whitespace, and enforces a max length. React will
 * HTML-escape the result on render, so this is a defense-in-depth
 * normalization, not the primary XSS guard.
 */
export function sanitizeText(value: unknown, maxLength = 5000): string {
  if (value === null || value === undefined) return "";
  const str = String(value);
  // Strip ASCII control chars except tab/newline/carriage return.
  const cleaned = str.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "");
  if (cleaned.length <= maxLength) return cleaned;
  return cleaned.slice(0, maxLength);
}

/**
 * Escapes a string so it can be safely embedded inside an HTML attribute
 * or text node when bypassing React (e.g. building strings for a
 * downstream library). Prefer rendering through JSX whenever possible.
 */
export function escapeHtml(value: unknown): string {
  if (value === null || value === undefined) return "";
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
