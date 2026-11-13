import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Loader2, Trash2 } from "lucide-react";
import SettingsShell from "@/components/settings/SettingsShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

/** In-app account deletion (also reachable on the web at /player/settings/delete-account). */
const DeleteAccountPage = () => {
  const { user, role, signOut } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [username, setUsername] = useState<string | null>(null);
  const [typed, setTyped] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!user) return;
    supabase.from("profiles").select("username").eq("user_id", user.id).maybeSingle()
      .then(({ data }) => setUsername(data?.username ?? ""));
  }, [user]);

  const expected = (username || "DELETE").toLowerCase();
  const canDelete = typed.trim().toLowerCase() === expected && !busy;

  const onDelete = async () => {
    setBusy(true);
    const { error } = await supabase.functions.invoke("delete-account", { body: { confirm: "DELETE" } });
    if (error) {
      setBusy(false);
      toast({ title: "Couldn't delete your account", description: "Please try again, or email support@cholokheli.com.", variant: "destructive" });
      return;
    }
    await signOut().catch(() => {});
    toast({ title: "Account deleted", description: "Your account and data have been removed." });
    navigate({ to: "/" });
  };

  return (
    <SettingsShell title="Delete account" description="Permanently remove your account and data">
      <div className="space-y-5 px-1 py-2 text-sm leading-relaxed">
        {role === "admin" ? (
          <p className="rounded-2xl border border-border/60 p-4 text-foreground/80">
            Admin accounts can't be deleted from the app. Ask another administrator to remove your access.
          </p>
        ) : (
          <>
            <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-4">
              <p className="font-medium text-foreground">This can't be undone. Deleting your account permanently removes:</p>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-foreground/75">
                <li>your profile, contact details and date of birth</li>
                <li>your uploaded videos, photos and documents</li>
                <li>your messages, likes, saves and scout requests</li>
              </ul>
              <p className="mt-3 text-foreground/75">
                If you only want a break, you can log out instead. Questions? Email{" "}
                <a className="underline" href="mailto:support@cholokheli.com">support@cholokheli.com</a>.
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm-delete">
                Type <span className="font-semibold">{username || "DELETE"}</span> to confirm
              </Label>
              <Input id="confirm-delete" value={typed} onChange={(e) => setTyped(e.target.value)}
                autoComplete="off" autoCapitalize="none" spellCheck={false} disabled={username === null} />
            </div>
            <Button variant="destructive" className="w-full" disabled={!canDelete} onClick={onDelete}>
              {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
              Delete my account
            </Button>
          </>
        )}
      </div>
    </SettingsShell>
  );
};

export default DeleteAccountPage;
