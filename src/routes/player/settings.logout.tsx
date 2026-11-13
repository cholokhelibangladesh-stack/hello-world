import { createFileRoute } from "@tanstack/react-router";
import LogoutPage from "@/pages/settings/LogoutPage";
export const Route = createFileRoute("/player/settings/logout")({ component: LogoutPage });
