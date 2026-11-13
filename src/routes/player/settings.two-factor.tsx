import { createFileRoute } from "@tanstack/react-router";
import TwoFactorPage from "@/pages/settings/TwoFactorPage";
export const Route = createFileRoute("/player/settings/two-factor")({ component: TwoFactorPage });
