import { motion } from "framer-motion";
import { Loader2, Trash2, AlertTriangle, Video, Settings } from "lucide-react";
import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Link, useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import ProfileTab from "@/components/ProfileTab";

interface VideoRecord {
  id: string; status: string; description: string | null;
  position_tags: string[]; trait_tags: string[]; video_url: string | null; created_at: string;
}

const PlayerProfile = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [allVideos, setAllVideos] = useState<VideoRecord[]>([]);
  const [deletingVideoId, setDeletingVideoId] = useState<string | null>(null);
  const [videosLoading, setVideosLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) { navigate({ to: "/auth" as any }); return; }
    if (user) {
      supabase.from("videos").select("id, status, description, position_tags, trait_tags, video_url, created_at").eq("user_id", user.id).order("created_at", { ascending: false })
        .then(({ data }) => { setAllVideos((data || []) as VideoRecord[]); setVideosLoading(false); });
    }
  }, [user, authLoading]);

  const handleDeleteVideo = async (vid: VideoRecord) => {
    if (!user) return;
    setDeletingVideoId(vid.id);
    try {
      if (vid.video_url) {
        const urlParts = vid.video_url.split("/player-videos/");
        if (urlParts[1]) await supabase.storage.from("player-videos").remove([urlParts[1]]);
      }
      await supabase.from("videos").delete().eq("id", vid.id);
      setAllVideos((prev) => prev.filter((v) => v.id !== vid.id));
      toast({ title: "Video deleted" });
    } catch (err: any) {
      toast({ title: "Delete failed", description: err.message, variant: "destructive" });
    } finally { setDeletingVideoId(null); }
  };

  if (authLoading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  return (
    <div className="min-h-screen pt-16 pb-24">
      <div className="container max-w-2xl">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="pt-4 space-y-6">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h1 className="font-display text-3xl text-foreground">MY PROFILE</h1>
              <p className="text-sm text-muted-foreground">Edit your info and manage your videos</p>
            </div>
            <Link
              to={"/player/settings" as any}
              className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground rounded-lg border border-white/10 bg-secondary/40 px-3 py-1.5"
              data-testid="link-account-settings"
            >
              <Settings className="h-3.5 w-3.5" /> Settings
            </Link>
          </div>

          <ProfileTab showVideos={allVideos} onDeleteVideo={handleDeleteVideo} deletingVideoId={deletingVideoId} />
        </motion.div>
      </div>
    </div>
  );
};

export default PlayerProfile;
