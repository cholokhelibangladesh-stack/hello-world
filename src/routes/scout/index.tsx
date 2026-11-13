import { createFileRoute } from "@tanstack/react-router";
import ScoutHome from "@/pages/ScoutHome";
import ProtectedRoute from "@/components/ProtectedRoute";
export const Route = createFileRoute("/scout/")({
  component: () => (
    <ProtectedRoute allowedRoles={["scout"]}>
      <ScoutHome />
    </ProtectedRoute>
  ),
});
