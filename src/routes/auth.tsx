import { createFileRoute } from "@tanstack/react-router";
import Auth from "@/pages/Auth";

export const Route = createFileRoute("/auth")({
  validateSearch: (s: Record<string, unknown>): { mode?: "signup"; role?: "scout" } => ({
    mode: s.mode === "signup" ? "signup" : undefined,
    role: s.role === "scout" ? "scout" : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Sign in or sign up — Cholo Kheli" },
      {
        name: "description",
        content:
          "Sign in or create a Cholo Kheli account as a player or scout to access your dashboard.",
      },
      { property: "og:title", content: "Sign in — Cholo Kheli" },
      { property: "og:type", content: "website" },
    ],
  }),
  component: Auth,
});
