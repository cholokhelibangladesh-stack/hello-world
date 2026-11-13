import { createFileRoute } from "@tanstack/react-router";
import ScoutVerificationPage from "@/pages/settings/ScoutVerificationPage";
export const Route = createFileRoute("/scout/settings/verification")({ component: ScoutVerificationPage });
