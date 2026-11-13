import { createFileRoute } from "@tanstack/react-router";
import NotificationsPage from "@/pages/settings/NotificationsPage";
export const Route = createFileRoute("/player/settings/notifications")({ component: NotificationsPage });
