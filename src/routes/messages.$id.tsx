import { createFileRoute } from "@tanstack/react-router";
import Thread from "@/pages/messages/Thread";
export const Route = createFileRoute("/messages/$id")({ component: Thread });
