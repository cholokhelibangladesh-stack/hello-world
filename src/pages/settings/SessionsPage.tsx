import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import SettingsShell from "@/components/settings/SettingsShell";
import { SettingsCard } from "@/components/settings/SettingsControls";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Loader2, Smartphone, Monitor, Tablet, Globe, LogOut } from "lucide-react";

type SessionRow = {
  id: string;
  created_at: string;
  updated_at: string;
  user_agent: string | null;
  ip: string | null;
  is_current: boolean;
};

function parseDevice(ua: string | null) {
  const s = (ua ?? "").toLowerCase();
  let Icon = Globe;
  let device = "Web browser";
  if (/ipad|tablet/.test(s)) { Icon = Tablet; device = "Tablet"; }
  else if (/iphone|android|mobile/.test(s)) { Icon = Smartphone; device = "Mobile"; }
  else if (/mac|windows|linux/.test(s)) { Icon = Monitor; device = "Desktop"; }
  let os = "Unknown OS";
  if (/iphone|ipad|ios/.test(s)) os = "iOS";
  else if (/android/.test(s)) os = "Android";
  else if (/mac os x|macintosh/.test(s)) os = "macOS";
  else if (/windows/.test(s)) os = "Windows";
  else if (/linux/.test(s)) os = "Linux";
  let browser = "";
  if (/edg\//.test(s)) browser = "Edge";
  else if (/chrome\//.test(s) && !/edg\//.test(s)) browser = "Chrome";
  else if (/safari\//.test(s) && !/chrome\//.test(s)) browser = "Safari";
  else if (/firefox\//.test(s)) browser = "Firefox";
  return { Icon, device, os, browser };
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.round(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.round(h / 24);
  return `${d}d ago`;
}

const SessionsPage = () => {
  const { toast } = useToast();
  const [rows, setRows] = useState<SessionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [revoking, setRevoking] = useState<string | null>(null);
  const [confirmTarget, setConfirmTarget] = useState<SessionRow | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await (supabase.rpc as any)("get_my_sessions");
    setLoading(false);
    if (error) {
      toast({ title: "Could not load sessions", description: error.message, variant: "destructive" });
      return;
    }
    setRows((data as SessionRow[]) ?? []);
  }, [toast]);

  useEffect(() => { load(); }, [load]);

  const confirmRevoke = async () => {
    if (!confirmTarget) return;
    const sid = confirmTarget.id;
    const snapshot = rows;
    // Optimistic UI: remove immediately
    setRows((prev) => prev.filter((r) => r.id !== sid));
    setRevoking(sid);
    setConfirmTarget(null);
    const { data, error } = await (supabase.rpc as any)("revoke_my_session", { _session_id: sid });
    setRevoking(null);
    if (error) {
      // Roll back
      setRows(snapshot);
      toast({
        title: "Could not sign out device",
        description: error.message ?? "Please try again.",
        variant: "destructive",
      });
      return;
    }
    if (data === false) {
      // Server reported no matching session — refresh to reconcile
      toast({
        title: "Session already ended",
        description: "That device was no longer signed in.",
      });
      load();
      return;
    }
    toast({ title: "Signed out of that device" });
  };

  const target = confirmTarget ? parseDevice(confirmTarget.user_agent) : null;

  return (
    <SettingsShell title="Sign-in devices" description="Where your account is currently signed in">
      {loading ? (
        <div className="grid place-items-center py-16 text-muted-foreground">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      ) : rows.length === 0 ? (
        <SettingsCard>
          <div className="px-4 py-6 text-center text-sm text-muted-foreground">No active sessions.</div>
        </SettingsCard>
      ) : (
        <SettingsCard>
          {rows.map((s) => {
            const { Icon, device, os, browser } = parseDevice(s.user_agent);
            return (
              <div key={s.id} className="flex items-start gap-3 px-4 py-3.5">
                <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-card">
                  <Icon className="h-5 w-5 text-foreground/85" strokeWidth={1.85} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <div className="truncate text-[15px] font-medium">
                      {device}{browser ? ` · ${browser}` : ""}
                    </div>
                    {s.is_current ? (
                      <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-medium text-emerald-300">
                        This device
                      </span>
                    ) : null}
                  </div>
                  <div className="mt-0.5 truncate text-xs text-muted-foreground">
                    {os}
                    {s.ip ? ` · ${s.ip}` : ""}
                    {" · "}Active {timeAgo(s.updated_at ?? s.created_at)}
                  </div>
                </div>
                {!s.is_current ? (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="shrink-0 text-rose-300 hover:text-rose-200 hover:bg-rose-500/10"
                    onClick={() => setConfirmTarget(s)}
                    disabled={revoking === s.id}
                  >
                    {revoking === s.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <><LogOut className="mr-1 h-4 w-4" />Sign out</>
                    )}
                  </Button>
                ) : null}
              </div>
            );
          })}
        </SettingsCard>
      )}
      <p className="mt-3 px-1 text-xs text-muted-foreground">
        If you don't recognise a device, sign it out and change your password immediately.
      </p>

      <AlertDialog open={!!confirmTarget} onOpenChange={(o) => !o && setConfirmTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Sign out this device?</AlertDialogTitle>
            <AlertDialogDescription>
              {target
                ? `${target.device}${target.browser ? ` · ${target.browser}` : ""} on ${target.os} will be signed out immediately. It will need to sign in again to access your account.`
                : "This device will be signed out immediately."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmRevoke}
              className="bg-rose-500 text-white hover:bg-rose-500/90"
            >
              Sign out device
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </SettingsShell>
  );
};

export default SessionsPage;
