import { createFileRoute, Outlet } from "@tanstack/react-router";
import ProtectedRoute from "@/components/ProtectedRoute";
// Shared settings surface — any authenticated role can view these pages.
// Role-specific rows are filtered inside the SettingsHub via
// filterCatalogForRole; scout/admin-only surfaces live under their own
// route namespaces.
export const Route = createFileRoute("/player/settings")({
  component: () => (
    <ProtectedRoute allowedRoles={["player", "scout", "admin"]} allowPendingScout>
      <Outlet />
    </ProtectedRoute>
  ),
});
