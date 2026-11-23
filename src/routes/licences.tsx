import { createFileRoute } from "@tanstack/react-router";
import LegalPage from "@/pages/legal/LegalPage";

export const Route = createFileRoute("/licences")({
  head: () => ({
    meta: [
      { title: "Credits and licences · Cholo Kheli" },
      { name: "description", content: "Fonts, software and media used by Cholo Kheli and their licences." },
      { property: "og:title", content: "Credits and licences · Cholo Kheli" },
      { property: "og:description", content: "Fonts, software and media used by Cholo Kheli and their licences." },
    ],
    links: [{ rel: "canonical", href: "/licences" }],
  }),
  component: () => <LegalPage id="licences" />,
});
