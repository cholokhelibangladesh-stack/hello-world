import { createFileRoute } from "@tanstack/react-router";
import LegalPage from "@/pages/legal/LegalPage";

export const Route = createFileRoute("/privacy-policy")({
  head: () => ({
    meta: [
      { title: "Privacy Policy · Cholo Kheli" },
      { name: "description", content: "What Cholo Kheli collects, who can see it, how long it is kept and how to delete it." },
      { property: "og:title", content: "Privacy Policy · Cholo Kheli" },
      { property: "og:description", content: "What Cholo Kheli collects, who can see it, how long it is kept and how to delete it." },
    ],
    links: [{ rel: "canonical", href: "/privacy-policy" }],
  }),
  component: () => <LegalPage id="privacy" />,
});
