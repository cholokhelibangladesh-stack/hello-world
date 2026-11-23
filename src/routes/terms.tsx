import { createFileRoute } from "@tanstack/react-router";
import LegalPage from "@/pages/legal/LegalPage";

export const Route = createFileRoute("/terms")({
  head: () => ({
    meta: [
      { title: "Terms of Service · Cholo Kheli" },
      { name: "description", content: "The rules for using Cholo Kheli." },
      { property: "og:title", content: "Terms of Service · Cholo Kheli" },
      { property: "og:description", content: "The rules for using Cholo Kheli." },
    ],
    links: [{ rel: "canonical", href: "/terms" }],
  }),
  component: () => <LegalPage id="terms" />,
});
