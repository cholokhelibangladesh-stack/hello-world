import { createFileRoute } from "@tanstack/react-router";
import ScoutReview from "@/pages/ScoutReview";
import ProtectedRoute from "@/components/ProtectedRoute";

export const Route = createFileRoute("/scout/review")({
  component: () => (
    <ProtectedRoute allowedRoles={["scout"]}>
      <ScoutReview />
    </ProtectedRoute>
  ),
});
