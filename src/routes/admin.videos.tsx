import { createFileRoute } from "@tanstack/react-router";
import AdminVideosPage from "@/pages/settings/AdminVideosPage";
import ProtectedRoute from "@/components/ProtectedRoute";
export const Route = createFileRoute("/admin/videos")({
  component: () => (
    <ProtectedRoute allowedRoles={["admin"]}>
      <AdminVideosPage />
    </ProtectedRoute>
  ),
});
