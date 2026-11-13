import { createFileRoute } from "@tanstack/react-router";
import AdminExplore from "@/pages/AdminExplore";
import ProtectedRoute from "@/components/ProtectedRoute";

export const Route = createFileRoute("/admin/explore")({
  component: () => (
    <ProtectedRoute allowedRoles={["admin"]}>
      <AdminExplore />
    </ProtectedRoute>
  ),
});
