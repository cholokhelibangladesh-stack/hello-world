// Pure input validation for handle-signup-role (no I/O, unit-tested in validate_test.ts).

/** Roles a user may pick at signup. "admin" is deliberately absent. */
export const SELF_ASSIGNABLE_ROLES = ["player", "scout"] as const;
export type SignupRole = (typeof SELF_ASSIGNABLE_ROLES)[number];

export const SPORTS = ["football", "cricket", "basketball"] as const;
export const USERNAME_RE = /^[a-z0-9_]{3,24}$/;

export interface SignupInput {
  role: SignupRole;
  username: string;
  full_name: string;
  sport: string | null;
  gender: string | null;
  phone: string | null;
  /** Stored in profile_private, never on the public profile. */
  date_of_birth: string | null;
  guardian_name: string | null;
  guardian_email: string | null;
  parental_consent: boolean;
  /** Scouts only: club, academy or organisation they scout for. */
  organization: string | null;
}

export const MIN_AGE = 13;
export const ADULT_AGE = 18;

export function ageOn(dobIso: string, today: Date): number {
  const [y, m, d] = dobIso.split("-").map(Number);
  let age = today.getUTCFullYear() - y;
  const beforeBirthday = today.getUTCMonth() + 1 < m || (today.getUTCMonth() + 1 === m && today.getUTCDate() < d);
  if (beforeBirthday) age--;
  return age;
}

export type ValidationResult =
  | { ok: true; value: SignupInput }
  | { ok: false; error: string };

const str = (v: unknown, max: number): string | null => {
  if (v === undefined || v === null) return null;
  if (typeof v !== "string") return null;
  const t = v.trim();
  return t ? t.slice(0, max) : null;
};

export function validateSignupPayload(body: unknown, today: Date = new Date()): ValidationResult {
  if (!body || typeof body !== "object") return { ok: false, error: "invalid_body" };
  const b = body as Record<string, unknown>;

  const role = typeof b.role === "string" ? b.role.trim().toLowerCase() : "";
  if (!(SELF_ASSIGNABLE_ROLES as readonly string[]).includes(role)) {
    return { ok: false, error: "invalid_role" };
  }

  const username = typeof b.username === "string" ? b.username.trim().toLowerCase() : "";
  if (!USERNAME_RE.test(username)) return { ok: false, error: "invalid_username" };

  const full_name = str(b.full_name, 100);
  if (!full_name) return { ok: false, error: "invalid_full_name" };

  let sport: string | null = null;
  if (role === "player") {
    sport = str(b.sport, 40)?.toLowerCase() ?? "football";
    if (!(SPORTS as readonly string[]).includes(sport)) return { ok: false, error: "invalid_sport" };
  }

  const phone = str(b.phone, 20);
  if (phone && !/^[+0-9][0-9 \-]{5,19}$/.test(phone)) return { ok: false, error: "invalid_phone" };

  // Date of birth is required: it drives the minimum age and the guardian-consent rule,
  // so leaving it out must not be a way around either.
  if (b.date_of_birth === undefined || b.date_of_birth === null || b.date_of_birth === "") {
    return { ok: false, error: "date_of_birth_required" };
  }
  const dob = typeof b.date_of_birth === "string" ? b.date_of_birth.trim() : "";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dob) || Number.isNaN(Date.parse(dob))) {
    return { ok: false, error: "invalid_date_of_birth" };
  }
  const age = ageOn(dob, today);
  if (age < MIN_AGE || age > 100) return { ok: false, error: "age_not_eligible" };
  if (role === "scout" && age < ADULT_AGE) return { ok: false, error: "scouts_must_be_adults" };
  const date_of_birth = dob;
  const isMinor = age < ADULT_AGE;

  const guardian_name = str(b.guardian_name, 100);
  const guardian_email = str(b.guardian_email, 254)?.toLowerCase() ?? null;
  const parental_consent = b.parental_consent === true;
  if (guardian_email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(guardian_email)) {
    return { ok: false, error: "invalid_guardian_email" };
  }
  if (isMinor && (!guardian_name || !guardian_email || !parental_consent)) {
    return { ok: false, error: "guardian_consent_required" };
  }

  return {
    ok: true,
    value: {
      role: role as SignupRole, username, full_name, sport, gender: str(b.gender, 20), phone,
      date_of_birth,
      guardian_name: isMinor ? guardian_name : null,
      guardian_email: isMinor ? guardian_email : null,
      parental_consent: isMinor && parental_consent,
      organization: role === "scout" ? str(b.organization, 120) : null,
    },
  };
}
