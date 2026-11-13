import { createFileRoute } from "@tanstack/react-router";
import AdminReportsPage from "@/pages/settings/AdminReportsPage";
import ProtectedRoute from "@/components/ProtectedRoute";
export const Route = createFileRoute("/admin/reports")({
  component: () => (
    <ProtectedRoute allowedRoles={["admin"]}>
      <AdminReportsPage />
    </ProtectedRoute>
  ),
});
