/**
 * Business details shown in the footer, About screen and legal pages. Change them here only.
 * Cholo Kheli is not yet a registered company; update `registration` once it is.
 */
export const BUSINESS = {
  name: "Cholo Kheli",
  legalName: "Cholo Kheli (founding team)",
  registration: "Company registration in Bangladesh is in progress.",
  city: "Dhaka, Bangladesh",
  email: "cholokhelibangladesh@gmail.com",
  /** Subject lines that route requests in the shared inbox. */
  subjects: { privacy: "Privacy request", deletion: "Delete my data", refund: "Refund request", legal: "Legal notice" },
  website: "https://cholokheli.lovable.app",
  /** Date the current legal pages took effect. */
  legalEffective: "24 November 2026",
} as const;

export const mailto = (subject: string) => `mailto:${BUSINESS.email}?subject=${encodeURIComponent(subject)}`;
