import { createFileRoute } from "@tanstack/react-router";
import ScoutRecommended from "@/pages/ScoutRecommended";
import ProtectedRoute from "@/components/ProtectedRoute";

export const Route = createFileRoute("/scout/recommended")({
  component: () => (
    <ProtectedRoute allowedRoles={["scout"]}>
      <ScoutRecommended />
    </ProtectedRoute>
  ),
});
