import { createFileRoute } from "@tanstack/react-router";
import PrivacyCenterPage from "@/pages/settings/PrivacyCenterPage";
export const Route = createFileRoute("/player/settings/privacy-center")({ component: PrivacyCenterPage });
