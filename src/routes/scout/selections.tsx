import { createFileRoute } from "@tanstack/react-router";
import ScoutSelections from "@/pages/ScoutSelections";
import ProtectedRoute from "@/components/ProtectedRoute";
export const Route = createFileRoute("/scout/selections")({
  component: () => (
    <ProtectedRoute allowedRoles={["scout"]}>
      <ScoutSelections />
    </ProtectedRoute>
  ),
});
