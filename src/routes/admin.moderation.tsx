import { createFileRoute } from "@tanstack/react-router";
import AdminModerationPage from "@/pages/settings/AdminModerationPage";
import ProtectedRoute from "@/components/ProtectedRoute";
export const Route = createFileRoute("/admin/moderation")({
  component: () => (
    <ProtectedRoute allowedRoles={["admin"]}>
      <AdminModerationPage />
    </ProtectedRoute>
  ),
});
