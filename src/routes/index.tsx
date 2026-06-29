import { createFileRoute } from "@tanstack/react-router";
import Index from "@/pages/Index";
import heroImg from "@/assets/hero-cricket.jpg.asset.json";

export const Route = createFileRoute("/")({
  head: () => ({
    links: [
      { rel: "preload", as: "image", href: heroImg.url, fetchpriority: "high" } as any,
    ],
  }),
  component: Index,
});
