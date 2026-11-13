import { createFileRoute } from "@tanstack/react-router";
import SessionsPage from "@/pages/settings/SessionsPage";
export const Route = createFileRoute("/player/settings/sessions")({ component: SessionsPage });
