import { createFileRoute } from "@tanstack/react-router";
import ScoutDashboard from "@/pages/ScoutDashboard";
import ProtectedRoute from "@/components/ProtectedRoute";
export const Route = createFileRoute("/scout")({
  component: () => (
    <ProtectedRoute allowedRoles={["scout"]}>
      <ScoutDashboard />
    </ProtectedRoute>
  ),
});
