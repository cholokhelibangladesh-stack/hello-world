import { createFileRoute } from "@tanstack/react-router";
import ScoutProfile from "@/pages/ScoutProfile";
import ProtectedRoute from "@/components/ProtectedRoute";
export const Route = createFileRoute("/scout/profile")({
  component: () => (
    <ProtectedRoute allowedRoles={["scout"]}>
      <ScoutProfile />
    </ProtectedRoute>
  ),
});
