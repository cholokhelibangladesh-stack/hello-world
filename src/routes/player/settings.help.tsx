import { createFileRoute } from "@tanstack/react-router";
import HelpPage from "@/pages/settings/HelpPage";
export const Route = createFileRoute("/player/settings/help")({ component: HelpPage });
