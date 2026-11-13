import { createFileRoute } from "@tanstack/react-router";
import SettingsHub from "@/pages/settings/SettingsHub";
import ProtectedRoute from "@/components/ProtectedRoute";

export const Route = createFileRoute("/admin/settings")({
  component: () => (
    <ProtectedRoute allowedRoles={["admin"]}>
      <SettingsHub />
    </ProtectedRoute>
  ),
});
