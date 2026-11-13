import { createFileRoute } from "@tanstack/react-router";
import LanguagePage from "@/pages/settings/LanguagePage";
export const Route = createFileRoute("/player/settings/language")({ component: LanguagePage });
