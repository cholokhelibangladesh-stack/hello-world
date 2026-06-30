import { useState, useEffect, useRef } from "react";
import { User, Camera, Loader2, Save, MapPin, Calendar, Phone, Shield, Video, Trash2, AlertTriangle, Plus, FileText, Upload } from "lucide-react";
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
}

const ProfileTab = ({ showVideos, onDeleteVideo, deletingVideoId }: ProfileTabProps) => {
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
        toast({ title: "Profile saved! ✅" });
        setEditing(false);
      }
    } catch (err: any) {
      toast({ title: "Unexpected error", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-2xl mx-auto space-y-4">
      {/* Profile header card */}
      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        <div className="h-24 sm:h-28 bg-gradient-to-r from-primary/20 via-primary/10 to-secondary relative" />

        <div className="px-4 sm:px-6 pb-6">
          <div className="flex flex-col sm:flex-row items-center sm:items-end gap-3 sm:gap-4 -mt-10 sm:-mt-12">
            <div className="relative">
              <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-card border-4 border-card overflow-hidden shadow-lg">
                {profile.avatar_url ? (
                  <img src={safeMediaUrl(profile.avatar_url)} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-secondary">
                    <User className="h-8 w-8 sm:h-10 sm:w-10 text-muted-foreground" />
                  </div>
                )}
              </div>
              <button
                onClick={() => fileRef.current?.click()}
                className="absolute bottom-0 right-0 w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center hover:bg-primary/90 transition-colors shadow-md"
              >
                {uploading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Camera className="h-3 w-3" />}
              </button>
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && handleAvatarUpload(e.target.files[0])} />
            </div>

            <div className="flex-1 text-center sm:text-left">
              <h2 className="font-display text-xl sm:text-2xl text-foreground">{profile.full_name || "Your Name"}</h2>
              <p className="text-sm text-muted-foreground">@{profile.username || "username"}</p>
            </div>

            <div className="flex items-center gap-2 flex-wrap justify-center">
              <Badge variant="outline" className="border-primary/30 text-primary rounded-full capitalize">
                <Shield className="h-3 w-3 mr-1" /> {role}
              </Badge>
              <Button
                size="sm"
                variant={editing ? "default" : "outline"}
                onClick={() => editing ? handleSave() : setEditing(true)}
                disabled={saving}
                className={editing ? "bg-primary text-primary-foreground hover:bg-primary/90 rounded-full" : "border-border text-foreground rounded-full"}
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
              {profile.sport && <Badge variant="outline" className="text-xs border-border text-muted-foreground rounded-full">{profile.sport}</Badge>}
              {profile.gender && <Badge variant="outline" className="text-xs border-border text-muted-foreground rounded-full">{profile.gender}</Badge>}
              {profile.date_of_birth && (
                <Badge variant="outline" className="text-xs border-border text-muted-foreground rounded-full">
                  <Calendar className="h-3 w-3 mr-1" /> {new Date(profile.date_of_birth).toLocaleDateString()}
                </Badge>
              )}
              {profile.phone && (
                <Badge variant="outline" className="text-xs border-border text-muted-foreground rounded-full">
                  <Phone className="h-3 w-3 mr-1" /> {profile.phone}
                </Badge>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Edit form */}
      {editing && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-card border border-border rounded-2xl p-4 sm:p-6 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label className="text-xs text-muted-foreground uppercase tracking-wide">Full Name</Label>
              <Input className="mt-1 bg-secondary border-border rounded-xl" value={profile.full_name} onChange={(e) => setProfile((p) => ({ ...p, full_name: e.target.value }))} />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground uppercase tracking-wide">Username</Label>
              <Input className="mt-1 bg-secondary border-border rounded-xl" placeholder="unique_username" value={profile.username} onChange={(e) => setProfile((p) => ({ ...p, username: e.target.value }))} />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground uppercase tracking-wide">Phone</Label>
              <Input className="mt-1 bg-secondary border-border rounded-xl" placeholder="01XXXXXXXXX" value={profile.phone} onChange={(e) => setProfile((p) => ({ ...p, phone: e.target.value }))} />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground uppercase tracking-wide">Gender</Label>
              <Input className="mt-1 bg-secondary border-border rounded-xl" placeholder="Male / Female / Other" value={profile.gender} onChange={(e) => setProfile((p) => ({ ...p, gender: e.target.value }))} />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground uppercase tracking-wide">Date of Birth</Label>
              <Input type="date" className="mt-1 bg-secondary border-border rounded-xl" value={profile.date_of_birth} onChange={(e) => setProfile((p) => ({ ...p, date_of_birth: e.target.value }))} />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground uppercase tracking-wide">Sport</Label>
              <div className="grid grid-cols-3 gap-2 mt-1">
                {(["football", "cricket", "basketball"] as const).map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setProfile((p) => ({ ...p, sport: s }))}
                    className={`py-2 rounded-xl text-xs font-semibold capitalize transition-all border ${
                      profile.sport === s
                        ? "bg-foreground/15 text-foreground border-foreground/50"
                        : "bg-secondary text-secondary-foreground border-border hover:border-foreground/30"
                    }`}
                  >
                    {s === "football" ? "⚽ Football" : s === "cricket" ? "🏏 Cricket" : "🏀 Basketball"}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <div>
            <Label className="text-xs text-muted-foreground uppercase tracking-wide">Bio</Label>
            <Textarea className="mt-1 bg-secondary border-border resize-none rounded-xl" rows={3} placeholder="Tell us about yourself..." value={profile.bio} onChange={(e) => setProfile((p) => ({ ...p, bio: e.target.value }))} />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground uppercase tracking-wide">Guardian Contact (if under 18)</Label>
            <Input className="mt-1 bg-secondary border-border rounded-xl" placeholder="01XXXXXXXXX" value={profile.guardian_contact} onChange={(e) => setProfile((p) => ({ ...p, guardian_contact: e.target.value }))} />
          </div>
        </motion.div>
      )}

      {/* My Videos section — only shown when player passes videos */}
      {showVideos && showVideos.length > 0 && (
        <div className="bg-card border border-border rounded-2xl p-4 sm:p-6">
          <div className="flex items-center gap-3 mb-4">
            <Video className="h-5 w-5 text-primary" />
            <h2 className="font-display text-xl text-foreground">MY VIDEOS</h2>
            <Badge variant="outline" className="text-xs border-border text-muted-foreground">{showVideos.length}</Badge>
          </div>
          <div className="space-y-2">
            {showVideos.map((vid) => (
              <div key={vid.id} className="flex items-center gap-3 p-3 bg-secondary/50 rounded-lg">
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg bg-secondary overflow-hidden shrink-0">
                  {vid.video_url ? (
                    <video src={safeMediaUrl(vid.video_url)} className="w-full h-full object-cover" muted />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center"><Video className="h-4 w-4 text-muted-foreground" /></div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-foreground truncate">{vid.description || "No description"}</p>
                  <p className="text-xs text-muted-foreground">{new Date(vid.created_at).toLocaleDateString()}</p>
                </div>
                <Badge className={`text-xs rounded-full shrink-0 ${vid.status === "live" ? "bg-primary/20 text-primary border-primary/30" : vid.status === "pending_payment" ? "bg-accent/20 text-accent border-accent/30" : "bg-muted text-muted-foreground border-border"}`}>
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
              </div>
            ))}
          </div>
        </div>
      )}
    </motion.div>
  );
};

export default ProfileTab;
