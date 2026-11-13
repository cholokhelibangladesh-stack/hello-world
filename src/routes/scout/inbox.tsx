import { createFileRoute } from "@tanstack/react-router";
import ScoutInbox from "@/pages/ScoutInbox";
import ProtectedRoute from "@/components/ProtectedRoute";

export const Route = createFileRoute("/scout/inbox")({
  component: () => (
    <ProtectedRoute allowedRoles={["scout"]}>
      <ScoutInbox />
    </ProtectedRoute>
  ),
});
