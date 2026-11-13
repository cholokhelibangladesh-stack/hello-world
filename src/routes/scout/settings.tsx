import { createFileRoute, Outlet } from "@tanstack/react-router";
import ProtectedRoute from "@/components/ProtectedRoute";
export const Route = createFileRoute("/scout/settings")({
  component: () => (
    <ProtectedRoute allowedRoles={["scout"]} allowPendingScout>
      <Outlet />
    </ProtectedRoute>
  ),
});
