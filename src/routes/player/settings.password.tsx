import { createFileRoute } from "@tanstack/react-router";
import PasswordPage from "@/pages/settings/PasswordPage";
export const Route = createFileRoute("/player/settings/password")({ component: PasswordPage });
