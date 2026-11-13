import { createFileRoute } from "@tanstack/react-router";
import Inbox from "@/pages/messages/Inbox";
export const Route = createFileRoute("/messages/")({ component: Inbox });
