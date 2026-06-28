import { createFileRoute } from "@tanstack/react-router";
import PlayerResume from "@/pages/PlayerResume";
export const Route = createFileRoute("/resume/$userId")({ component: PlayerResume });
