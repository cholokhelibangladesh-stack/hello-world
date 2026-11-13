import { createFileRoute } from "@tanstack/react-router";
import AboutPage from "@/pages/settings/AboutPage";
export const Route = createFileRoute("/player/settings/about")({ component: AboutPage });
