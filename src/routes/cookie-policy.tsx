import { createFileRoute } from "@tanstack/react-router";
import LegalPage from "@/pages/legal/LegalPage";

export const Route = createFileRoute("/cookie-policy")({
  head: () => ({
    meta: [
      { title: "Cookie Policy · Cholo Kheli" },
      { name: "description", content: "What Cholo Kheli stores on your device. No advertising or tracking cookies." },
      { property: "og:title", content: "Cookie Policy · Cholo Kheli" },
      { property: "og:description", content: "What Cholo Kheli stores on your device. No advertising or tracking cookies." },
    ],
    links: [{ rel: "canonical", href: "/cookie-policy" }],
  }),
  component: () => <LegalPage id="cookies" />,
});
