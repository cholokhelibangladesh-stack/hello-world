import { createFileRoute } from "@tanstack/react-router";
import AccountStatusPage from "@/pages/settings/AccountStatusPage";
export const Route = createFileRoute("/player/settings/account-status")({ component: AccountStatusPage });
