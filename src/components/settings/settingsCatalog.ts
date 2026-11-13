import {
  Activity, Bell, KeyRound, Fingerprint, MonitorSmartphone, UserCircle2, Lock, ShieldAlert, ShieldCheck,
  SunMoon, Languages, ListFilter, Trophy, BadgeCheck, Users, AlertTriangle, Video, Flag, MessageCircle,
  LifeBuoy, UserPlus, Info, UserX, LogOut, type LucideIcon,
} from "lucide-react";

export type CatalogItem = {
  id: string;
  label: string;
  to: string;
  icon: LucideIcon;
  group: string;
  tint?: "default" | "destructive" | "accent";
  keywords?: string;
  /** Which app roles see the row. Default: all. */
  roles?: Array<"player" | "scout" | "admin">;
};

const G = {
  account: "Account",
  privacy: "Privacy and safety",
  prefs: "Preferences",
  scout: "Scouting",
  admin: "Admin",
  help: "Help",
  session: "",
} as const;

/** Only settings that change how the app behaves are listed here. */
export const SETTINGS_CATALOG: CatalogItem[] = [
  { id: "personal-details", label: "Personal details", to: "/player/settings/personal-details", icon: UserCircle2, group: G.account, keywords: "name email phone birthday" },
  { id: "password", label: "Password", to: "/player/settings/password", icon: KeyRound, group: G.account, keywords: "change reset" },
  { id: "sessions", label: "Signed-in devices", to: "/player/settings/sessions", icon: MonitorSmartphone, group: G.account, keywords: "sessions log out everywhere" },
  { id: "two-factor", label: "Two-step verification", to: "/player/settings/two-factor", icon: Fingerprint, group: G.account, keywords: "2fa authenticator code security" },

  { id: "privacy", label: "Privacy", to: "/player/settings/privacy", icon: Lock, group: G.privacy, roles: ["player", "scout"], keywords: "private account hide videos comments blocked" },
  { id: "account-status", label: "Account status", to: "/player/settings/account-status", icon: ShieldAlert, group: G.privacy, keywords: "ban restriction" },
  { id: "privacy-center", label: "Your data", to: "/player/settings/privacy-center", icon: ShieldCheck, group: G.privacy, keywords: "download data privacy policy" },

  { id: "notifications", label: "Notifications", to: "/player/settings/notifications", icon: Bell, group: G.prefs, keywords: "push email alerts pause likes comments" },
  { id: "appearance", label: "Appearance", to: "/player/settings/appearance", icon: SunMoon, group: G.prefs, keywords: "dark mode light theme" },
  { id: "language", label: "Language", to: "/player/settings/language", icon: Languages, group: G.prefs, keywords: "english bangla" },
  { id: "activity", label: "Your activity", to: "/player/settings/activity", icon: Activity, group: G.prefs, roles: ["player", "scout"], keywords: "views likes history" },

  { id: "scout-prefs", label: "Scouting preferences", to: "/scout/settings/preferences", icon: ListFilter, group: G.scout, roles: ["scout"], keywords: "sport position" },
  { id: "scout-selections", label: "Your picks", to: "/scout/selections", icon: Trophy, group: G.scout, roles: ["scout"] },
  { id: "scout-verification", label: "Verification", to: "/scout/settings/verification", icon: BadgeCheck, group: G.scout, roles: ["scout"], keywords: "documents id cv" },

  { id: "admin-users", label: "Users", to: "/admin/users", icon: Users, group: G.admin, roles: ["admin"] },
  { id: "admin-moderation", label: "Moderation queue", to: "/admin/moderation", icon: AlertTriangle, group: G.admin, roles: ["admin"] },
  { id: "admin-videos", label: "Videos", to: "/admin/videos", icon: Video, group: G.admin, roles: ["admin"] },
  { id: "admin-reports", label: "User reports", to: "/admin/reports", icon: Flag, group: G.admin, roles: ["admin"] },

  { id: "messages", label: "Messages from Cholo Kheli", to: "/player/settings/messages", icon: MessageCircle, group: G.help, roles: ["player", "scout"], keywords: "support inbox contact team" },
  { id: "help", label: "Help and feedback", to: "/player/settings/help", icon: LifeBuoy, group: G.help, keywords: "problem bug question" },
  { id: "invite", label: "Invite teammates", to: "/player/settings/invite", icon: UserPlus, group: G.help, roles: ["player"] },
  { id: "about", label: "About", to: "/player/settings/about", icon: Info, group: G.help },

  { id: "delete-account", label: "Delete account", to: "/player/settings/delete-account", icon: UserX, group: G.session, tint: "destructive", roles: ["player", "scout"], keywords: "remove erase" },
  { id: "logout", label: "Log out", to: "/player/settings/logout", icon: LogOut, group: G.session, tint: "destructive" },
];

export const SETTINGS_GROUP_ORDER: string[] = [G.account, G.privacy, G.prefs, G.scout, G.admin, G.help, G.session];

export function filterCatalogForRole(role: "player" | "scout" | "admin" | null | undefined): CatalogItem[] {
  const r = role ?? "player";
  return SETTINGS_CATALOG.filter((i) => !i.roles || i.roles.includes(r));
}
