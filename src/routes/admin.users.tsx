import { createFileRoute } from "@tanstack/react-router";
import AdminUsersPage from "@/pages/settings/AdminUsersPage";
import ProtectedRoute from "@/components/ProtectedRoute";
export const Route = createFileRoute("/admin/users")({
  component: () => (
    <ProtectedRoute allowedRoles={["admin"]}>
      <AdminUsersPage />
    </ProtectedRoute>
  ),
});
