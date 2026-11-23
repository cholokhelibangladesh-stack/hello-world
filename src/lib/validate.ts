/**
 * Sign-up checks shared by the app and the website. The database repeats the email check
 * (public.email_is_acceptable), so scripts that skip the app are stopped too.
 */

const EMAIL = /^[a-z0-9._%+'-]{1,64}@([a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,24}$/;

/** Throwaway inboxes: accounts made with them can't be reached or held to account. */
export const DISPOSABLE_DOMAINS = new Set([
  "mailinator.com", "guerrillamail.com", "guerrillamail.net", "sharklasers.com", "grr.la", "10minutemail.com",
  "tempmail.com", "temp-mail.org", "temp-mail.io", "tempmail.net", "tempail.com", "yopmail.com", "yopmail.net",
  "trashmail.com", "getnada.com", "nada.email", "dispostable.com", "maildrop.cc", "throwawaymail.com",
  "fakeinbox.com", "mintemail.com", "emailondeck.com", "mohmal.com", "burnermail.io", "moakt.com",
  "mailnesia.com", "mytemp.email", "tmpmail.org", "tmail.ws", "spamgourmet.com", "mailcatch.com",
  "inboxkitten.com", "emailfake.com", "fakemail.net", "luxusmail.org", "minuteinbox.com", "tempinbox.com",
  "example.com", "example.org", "example.net", "test.com",
]);

/** Common typos of big providers, offered as a correction. */
const TYPOS: Record<string, string> = {
  "gmial.com": "gmail.com", "gmai.com": "gmail.com", "gmail.co": "gmail.com", "gamil.com": "gmail.com", "gmail.con": "gmail.com",
  "gnail.com": "gmail.com", "yahooo.com": "yahoo.com", "yaho.com": "yahoo.com", "hotmial.com": "hotmail.com", "outlok.com": "outlook.com",
};

export const normaliseEmail = (email: string) => email.trim().toLowerCase();

/** Returns a translation key describing the problem, or null when the address looks real. */
export function emailProblem(email: string): "auth.err.email" | "auth.err.emailDisposable" | null {
  const e = normaliseEmail(email);
  if (!EMAIL.test(e) || e.includes("..")) return "auth.err.email";
  if (DISPOSABLE_DOMAINS.has(e.split("@")[1])) return "auth.err.emailDisposable";
  return null;
}

/** "rafiq@gmial.com" → "rafiq@gmail.com", else null. */
export function emailSuggestion(email: string): string | null {
  const e = normaliseEmail(email);
  const [local, domain] = e.split("@");
  return local && domain && TYPOS[domain] ? `${local}@${TYPOS[domain]}` : null;
}

const COMMON = new Set([
  "12345678", "123456789", "1234567890", "password", "password1", "password123", "qwerty123", "11111111", "00000000",
  "abcd1234", "iloveyou", "football", "cricket1", "bangladesh", "bangladesh1", "dhaka123", "cholokheli", "letmein1",
  "abc12345", "qwertyui", "1q2w3e4r", "admin123", "welcome1", "passw0rd",
]);

/** Returns a translation key, or null when the password is acceptable. */
export function passwordProblem(password: string, email = ""): "auth.err.password" | "auth.err.passwordWeak" | null {
  if (password.length < 8) return "auth.err.password";
  if (password.length > 72) return "auth.err.password";
  const lower = password.toLowerCase();
  const local = normaliseEmail(email).split("@")[0];
  if (!/[a-z]/i.test(password) || !/\d/.test(password)) return "auth.err.passwordWeak";
  if (COMMON.has(lower) || (local.length >= 4 && lower.includes(local))) return "auth.err.passwordWeak";
  if (/^(.)\1+$/.test(password)) return "auth.err.passwordWeak";
  return null;
}

/** 0 to 3, for the strength bar. */
export function passwordScore(password: string): number {
  if (!password) return 0;
  let s = 0;
  if (password.length >= 8) s++;
  if (/[a-z]/i.test(password) && /\d/.test(password)) s++;
  if (password.length >= 12 || /[^a-z0-9]/i.test(password)) s++;
  return passwordProblem(password) ? Math.min(s, 1) : s;
}
