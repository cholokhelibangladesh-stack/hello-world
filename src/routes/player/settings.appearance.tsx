import { createFileRoute } from "@tanstack/react-router";
import AppearancePage from "@/pages/settings/AppearancePage";
export const Route = createFileRoute("/player/settings/appearance")({ component: AppearancePage });
