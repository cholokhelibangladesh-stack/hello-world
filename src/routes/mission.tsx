import { createFileRoute } from "@tanstack/react-router";
import Mission from "@/pages/Mission";

export const Route = createFileRoute("/mission")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Our Mission — Cholo Kheli" },
      { name: "description", content: "Why Cholo Kheli exists: unlocking Bangladesh's grassroots sporting talent through safe, verified scouting." },
      { property: "og:title", content: "Our Mission — Cholo Kheli" },
      { property: "og:description", content: "Why Cholo Kheli exists: unlocking Bangladesh's grassroots sporting talent through safe, verified scouting." },
      { property: "og:type", content: "website" },
    ],
    links: [{ rel: "canonical", href: "/mission" }],
  }),
  component: Mission,
});
