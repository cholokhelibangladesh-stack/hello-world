import { createFileRoute } from "@tanstack/react-router";
import ScoutPreferencesPage from "@/pages/settings/ScoutPreferencesPage";
export const Route = createFileRoute("/scout/settings/preferences")({ component: ScoutPreferencesPage });
