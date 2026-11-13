import { createFileRoute } from "@tanstack/react-router";
import ActivityPage from "@/pages/settings/ActivityPage";
export const Route = createFileRoute("/player/settings/activity")({ component: ActivityPage });
