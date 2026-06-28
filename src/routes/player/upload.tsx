import { createFileRoute } from "@tanstack/react-router";
import PlayerUpload from "@/pages/PlayerUpload";
import ProtectedRoute from "@/components/ProtectedRoute";
export const Route = createFileRoute("/player/upload")({
  component: () => (
    <ProtectedRoute allowedRoles={["player"]}>
      <PlayerUpload />
    </ProtectedRoute>
  ),
});
