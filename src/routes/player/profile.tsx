import { createFileRoute } from "@tanstack/react-router";
import PlayerProfile from "@/pages/PlayerProfile";
import ProtectedRoute from "@/components/ProtectedRoute";
export const Route = createFileRoute("/player/profile")({
  component: () => (
    <ProtectedRoute allowedRoles={["player"]}>
      <PlayerProfile />
    </ProtectedRoute>
  ),
});
