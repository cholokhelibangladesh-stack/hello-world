import { createFileRoute } from "@tanstack/react-router";
import LegalPage from "@/pages/legal/LegalPage";

export const Route = createFileRoute("/delete-data")({
  head: () => ({
    meta: [
      { title: "Delete your data · Cholo Kheli" },
      { name: "description", content: "How to delete your Cholo Kheli account and data, in the app or by email." },
      { property: "og:title", content: "Delete your data · Cholo Kheli" },
      { property: "og:description", content: "How to delete your Cholo Kheli account and data, in the app or by email." },
    ],
    links: [{ rel: "canonical", href: "/delete-data" }],
  }),
  component: () => <LegalPage id="deletion" />,
});
