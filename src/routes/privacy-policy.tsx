import { createFileRoute } from "@tanstack/react-router";
import PrivacyPolicy from "@/pages/PrivacyPolicy";

export const Route = createFileRoute("/privacy-policy")({
  head: () => ({
    meta: [
      { title: "Privacy Policy — Cholo Kheli" },
      { name: "description", content: "Cholokheli Privacy Policy — how we collect, use, store, and protect your data under the laws of Bangladesh." },
    ],
  }),
  component: PrivacyPolicy,
});
