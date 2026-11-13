import { createFileRoute, Outlet } from "@tanstack/react-router";
import ProtectedRoute from "@/components/ProtectedRoute";
// Direct messages: players, verified scouts, and admins (read-only).
export const Route = createFileRoute("/messages")({
  component: () => (
    <ProtectedRoute allowedRoles={["player", "scout", "admin"]}>
      <Outlet />
    </ProtectedRoute>
  ),
});
