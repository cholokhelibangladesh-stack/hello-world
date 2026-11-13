import { createFileRoute } from "@tanstack/react-router";
import PlayerHome from "@/pages/PlayerHome";
import ProtectedRoute from "@/components/ProtectedRoute";
export const Route = createFileRoute("/player/")({
  component: () => (
    <ProtectedRoute allowedRoles={["player"]}>
      <PlayerHome />
    </ProtectedRoute>
  ),
});
