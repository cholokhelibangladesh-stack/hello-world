import { useState, useEffect, useRef } from "react";
import { User, Camera, Loader2, Save, Calendar, Phone, Shield, Video, Trash2, AlertTriangle, Heart, Eye, Share2, Clock, Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { motion } from "framer-motion";
import { safeMediaUrl } from "@/lib/sanitize";

interface VideoRecord {
  id: string;
  status: string;
  description: string | null;
  position_tags: string[];
  trait_tags: string[];
  video_url: string | null;
  created_at: string;
}

interface ProfileStats {
  likes: number;
  views: number;
  shares: number;
  watchMinutes: number;
  videos: number;
}

interface ProfileData {
  full_name: string;
  username: string;
  bio: string;
  phone: string;
  avatar_url: string;
  sport: string;
  gender: string;
  date_of_birth: string;
  guardian_contact: string;
}

interface ProfileTabProps {
  showVideos?: VideoRecord[];
  onDeleteVideo?: (vid: VideoRecord) => void;
  deletingVideoId?: string | null;
  stats?: ProfileStats;
}

const formatCompact = (n: number): string => {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1).replace(/\.0$/, "") + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1).replace(/\.0$/, "") + "K";
  return String(n);
};

const SPORT_LABEL: Record<string, string> = {
  football: "Football",
  cricket: "Cricket",
  basketball: "Basketball",
};

const ProfileTab = ({ showVideos, onDeleteVideo, deletingVideoId, stats }: ProfileTabProps) => {
  const { user, role } = useAuth();
  const { toast } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [editing, setEditing] = useState(false);
  const [profile, setProfile] = useState<ProfileData>({
    full_name: "", username: "", bio: "", phone: "", avatar_url: "",
    sport: "", gender: "", date_of_birth: "", guardian_contact: "",
  });

  const computeAge = (dob: string): number | null => {
    if (!dob) return null;
    const d = new Date(dob);
    if (Number.isNaN(d.getTime())) return null;
    const now = new Date();
    let age = now.getFullYear() - d.getFullYear();
    const m = now.getMonth() - d.getMonth();
    if (m < 0 || (m === 0 && now.getDate() < d.getDate())) age--;
    return age;
  };
  const age = computeAge(profile.date_of_birth);

  useEffect(() => {
    if (!user) return;
    supabase.from("profiles").select("*").eq("user_id", user.id).maybeSingle().then(({ data }) => {
      if (data) {
        setProfile({
          full_name: data.full_name || "", username: (data as any).username || "",
          bio: data.bio || "", phone: data.phone || "", avatar_url: data.avatar_url || "",
          sport: data.sport || "", gender: data.gender || "",
          date_of_birth: data.date_of_birth || "", guardian_contact: data.guardian_contact || "",
        });
      }
      setLoading(false);
    });
  }, [user]);

  const handleSportClick = async (s: "football" | "cricket" | "basketball") => {
    if (!user || profile.sport === s) return;
    setProfile((p) => ({ ...p, sport: s }));
    try {
      const { error } = await supabase.from("profiles").update({ sport: s } as any).eq("user_id", user.id);
      if (error) throw error;
      toast({ title: "Sport updated", description: `Your profile sport is now ${SPORT_LABEL[s]}.` });
    } catch (err: any) {
      toast({ title: "Failed to save sport", description: err.message, variant: "destructive" });
    }
  };

  const handleAvatarUpload = async (file: File) => {
    if (!user) return;
    setUploading(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `${user.id}/avatar.${ext}`;
      const { error } = await supabase.storage.from("documents").upload(path, file, { upsert: true });
      if (error) throw error;
      const { data: { publicUrl } } = supabase.storage.from("documents").getPublicUrl(path);
      setProfile((p) => ({ ...p, avatar_url: publicUrl }));
      toast({ title: "Avatar uploaded!" });
    } catch (err: any) {
      toast({ title: "Upload failed", description: err.message, variant: "destructive" });
    } finally { setUploading(false); }
  };

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    try {
      const updateData: Record<string, any> = {
        full_name: profile.full_name || "",
        bio: profile.bio || null,
        phone: profile.phone || null,
        avatar_url: profile.avatar_url || null,
        sport: profile.sport || null,
        gender: profile.gender || null,
        date_of_birth: profile.date_of_birth || null,
        guardian_contact: profile.guardian_contact || null,
      };
      if (profile.username?.trim()) {
        updateData.username = profile.username.trim();
      }

      const { error } = await supabase.from("profiles").update(updateData as any).eq("user_id", user.id);
      if (error) {
        const msg = error.message.includes("unique") || error.message.includes("duplicate")
          ? "Username already taken. Please choose a different one."
          : error.message;
        toast({ title: "Save failed", description: msg, variant: "destructive" });
      } else {
        toast({ title: "Profile saved!" });
        setEditing(false);
      }
    } catch (err: any) {
      toast({ title: "Unexpected error", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;

  const statCards = stats ? [
    { icon: Eye, label: "Views", value: stats.views, color: "from-sky-500/30 to-blue-500/10", ring: "ring-sky-400/30", text: "text-sky-300" },
    { icon: Heart, label: "Likes", value: stats.likes, color: "from-rose-500/30 to-pink-500/10", ring: "ring-rose-400/30", text: "text-rose-300" },
    { icon: Share2, label: "Shares", value: stats.shares, color: "from-violet-500/30 to-fuchsia-500/10", ring: "ring-violet-400/30", text: "text-violet-300" },
    { icon: Clock, label: "Watch min", value: stats.watchMinutes, color: "from-emerald-500/30 to-teal-500/10", ring: "ring-emerald-400/30", text: "text-emerald-300" },
    { icon: Video, label: "Videos", value: stats.videos, color: "from-amber-500/30 to-orange-500/10", ring: "ring-amber-400/30", text: "text-amber-300" },
    { icon: Trophy, label: "Reach", value: stats.views + stats.likes * 3 + stats.shares * 8, color: "from-primary/30 to-primary/5", ring: "ring-primary/30", text: "text-primary" },
  ] : [];

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-2xl mx-auto space-y-4">
      {/* Profile header — glass card */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="relative overflow-hidden rounded-3xl border border-white/10 bg-card/40 backdrop-blur-xl glass-card shadow-[0_10px_40px_-15px_rgba(0,0,0,0.4)]"
      >
        <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-fuchsia-500/5 to-sky-500/10 pointer-events-none" />
        <div className="absolute -top-24 -right-24 w-64 h-64 rounded-full bg-primary/20 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-64 h-64 rounded-full bg-sky-500/20 blur-3xl pointer-events-none" />

        <div className="relative h-24 sm:h-28" />

        <div className="relative px-4 sm:px-6 pb-6">
          <div className="flex flex-col sm:flex-row items-center sm:items-end gap-3 sm:gap-4 -mt-10 sm:-mt-12">
            <div className="relative">
              <motion.div
                whileHover={{ scale: 1.04 }}
                className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-card border-4 border-card overflow-hidden shadow-xl ring-2 ring-primary/40"
              >
                {profile.avatar_url ? (
                  <img src={safeMediaUrl(profile.avatar_url)} alt="Avatar" loading="lazy" decoding="async" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-secondary">
                    <User className="h-8 w-8 sm:h-10 sm:w-10 text-muted-foreground" />
                  </div>
                )}
              </motion.div>
              <button
                onClick={() => fileRef.current?.click()}
                className="absolute bottom-0 right-0 w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center hover:bg-primary/90 transition-all hover:scale-110 shadow-lg"
              >
                {uploading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Camera className="h-3 w-3" />}
              </button>
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && handleAvatarUpload(e.target.files[0])} />
            </div>

            <div className="flex-1 min-w-0 text-center sm:text-left">
              <h2 className="font-display text-xl sm:text-2xl text-foreground truncate">{profile.full_name || "Your Name"}</h2>
              <p className="text-sm text-muted-foreground truncate">@{profile.username || "username"}</p>
            </div>

            <div className="flex items-center gap-2 flex-wrap justify-center">
              <Badge variant="outline" className="border-primary/40 bg-primary/10 text-primary rounded-full capitalize backdrop-blur-sm">
                <Shield className="h-3 w-3 mr-1" /> {role}
              </Badge>
              <Button
                size="sm"
                variant={editing ? "default" : "outline"}
                onClick={() => editing ? handleSave() : setEditing(true)}
                disabled={saving}
                className={editing ? "bg-primary text-primary-foreground hover:bg-primary/90 rounded-full shadow-lg shadow-primary/30" : "border-primary/30 text-foreground rounded-full backdrop-blur-sm hover:bg-primary/10"}
              >
                {saving ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : editing ? <Save className="h-3 w-3 mr-1" /> : null}
                {editing ? "Save" : "Edit Profile"}
              </Button>
            </div>
          </div>

          {!editing && profile.bio && (
            <p className="text-sm text-muted-foreground mt-4 max-w-md">{profile.bio}</p>
          )}

          {!editing && (
            <div className="flex flex-wrap gap-2 mt-3">
              {profile.sport && <Badge variant="outline" className="text-xs border-white/10 bg-white/5 text-foreground rounded-full capitalize backdrop-blur-sm">{SPORT_LABEL[profile.sport] || profile.sport}</Badge>}
              {profile.gender && <Badge variant="outline" className="text-xs border-white/10 bg-white/5 text-muted-foreground rounded-full capitalize backdrop-blur-sm">{profile.gender}</Badge>}
              {profile.date_of_birth && (
                <Badge variant="outline" className="text-xs border-white/10 bg-white/5 text-muted-foreground rounded-full backdrop-blur-sm">
                  <Calendar className="h-3 w-3 mr-1" /> {new Date(profile.date_of_birth).toLocaleDateString()}{age !== null ? ` · Age ${age}` : ""}
                </Badge>
              )}
              {profile.phone && (
                <Badge variant="outline" className="text-xs border-white/10 bg-white/5 text-muted-foreground rounded-full backdrop-blur-sm">
                  <Phone className="h-3 w-3 mr-1" /> {profile.phone}
                </Badge>
              )}
            </div>
          )}
        </div>
      </motion.div>

      {/* Stats grid — glass cards */}
      {stats && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.05 }}
          className="grid grid-cols-2 sm:grid-cols-3 gap-3"
        >
          {statCards.map((s, idx) => (
            <motion.div
              key={s.label}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.08 + idx * 0.04 }}
              whileHover={{ y: -3 }}
              className={`glass-card relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br ${s.color} backdrop-blur-xl p-4 ring-1 ${s.ring} shadow-lg`}
            >
              <div className="absolute -top-8 -right-8 w-24 h-24 rounded-full bg-white/5 blur-2xl pointer-events-none" />
              <div className="relative flex items-center justify-between">
                <div>
                  <p className="text-[10px] uppercase tracking-widest text-muted-foreground/80">{s.label}</p>
                  <p className={`font-display text-2xl mt-1 ${s.text}`}>{formatCompact(s.value)}</p>
                </div>
                <div className={`w-9 h-9 rounded-xl bg-white/10 backdrop-blur-sm flex items-center justify-center ${s.text}`}>
                  <s.icon className="h-4 w-4" />
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>
      )}

      {/* Edit form */}
      {editing && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="rounded-3xl border border-white/10 bg-card/40 backdrop-blur-xl glass-card p-4 sm:p-6 space-y-4 shadow-lg">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label className="text-xs text-muted-foreground uppercase tracking-wide">Full Name</Label>
              <Input className="mt-1 bg-secondary/60 border-white/10 rounded-xl backdrop-blur-sm" value={profile.full_name} onChange={(e) => setProfile((p) => ({ ...p, full_name: e.target.value }))} />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground uppercase tracking-wide">Username</Label>
              <Input className="mt-1 bg-secondary/60 border-white/10 rounded-xl backdrop-blur-sm" placeholder="unique_username" value={profile.username} onChange={(e) => setProfile((p) => ({ ...p, username: e.target.value }))} />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground uppercase tracking-wide">Phone</Label>
              <Input className="mt-1 bg-secondary/60 border-white/10 rounded-xl backdrop-blur-sm" placeholder="01XXXXXXXXX" value={profile.phone} onChange={(e) => setProfile((p) => ({ ...p, phone: e.target.value }))} />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground uppercase tracking-wide">Gender</Label>
              <Input className="mt-1 bg-secondary/60 border-white/10 rounded-xl backdrop-blur-sm" placeholder="Male / Female / Other" value={profile.gender} onChange={(e) => setProfile((p) => ({ ...p, gender: e.target.value }))} />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground uppercase tracking-wide">Date of Birth {age !== null && <span className="ml-1 text-foreground/80 normal-case">(Age {age})</span>}</Label>
              <Input type="date" className="mt-1 bg-secondary/60 border-white/10 rounded-xl backdrop-blur-sm" value={profile.date_of_birth} onChange={(e) => setProfile((p) => ({ ...p, date_of_birth: e.target.value }))} />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground uppercase tracking-wide">Sport</Label>
              <div className="grid grid-cols-3 gap-2 mt-1">
                {(["football", "cricket", "basketball"] as const).map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => handleSportClick(s)}
                    className={`py-2 rounded-xl text-xs font-semibold capitalize transition-all border ${
                      profile.sport === s
                        ? "bg-primary text-primary-foreground border-primary shadow-lg shadow-primary/30"
                        : "bg-secondary/60 text-secondary-foreground border-white/10 hover:border-primary/40 backdrop-blur-sm"
                    }`}
                  >
                    {SPORT_LABEL[s]}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <div>
            <Label className="text-xs text-muted-foreground uppercase tracking-wide">Bio</Label>
            <Textarea className="mt-1 bg-secondary/60 border-white/10 resize-none rounded-xl backdrop-blur-sm" rows={3} placeholder="Tell us about yourself..." value={profile.bio} onChange={(e) => setProfile((p) => ({ ...p, bio: e.target.value }))} />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground uppercase tracking-wide">Guardian Contact (if under 18)</Label>
            <Input className="mt-1 bg-secondary/60 border-white/10 rounded-xl backdrop-blur-sm" placeholder="01XXXXXXXXX" value={profile.guardian_contact} onChange={(e) => setProfile((p) => ({ ...p, guardian_contact: e.target.value }))} />
          </div>
        </motion.div>
      )}

      {/* My Videos section */}
      {showVideos && showVideos.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="rounded-3xl border border-white/10 bg-card/40 backdrop-blur-xl glass-card p-4 sm:p-6 shadow-lg"
        >
          <div className="flex items-center gap-3 mb-4">
            <Video className="h-5 w-5 text-primary" />
            <h2 className="font-display text-xl text-foreground">My Videos</h2>
            <Badge variant="outline" className="text-xs border-white/10 bg-white/5 text-muted-foreground">{showVideos.length}</Badge>
          </div>
          <div className="space-y-2">
            {showVideos.map((vid) => (
              <motion.div
                key={vid.id}
                whileHover={{ x: 2 }}
                className="flex items-center gap-3 p-3 bg-white/5 hover:bg-white/10 border border-white/5 rounded-xl backdrop-blur-sm transition-colors"
              >
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg bg-secondary overflow-hidden shrink-0 flex items-center justify-center">
                  <Video className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-foreground truncate">{vid.description || "No description"}</p>
                  <p className="text-xs text-muted-foreground">{new Date(vid.created_at).toLocaleDateString()}</p>
                </div>
                <Badge className={`text-xs rounded-full shrink-0 ${vid.status === "live" ? "bg-emerald-500/20 text-emerald-300 border-emerald-400/30" : vid.status === "pending_payment" ? "bg-amber-500/20 text-amber-300 border-amber-400/30" : "bg-muted text-muted-foreground border-border"}`}>
                  {vid.status.replace("_", " ")}
                </Badge>
                {onDeleteVideo && (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="sm" className="text-destructive hover:bg-destructive/10 h-8 w-8 p-0 shrink-0">
                        {deletingVideoId === vid.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent className="bg-card border-border">
                      <AlertDialogHeader>
                        <AlertDialogTitle className="flex items-center gap-2 text-foreground">
                          <AlertTriangle className="h-5 w-5 text-destructive" /> Delete Video?
                        </AlertDialogTitle>
                        <AlertDialogDescription className="text-muted-foreground">
                          This will permanently delete this video. This cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel className="bg-secondary border-border text-foreground">Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={() => onDeleteVideo(vid)} className="bg-destructive text-white hover:bg-destructive/90">Delete</AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                )}
              </motion.div>
            ))}
          </div>
        </motion.div>
      )}
    </motion.div>
  );
};

export default ProfileTab;
