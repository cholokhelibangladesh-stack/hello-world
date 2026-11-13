import { createFileRoute } from "@tanstack/react-router";
import SettingsHub from "@/pages/settings/SettingsHub";
export const Route = createFileRoute("/player/settings/")({ component: SettingsHub });
