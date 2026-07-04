import { createFileRoute } from "@tanstack/react-router";
import SafeScouting from "@/pages/SafeScouting";

export const Route = createFileRoute("/safe-scouting")({
  head: () => ({
    meta: [
      { title: "Safe Scouting — Cholo Kheli" },
      { name: "description", content: "How Cholo Kheli keeps players safe: verified scouts, transparent contact, and reporting tools built for families." },
      { property: "og:title", content: "Safe Scouting — Cholo Kheli" },
      { property: "og:description", content: "How Cholo Kheli keeps players safe: verified scouts, transparent contact, and reporting tools built for families." },
      { property: "og:type", content: "website" },
    ],
    links: [{ rel: "canonical", href: "/safe-scouting" }],
  }),
  component: SafeScouting,
});
