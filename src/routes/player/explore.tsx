import { createFileRoute } from "@tanstack/react-router";
import PlayerExplore from "@/pages/PlayerExplore";
import ProtectedRoute from "@/components/ProtectedRoute";
export const Route = createFileRoute("/player/explore")({
  component: () => (
    <ProtectedRoute allowedRoles={["player"]}>
      <PlayerExplore />
    </ProtectedRoute>
  ),
});
