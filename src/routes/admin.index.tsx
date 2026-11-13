import { createFileRoute } from "@tanstack/react-router";
import AdminHome from "@/pages/AdminHome";
import ProtectedRoute from "@/components/ProtectedRoute";
export const Route = createFileRoute("/admin/")({
  component: () => (
    <ProtectedRoute allowedRoles={["admin"]}>
      <AdminHome />
    </ProtectedRoute>
  ),
});
