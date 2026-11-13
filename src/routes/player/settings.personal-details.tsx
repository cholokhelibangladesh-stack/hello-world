import { createFileRoute } from "@tanstack/react-router";
import PersonalDetailsPage from "@/pages/settings/PersonalDetailsPage";
export const Route = createFileRoute("/player/settings/personal-details")({
  component: PersonalDetailsPage,
});
