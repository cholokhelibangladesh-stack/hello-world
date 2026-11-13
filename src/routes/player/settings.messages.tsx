import { createFileRoute } from "@tanstack/react-router";
import MessagesPage from "@/pages/settings/MessagesPage";
export const Route = createFileRoute("/player/settings/messages")({ component: MessagesPage });
