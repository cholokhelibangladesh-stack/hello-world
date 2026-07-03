import { useEffect, useState } from "react";
import { useParams } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { User, Trophy, Tag, Phone, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { safeMediaUrl } from "@/lib/sanitize";

interface Profile {
  full_name: string;
  bio: string | null;
  sport: string | null;
  guardian_contact: string | null;
  date_of_birth: string | null;
  avatar_url: string | null;
}

interface VideoData {
  id: string;
  video_url: string | null;
  description: string | null;
  position_tags: string[];
  trait_tags: string[];
  status: string;
}

interface Achievement {
  id: string;
  title: string;
  description: string | null;
  year: number | null;
}

const PlayerResume = () => {
  const { userId } = useParams({ strict: false }) as { userId: string };
  const [profile, setProfile] = useState<Profile | null>(null);
  const [video, setVideo] = useState<VideoData | null>(null);
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) return;
    const fetchData = async () => {
      const [profileRes, videoRes, achieveRes] = await Promise.all([
        supabase.from("profiles").select("full_name, bio, sport, guardian_contact, date_of_birth, avatar_url").eq("user_id", userId).maybeSingle(),
        supabase.from("videos").select("id, video_url, description, position_tags, trait_tags, status").eq("user_id", userId).eq("status", "live" as any).maybeSingle(),
        supabase.from("achievements").select("*").eq("user_id", userId).order("year", { ascending: false }),
      ]);
      setProfile(profileRes.data as Profile | null);
      setVideo(videoRes.data as VideoData | null);
      setAchievements((achieveRes.data || []) as Achievement[]);
      setLoading(false);
    };
    fetchData();
  }, [userId]);

  if (loading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  if (!profile) return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Player not found</div>;

  return (
    <div className="min-h-screen pt-20 pb-16">
      <div className="container max-w-3xl">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          {/* Header */}
          <div className="bg-card border border-border rounded-xl p-6 mb-6">
            <div className="flex items-start gap-4">
              <div className="w-16 h-16 rounded-full bg-secondary flex items-center justify-center shrink-0">
                <User className="h-8 w-8 text-muted-foreground" />
              </div>
              <div className="flex-1">
                <h1 className="font-display text-3xl text-foreground">{profile.full_name}</h1>
                {profile.sport && (
                  <Badge className="bg-primary/20 text-primary border-0 mt-1">{profile.sport}</Badge>
                )}
                {profile.bio && (
                  <p className="text-muted-foreground text-sm mt-3">{profile.bio}</p>
                )}
                {profile.guardian_contact && (
                  <div className="flex items-center gap-2 mt-3 text-xs text-muted-foreground">
                    <Phone className="h-3 w-3" />
                    Guardian: {profile.guardian_contact}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Video */}
          {video && video.video_url && (
            <div className="bg-card border border-border rounded-xl overflow-hidden mb-6">
              <video
                src={safeMediaUrl(video.video_url)}
                controls
                preload="metadata"
                className="w-full aspect-video bg-secondary"
              />
              {video.description && (
                <div className="p-4">
                  <p className="text-sm text-muted-foreground">{video.description}</p>
                </div>
              )}
            </div>
          )}

          {/* Tags */}
          {video && (video.position_tags?.length > 0 || video.trait_tags?.length > 0) && (
            <div className="bg-card border border-border rounded-xl p-6 mb-6">
              <div className="flex items-center gap-2 mb-4">
                <Tag className="h-5 w-5 text-primary" />
                <h2 className="font-display text-xl text-foreground">TAGS</h2>
              </div>
              <div className="flex flex-wrap gap-2">
                {video.position_tags?.map((t) => (
                  <Badge key={t} variant="outline" className="border-primary/30 text-primary">{t}</Badge>
                ))}
                {video.trait_tags?.map((t) => (
                  <Badge key={t} variant="outline" className="border-border text-muted-foreground">{t}</Badge>
                ))}
              </div>
            </div>
          )}

          {/* Achievements */}
          {achievements.length > 0 && (
            <div className="bg-card border border-border rounded-xl p-6">
              <div className="flex items-center gap-2 mb-4">
                <Trophy className="h-5 w-5 text-primary" />
                <h2 className="font-display text-xl text-foreground">ACHIEVEMENTS</h2>
              </div>
              <div className="space-y-3">
                {achievements.map((a) => (
                  <div key={a.id} className="bg-secondary rounded-lg p-3">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-foreground text-sm">{a.title}</span>
                      {a.year && <span className="text-xs text-muted-foreground">{a.year}</span>}
                    </div>
                    {a.description && <p className="text-xs text-muted-foreground mt-1">{a.description}</p>}
                  </div>
                ))}
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
};

export default PlayerResume;
