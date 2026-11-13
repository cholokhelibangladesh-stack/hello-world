import { createFileRoute, Outlet } from "@tanstack/react-router";
import ProtectedRoute from "@/components/ProtectedRoute";

// Layout route for /admin/* — child routes (index, panel, moderation, etc.)
// render inside the <Outlet />. Do NOT render page content here or child
// routes (like /admin/panel) will not appear.
export const Route = createFileRoute("/admin")({
  component: () => (
    <ProtectedRoute allowedRoles={["admin"]}>
      <Outlet />
    </ProtectedRoute>
  ),
});
