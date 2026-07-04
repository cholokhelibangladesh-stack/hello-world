import { createFileRoute } from "@tanstack/react-router";
import PrivacyPolicy from "@/pages/PrivacyPolicy";

export const Route = createFileRoute("/privacy-policy")({
  head: () => ({
    meta: [
      { title: "Privacy Policy — Cholo Kheli" },
      { name: "description", content: "Cholo Kheli Privacy Policy — how we collect, use, store, and protect your data under the laws of Bangladesh." },
      { property: "og:title", content: "Privacy Policy — Cholo Kheli" },
      { property: "og:description", content: "Cholo Kheli Privacy Policy — how we collect, use, store, and protect your data under the laws of Bangladesh." },
      { property: "og:type", content: "website" },
    ],
    links: [{ rel: "canonical", href: "/privacy-policy" }],
  }),
  component: PrivacyPolicy,
});
