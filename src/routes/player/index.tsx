import { createFileRoute } from "@tanstack/react-router";
import PlayerDashboard from "@/pages/PlayerDashboard";
import ProtectedRoute from "@/components/ProtectedRoute";
export const Route = createFileRoute("/player")({
  component: () => (
    <ProtectedRoute allowedRoles={["player"]}>
      <PlayerDashboard />
    </ProtectedRoute>
  ),
});
