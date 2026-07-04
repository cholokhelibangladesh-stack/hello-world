import { createFileRoute } from "@tanstack/react-router";
import AccountSettings from "@/pages/AccountSettings";
import ProtectedRoute from "@/components/ProtectedRoute";
export const Route = createFileRoute("/player/settings")({
  component: () => (
    <ProtectedRoute allowedRoles={["player"]}>
      <AccountSettings />
    </ProtectedRoute>
  ),
});
