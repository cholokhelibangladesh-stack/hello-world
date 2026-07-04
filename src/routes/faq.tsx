import { createFileRoute } from "@tanstack/react-router";
import FAQ from "@/pages/FAQ";

export const Route = createFileRoute("/faq")({
  head: () => ({
    meta: [
      { title: "FAQ & Helpline — Cholo Kheli" },
      { name: "description", content: "Answers to common questions about Cholo Kheli — accounts, scouting, payments, safety, and how to reach our helpline." },
      { property: "og:title", content: "FAQ & Helpline — Cholo Kheli" },
      { property: "og:description", content: "Answers to common questions about Cholo Kheli — accounts, scouting, payments, safety, and how to reach our helpline." },
      { property: "og:type", content: "website" },
    ],
    links: [{ rel: "canonical", href: "/faq" }],
  }),
  component: FAQ,
});
