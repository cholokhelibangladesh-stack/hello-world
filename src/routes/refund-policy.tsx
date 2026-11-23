import { createFileRoute } from "@tanstack/react-router";
import LegalPage from "@/pages/legal/LegalPage";

export const Route = createFileRoute("/refund-policy")({
  head: () => ({
    meta: [
      { title: "Refund Policy · Cholo Kheli" },
      { name: "description", content: "When and how Cholo Kheli refunds upload fees." },
      { property: "og:title", content: "Refund Policy · Cholo Kheli" },
      { property: "og:description", content: "When and how Cholo Kheli refunds upload fees." },
    ],
    links: [{ rel: "canonical", href: "/refund-policy" }],
  }),
  component: () => <LegalPage id="refund" />,
});
