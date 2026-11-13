import { useEffect } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import SettingsShell from "@/components/settings/SettingsShell";
import { Loader2, LogOut } from "lucide-react";

const LogoutPage = () => {
  const { signOut } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    (async () => {
      try {
        await signOut();
        toast({ title: "Signed out" });
        navigate({ to: "/auth" });
      } catch (e: any) {
        toast({ title: "Sign out failed", description: e?.message, variant: "destructive" });
      }
    })();
  }, [signOut, navigate, toast]);

  return (
    <SettingsShell title="Log out">
      <div className="grid place-items-center gap-3 py-16 text-foreground/70">
        <LogOut className="h-8 w-8" />
        <Loader2 className="h-5 w-5 animate-spin" />
        <div className="text-sm">Signing you out…</div>
      </div>
    </SettingsShell>
  );
};

export default LogoutPage;
