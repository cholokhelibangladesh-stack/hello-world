import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Copy, Loader2, Share2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import SettingsShell from "@/components/settings/SettingsShell";
import { SettingsCard } from "@/components/settings/SettingsControls";
import { publicUrl, publicOrigin } from "@/lib/publicUrl";

const InvitePage = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [username, setUsername] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase
        .from("profiles")
        .select("username")
        .eq("user_id", user.id)
        .maybeSingle();
      setUsername(data?.username ?? null);
      setLoading(false);
    })();
  }, [user]);

  const origin = publicOrigin();
  const link = username ? `${origin}/?ref=${encodeURIComponent(username)}` : `${origin}/`;
  const message = username
    ? `Join me on Cholo Kheli — I'm @${username}. ${link}`
    : `Join me on Cholo Kheli. ${link}`;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(link);
      toast.success("Invite link copied");
    } catch {
      toast.error("Couldn't copy link");
    }
  };

  const share = async () => {
    if (typeof navigator !== "undefined" && "share" in navigator) {
      try {
        await (navigator as any).share({ title: "Cholo Kheli", text: message, url: link });
      } catch {
        /* user dismissed */
      }
    } else {
      copy();
    }
  };

  return (
    <SettingsShell title="Invite teammates" description="Share Cholo Kheli with your club">
      {loading ? (
        <div className="grid place-items-center py-16 text-muted-foreground">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      ) : (
        <>
          <SettingsCard>
            <div className="p-4">
              <span className="mb-1.5 block text-xs font-medium   text-muted-foreground">
                Your invite link
              </span>
              <div className="flex items-center gap-2 rounded-xl bg-card px-3 py-2.5">
                <span className="min-w-0 flex-1 truncate font-mono text-sm text-foreground/85">
                  {link}
                </span>
                <button
                  type="button"
                  onClick={copy}
                  className="grid h-8 w-8 place-items-center rounded-lg text-foreground/70 active:bg-muted"
                  aria-label="Copy link"
                >
                  <Copy className="h-4 w-4" />
                </button>
              </div>
            </div>
          </SettingsCard>

          <div className="mt-4 flex gap-2">
            <button
              type="button"
              onClick={copy}
              className="flex-1 rounded-xl bg-card py-2.5 text-[15px] font-medium text-foreground/85"
            >
              <span className="inline-flex items-center gap-2">
                <Copy className="h-4 w-4" /> Copy
              </span>
            </button>
            <button
              type="button"
              onClick={share}
              className="flex-1 rounded-xl bg-primary py-2.5 text-[15px] font-semibold text-white"
            >
              <span className="inline-flex items-center justify-center gap-2">
                <Share2 className="h-4 w-4" /> Share
              </span>
            </button>
          </div>

          <div className="mt-6">
            <SettingsCard>
              <div className="px-4 py-3">
                <div className="text-[13px] font-normal text-muted-foreground">
                  Message preview
                </div>
                <p className="mt-2 whitespace-pre-wrap text-sm text-foreground/80">{message}</p>
              </div>
            </SettingsCard>
          </div>
        </>
      )}
    </SettingsShell>
  );
};

export default InvitePage;
