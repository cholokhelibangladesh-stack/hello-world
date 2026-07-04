import { createFileRoute } from "@tanstack/react-router";
import AccountSettings from "@/pages/AccountSettings";
import ProtectedRoute from "@/components/ProtectedRoute";
export const Route = createFileRoute("/scout/settings")({
  component: () => (
    <ProtectedRoute allowedRoles={["scout"]}>
      <AccountSettings />
    </ProtectedRoute>
  ),
});
