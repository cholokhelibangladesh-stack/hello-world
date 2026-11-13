import { createFileRoute } from "@tanstack/react-router";
import AdminDashboard from "@/pages/AdminDashboard";
import ProtectedRoute from "@/components/ProtectedRoute";

export const Route = createFileRoute("/admin/manage")({
  component: () => (
    <ProtectedRoute allowedRoles={["admin"]}>
      <AdminDashboard section="manage" />
    </ProtectedRoute>
  ),
});
