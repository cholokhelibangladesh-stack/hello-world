import { createFileRoute } from "@tanstack/react-router";
import ScoutExplore from "@/pages/ScoutExplore";
import ProtectedRoute from "@/components/ProtectedRoute";
export const Route = createFileRoute("/scout/explore")({
  component: () => (
    <ProtectedRoute allowedRoles={["scout"]}>
      <ScoutExplore />
    </ProtectedRoute>
  ),
});
