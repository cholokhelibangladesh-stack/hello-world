import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { BadgeCheck, Bookmark, Camera, Check, Grid3x3, Loader2, Lock, Settings, Share2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { safeMediaUrl } from "@/lib/sanitize";
import { publicUrl } from "@/lib/publicUrl";
import { removeStoredObject } from "@/lib/media";
import { AVATAR_TYPES, MAX_AVATAR_MB, SPORTS, SPORT_LABEL, formatCount, isSport } from "@/lib/taxonomy";
import { useUsernameState } from "@/pages/Auth";
import AvatarCropDialog from "@/components/AvatarCropDialog";
import BottomSheet from "@/components/social/BottomSheet";
import FollowListSheet from "@/components/social/FollowListSheet";
import { useFollowStats } from "@/components/social/FollowButton";
import HighlightGrid, { type Highlight } from "@/components/profile/HighlightGrid";
import { AboutSection, AchievementsSection } from "@/components/profile/ProfileSections";
import ProfileCard from "@/components/profile/ProfileCard";

type Profile = { full_name: string; username: string; bio: string; avatar_url: string; sport: string; gender: string };
type Scout = { organization: string | null; verification_status: string | null };
const BIO_MAX = 500;
const field = "h-12 w-full rounded-xl bg-secondary px-4 text-[16px] outline-none focus:ring-2 focus:ring-ring";

/** Your own profile, Instagram-style: photo and counts, name and bio on a plain background, highlights grid. */
const ProfileTab = () => {
  const { user, role } = useAuth();
  const isPlayer = role === "player";
  const base = role === "scout" ? "/scout" : "/player";
  const [profile, setProfile] = useState<Profile | null>(null);
  const [scout, setScout] = useState<Scout | null>(null);
  const [isPrivate, setIsPrivate] = useState(false);
  const [videos, setVideos] = useState<Highlight[] | null>(null);
  const [extra, setExtra] = useState<{ requests: number; approved: number } | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [list, setList] = useState<"followers" | "following" | null>(null);
  const [tab, setTab] = useState<"highlights" | "saved">("highlights");
  const [savedVideos, setSavedVideos] = useState<Highlight[] | null>(null);
  const [editing, setEditing] = useState<Highlight | null>(null);
  const [achievements, setAchievements] = useState<{ id: string; title: string; description: string | null; year: number | null }[]>([]);
  const [newAch, setNewAch] = useState<{ id?: string; title: string; year: string; description: string } | null>(null);
  const [bioDraft, setBioDraft] = useState<string | null>(null);
  const [savingBio, setSavingBio] = useState(false);

  useEffect(() => {
    if (!user || tab !== "saved") return;
    (async () => {
      const { data: s } = await supabase.from("saved_videos").select("video_id, created_at").eq("user_id", user.id).order("created_at", { ascending: false }).limit(200);
      const ids = (s ?? []).map((r) => r.video_id);
      if (!ids.length) { setSavedVideos([]); return; }
      const { data: v } = await supabase.from("videos").select("id, title, description, video_url, status, view_count, like_count, created_at").in("id", ids).eq("status", "live");
      const map = new Map((v ?? []).map((x) => [x.id, x as Highlight]));
      setSavedVideos(ids.map((id) => map.get(id)).filter(Boolean) as Highlight[]);
    })();
  }, [user?.id, tab]);

  const saveEdit = async () => {
    if (!editing) return;
    const title = (editing.title ?? "").trim();
    if (!title) { toast.error("Give the highlight a title"); return; }
    const { error } = await supabase.from("videos").update({ title: title.slice(0, 120), description: (editing.description ?? "").trim().slice(0, 1000) }).eq("id", editing.id);
    if (error) { toast.error("Changes not saved"); return; }
    setVideos((v) => (v ?? []).map((x) => (x.id === editing.id ? { ...x, title, description: editing.description } : x)));
    setEditing(null);
    toast.success("Highlight updated");
  };

  const saveBio = async () => {
    if (!user || bioDraft === null) return;
    setSavingBio(true);
    const bio = bioDraft.trim().slice(0, BIO_MAX);
    const { error } = await supabase.from("profiles").update({ bio: bio || null }).eq("user_id", user.id);
    setSavingBio(false);
    if (error) { toast.error("Bio not saved", { description: "Check your connection and try again." }); return; }
    setProfile((p) => (p ? { ...p, bio } : p));
    setBioDraft(null);
    toast.success(bio ? "Bio updated" : "Bio removed");
  };

  const addAchievement = async () => {
    if (!user || !newAch?.title.trim()) return;
    const year = Number(newAch.year);
    const row = {
      title: newAch.title.trim().slice(0, 120), description: newAch.description.trim().slice(0, 500) || null,
      year: year >= 1990 && year <= new Date().getFullYear() ? year : null,
    };
    const q = newAch.id
      ? supabase.from("achievements").update(row as never).eq("id", newAch.id)
      : supabase.from("achievements").insert({ user_id: user.id, ...row } as never);
    const { data, error } = await q.select("id, title, description, year").single();
    if (error) { toast.error("Achievement not saved"); return; }
    setAchievements((list) => [data as never, ...list.filter((x) => x.id !== newAch.id)].sort((x, y) => (y.year ?? 0) - (x.year ?? 0)));
    toast.success(newAch.id ? "Achievement updated" : "Achievement added");
    setNewAch(null);
  };
  const removeAchievement = async (id: string) => {
    const { error } = await supabase.from("achievements").delete().eq("id", id);
    if (error) { toast.error("Couldn't remove it"); return; }
    setAchievements((a) => a.filter((x) => x.id !== id));
  };
  const [cropFile, setCropFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const { stats: follow } = useFollowStats(user?.id);

  const load = async () => {
    if (!user) return;
    const [{ data: p }, { data: ps }] = await Promise.all([
      supabase.from("profiles").select("full_name, username, bio, avatar_url, sport, gender").eq("user_id", user.id).maybeSingle(),
      supabase.from("privacy_settings").select("is_private").eq("user_id", user.id).maybeSingle(),
    ]);
    setProfile({ full_name: p?.full_name ?? "", username: (p as { username?: string } | null)?.username ?? "", bio: p?.bio ?? "",
      avatar_url: p?.avatar_url ?? "", sport: p?.sport ?? "", gender: p?.gender ?? "" });
    setIsPrivate(!!ps?.is_private);
    if (role === "scout") {
      const { data: s } = await supabase.from("scout_profiles").select("organization, verification_status").eq("user_id", user.id).maybeSingle();
      setScout(s as Scout | null);
      const { data: reqs } = await supabase.from("scout_requests").select("status").eq("scout_id", user.id);
      setExtra({ requests: reqs?.length ?? 0, approved: (reqs ?? []).filter((r) => r.status === "approved").length });
    } else {
      const { data: v } = await supabase.from("videos")
        .select("id, title, description, video_url, status, flagged, flag_reason, view_count, like_count, share_count, total_watch_ms, created_at")
        .eq("user_id", user.id).neq("status", "draft").order("created_at", { ascending: false });
      setVideos((v ?? []) as Highlight[]);
      const { data: a } = await supabase.from("achievements").select("id, title, description, year").eq("user_id", user.id).order("year", { ascending: false });
      setAchievements((a ?? []) as never);
    }
  };
  useEffect(() => { load(); }, [user?.id, role]); // eslint-disable-line react-hooks/exhaustive-deps

  const totals = useMemo(() => (videos ?? []).reduce(
    (a, v) => ({ views: a.views + (v.view_count ?? 0), likes: a.likes + (v.like_count ?? 0),
      shares: a.shares + ((v as { share_count?: number }).share_count ?? 0),
      minutes: a.minutes + Math.round(((v as { total_watch_ms?: number }).total_watch_ms ?? 0) / 60000) }),
    { views: 0, likes: 0, shares: 0, minutes: 0 }), [videos]);

  const pickAvatar = (f?: File) => {
    if (!f) return;
    if (!AVATAR_TYPES.includes(f.type)) { toast.error("Choose a JPG, PNG or WebP photo."); return; }
    if (f.size > 15 * 1024 * 1024) { toast.error("That photo is too large. Choose one under 15 MB."); return; }
    setCropFile(f);
  };

  const saveAvatar = async (blob: Blob) => {
    if (!user || !profile) return;
    if (blob.size > MAX_AVATAR_MB * 1024 * 1024) { toast.error(`Photo must be under ${MAX_AVATAR_MB} MB after cropping.`); return; }
    setUploading(true);
    try {
      const path = `${user.id}/avatar-${Date.now()}.jpg`;
      const { error } = await supabase.storage.from("avatars").upload(path, blob, { contentType: "image/jpeg" });
      if (error) throw error;
      const url = supabase.storage.from("avatars").getPublicUrl(path).data.publicUrl;
      const { error: e2 } = await supabase.from("profiles").update({ avatar_url: url }).eq("user_id", user.id);
      if (e2) throw e2;
      const old = profile.avatar_url;
      setProfile({ ...profile, avatar_url: url });
      setCropFile(null);
      toast.success("Profile photo updated");
      const m = old.match(/\/avatars\/([^?#]+)/);
      if (m && m[1].startsWith(`${user.id}/`)) supabase.storage.from("avatars").remove([decodeURIComponent(m[1])]);
    } catch {
      toast.error("Photo not saved", { description: "Check your connection and try again." });
    } finally { setUploading(false); }
  };

  const removeAvatar = async () => {
    if (!user || !profile?.avatar_url) return;
    const { error } = await supabase.from("profiles").update({ avatar_url: null }).eq("user_id", user.id);
    if (error) { toast.error("Couldn't remove your photo"); return; }
    const m = profile.avatar_url.match(/\/avatars\/([^?#]+)/);
    if (m) supabase.storage.from("avatars").remove([decodeURIComponent(m[1])]);
    setProfile({ ...profile, avatar_url: "" });
    toast.success("Photo removed");
  };

  const deleteVideo = async (h: Highlight) => {
    if (!confirm(`Delete “${h.title ?? "this highlight"}”? This can't be undone.`)) return;
    const { error } = await supabase.from("videos").delete().eq("id", h.id);
    if (error) { toast.error("Couldn't delete that highlight"); return; }
    await removeStoredObject(h.video_url, "player-videos");
    setVideos((v) => (v ?? []).filter((x) => x.id !== h.id));
    toast.success("Highlight deleted");
  };

  const share = async () => {
    if (!user) return;
    const url = publicUrl(`/resume/${user.id}`);
    try {
      if (navigator.share) await navigator.share({ title: `${profile?.full_name} on Cholo Kheli`, url });
      else { await navigator.clipboard.writeText(url); toast.success("Profile link copied"); }
    } catch { /* cancelled */ }
  };

  if (!profile) {
    return (
      <div className="space-y-4 px-4 pt-4" aria-busy="true">
        <div className="flex items-center gap-6"><div className="sk-shimmer h-[86px] w-[86px] rounded-full" /><div className="sk-shimmer h-12 flex-1 rounded-xl" /></div>
        <div className="sk-shimmer h-20 rounded-xl" />
      </div>
    );
  }

  const verified = scout?.verification_status === "active";
  const counts = isPlayer
    ? [{ label: "Highlights", value: videos?.filter((v) => v.status === "live").length ?? 0 },
       { label: "Followers", value: follow?.followers ?? 0, onClick: () => setList("followers") },
       { label: "Following", value: follow?.following ?? 0, onClick: () => setList("following") }]
    : [{ label: "Requests", value: extra?.requests ?? 0 },
       { label: "Approved", value: extra?.approved ?? 0 },
       { label: "Watchlist", value: follow?.following ?? 0, onClick: () => setList("following") }];

  return (
    <div className="pb-6">
      <ProfileCard
        name={profile.full_name}
        subtitle={[profile.username ? `@${profile.username}` : "",
          isPlayer && isSport(profile.sport) ? SPORT_LABEL[profile.sport] : "",
          role === "scout" ? (scout?.organization || (verified ? "Verified scout" : "Scout, pending verification")) : ""].filter(Boolean).join("  ·  ")}
        avatarUrl={profile.avatar_url}
        verified={verified}
        isPrivate={isPrivate}
        counts={counts}
        uploading={uploading}
        onChangePhoto={() => fileRef.current?.click()}
      >
        <input ref={fileRef} type="file" accept={AVATAR_TYPES.join(",")} className="hidden"
          onChange={(e) => { pickAvatar(e.target.files?.[0]); e.target.value = ""; }} />
        <div className="mt-3 flex gap-2">
          <button type="button" onClick={() => setEditOpen(true)} className="press h-11 flex-1 rounded-full bg-card text-[15px] font-semibold">Edit profile</button>
          <button type="button" onClick={share} className="press inline-flex h-11 flex-1 items-center justify-center gap-1.5 rounded-full bg-card text-[15px] font-semibold">
            <Share2 className="h-4 w-4" /> Share
          </button>
          <Link to={`${base}/settings` as never} aria-label="Settings" className="press glass-icon"><Settings className="h-5 w-5" /></Link>
        </div>
      </ProfileCard>

      {isPlayer && videos && videos.length > 0 && (
        <section aria-label="Your reach" className="mx-4 mt-4 grid grid-cols-4 rounded-[14px] bg-card py-3 text-center">
          {[["Views", formatCount(totals.views)], ["Likes", formatCount(totals.likes)], ["Shares", formatCount(totals.shares)], ["Watched", `${formatCount(totals.minutes)}m`]].map(([l, v]) => (
            <div key={l}><p className="text-[17px] font-bold">{v}</p><p className="text-[12px] text-muted-foreground">{l}</p></div>
          ))}
        </section>
      )}

      <AboutSection bio={profile.bio} onEdit={() => setBioDraft(profile.bio)}
        emptyHint={isPlayer ? "Tell scouts who you are and how you play." : "Say who you scout for and what you look for."} />
      {isPlayer && (
        <AchievementsSection items={achievements}
          onAdd={() => setNewAch({ title: "", year: "", description: "" })}
          onOpen={(a) => setNewAch({ id: a.id, title: a.title, year: a.year ? String(a.year) : "", description: a.description ?? "" })} />
      )}

      {!isPlayer && (
        <section className="mx-4 mt-5 space-y-2">
          {!verified && (
            <Link to="/scout/settings/verification" className="ios-group flex items-center gap-3 px-4 py-3">
              <BadgeCheck className="h-5 w-5 text-primary" /><span className="flex-1 text-[15px]">Finish verification to browse players</span>
            </Link>
          )}
          <Link to="/scout/selections" className="ios-group flex items-center gap-3 px-4 py-3"><Check className="h-5 w-5 text-primary" /><span className="flex-1 text-[15px]">Your picks and requests</span></Link>
          <Link to="/scout/settings/preferences" className="ios-group flex items-center gap-3 px-4 py-3"><Settings className="h-5 w-5 text-primary" /><span className="flex-1 text-[15px]">Scouting preferences</span></Link>
        </section>
      )}

      <div className="mt-4 grid border-t border-border/70" style={{ gridTemplateColumns: isPlayer ? "1fr 1fr" : "1fr" }} role="tablist" aria-label="Profile content">
        {isPlayer && (
          <button type="button" role="tab" aria-selected={tab === "highlights"} aria-label="Highlights" onClick={() => setTab("highlights")}
            className={`grid h-11 place-items-center border-t-2 ${tab === "highlights" ? "border-foreground" : "border-transparent text-muted-foreground"}`}><Grid3x3 className="h-5 w-5" /></button>
        )}
        <button type="button" role="tab" aria-selected={tab === "saved" || !isPlayer} aria-label="Saved" onClick={() => setTab("saved")}
          className={`grid h-11 place-items-center border-t-2 ${tab === "saved" || !isPlayer ? "border-foreground" : "border-transparent text-muted-foreground"}`}><Bookmark className="h-5 w-5" /></button>
      </div>

      {isPlayer && tab === "highlights" ? (
        <section>
          {videos === null
            ? <div className="grid grid-cols-3 gap-[2px]">{Array.from({ length: 6 }).map((_, i) => <div key={i} className="sk-shimmer aspect-[3/4]" />)}</div>
            : <HighlightGrid items={videos} onDelete={deleteVideo} onEdit={(h) => setEditing(h)} emptyText="Upload your first clip so scouts can find you." />}
          {videos && videos.length === 0 && (
            <div className="px-4"><Link to="/player/upload" className="press flex h-11 items-center justify-center rounded-full bg-primary text-[15px] font-semibold text-primary-foreground">Upload a highlight</Link></div>
          )}
        </section>
      ) : (
        <section>
          {savedVideos === null
            ? <div className="grid grid-cols-3 gap-[2px]">{Array.from({ length: 3 }).map((_, i) => <div key={i} className="sk-shimmer aspect-[3/4]" />)}</div>
            : <HighlightGrid items={savedVideos} emptyTitle="Nothing saved yet" emptyText="Tap the three dots on a highlight and choose Save. Only you can see this list." />}
        </section>
      )}

      <BottomSheet open={!!editing} onClose={() => setEditing(null)} title="Edit highlight" height="auto">
        {editing && (
          <div className="space-y-3 p-4">
            <label className="block"><span className="ios-group-label !px-0 block">Title</span>
              <input className={field} value={editing.title ?? ""} maxLength={120} onChange={(e) => setEditing({ ...editing, title: e.target.value })} /></label>
            <label className="block"><span className="ios-group-label !px-0 block">Description</span>
              <textarea rows={3} maxLength={1000} className="w-full resize-none rounded-xl bg-secondary px-4 py-3 text-[16px] outline-none focus:ring-2 focus:ring-ring" value={editing.description ?? ""} onChange={(e) => setEditing({ ...editing, description: e.target.value })} /></label>
            <button type="button" onClick={saveEdit} className="press h-12 w-full rounded-full bg-primary text-[16px] font-semibold text-primary-foreground">Save changes</button>
          </div>
        )}
      </BottomSheet>
      <BottomSheet open={!!newAch} onClose={() => setNewAch(null)} title={newAch?.id ? "Edit achievement" : "Add achievement"} height="auto">
        {newAch && (
          <div className="space-y-3 p-4">
            <label className="block"><span className="ios-group-label !px-0 block">What you achieved</span>
              <input className={field} value={newAch.title} maxLength={120} placeholder="District U-17 champions" onChange={(e) => setNewAch({ ...newAch, title: e.target.value })} /></label>
            <label className="block"><span className="ios-group-label !px-0 block">Year</span>
              <input className={field} inputMode="numeric" maxLength={4} value={newAch.year} placeholder="2026" onChange={(e) => setNewAch({ ...newAch, year: e.target.value.replace(/\D/g, "") })} /></label>
            <label className="block"><span className="ios-group-label !px-0 block">Details (optional)</span>
              <input className={field} value={newAch.description} maxLength={500} onChange={(e) => setNewAch({ ...newAch, description: e.target.value })} /></label>
            <button type="button" disabled={!newAch.title.trim()} onClick={addAchievement} className="press h-12 w-full rounded-full bg-primary text-[16px] font-semibold text-primary-foreground disabled:opacity-40">{newAch.id ? "Save" : "Add"}</button>
            {newAch.id && (
              <button type="button" onClick={() => { removeAchievement(newAch.id!); setNewAch(null); }} className="press h-11 w-full text-[16px] text-destructive">Delete achievement</button>
            )}
          </div>
        )}
      </BottomSheet>

      <BottomSheet open={bioDraft !== null} onClose={() => setBioDraft(null)} title="Bio" height="auto">
        {bioDraft !== null && (
          <div className="space-y-2 p-4">
            <label htmlFor="bio-input" className="sr-only">Bio</label>
            <textarea id="bio-input" autoFocus rows={6} maxLength={BIO_MAX} value={bioDraft} onChange={(e) => setBioDraft(e.target.value)}
              placeholder={isPlayer ? "Club, position, best moments, what you're working on" : "Who you scout for and what you look for"}
              className="w-full resize-none rounded-[14px] bg-secondary px-4 py-3 text-[16px] leading-[1.45] outline-none focus:ring-2 focus:ring-ring" />
            <p className="footnote text-right tabular-nums">{bioDraft.length}/{BIO_MAX}</p>
            <button type="button" onClick={saveBio} disabled={savingBio || bioDraft.trim() === profile.bio}
              className="press flex h-12 w-full items-center justify-center rounded-full bg-primary text-[16px] font-semibold text-primary-foreground disabled:opacity-40">
              {savingBio ? <Loader2 className="h-5 w-5 animate-spin" /> : "Save"}
            </button>
          </div>
        )}
      </BottomSheet>

      {user && <FollowListSheet userId={user.id} kind={list} onClose={() => setList(null)} />}
      <EditProfileSheet open={editOpen} onClose={() => setEditOpen(false)} initial={profile} isPlayer={isPlayer}
        hasPhoto={!!profile.avatar_url} onRemovePhoto={removeAvatar} onChangePhoto={() => fileRef.current?.click()}
        onSaved={(p) => setProfile({ ...profile, ...p })} />
      <AvatarCropDialog file={cropFile} open={!!cropFile} onOpenChange={(o) => !o && setCropFile(null)} onConfirm={saveAvatar} aspect={4 / 5} outputWidth={960} />
    </div>
  );
};

const EditProfileSheet = ({ open, onClose, initial, isPlayer, hasPhoto, onRemovePhoto, onChangePhoto, onSaved }: {
  open: boolean; onClose: () => void; initial: Profile; isPlayer: boolean; hasPhoto: boolean;
  onRemovePhoto: () => void; onChangePhoto: () => void; onSaved: (p: Partial<Profile>) => void;
}) => {
  const { user } = useAuth();
  const [f, setF] = useState(initial);
  const [saving, setSaving] = useState(false);
  useEffect(() => { if (open) setF(initial); }, [open]); // eslint-disable-line react-hooks/exhaustive-deps
  const username = f.username.trim().toLowerCase();
  const changedName = username !== initial.username;
  const uState = useUsernameState(username, open && changedName);
  const nameErr = !f.full_name.trim() ? "Enter your name" : null;
  const userErr = !/^[a-z0-9_]{3,24}$/.test(username) ? "3 to 24 lowercase letters, numbers or _"
    : changedName && uState === "taken" ? "That username is taken" : null;
  const dirty = JSON.stringify({ ...f, username }) !== JSON.stringify(initial);
  const canSave = dirty && !nameErr && !userErr && !(changedName && uState === "checking") && !saving;

  const save = async () => {
    if (!user || !canSave) return;
    setSaving(true);
    const patch = { full_name: f.full_name.trim().slice(0, 100), username,
      gender: f.gender || null, ...(isPlayer ? { sport: isSport(f.sport) ? f.sport : null } : {}) };
    const { error } = await supabase.from("profiles").update(patch).eq("user_id", user.id);
    setSaving(false);
    if (error) {
      toast.error("Profile not saved", { description: error.code === "23505" ? "That username was just taken. Try another." : "Check your connection and try again." });
      return;
    }
    if (user && patch.full_name !== initial.full_name) {
      await supabase.from("scout_profiles").update({ full_name: patch.full_name }).eq("user_id", user.id);
    }
    onSaved({ ...patch, gender: patch.gender ?? "", sport: (patch as { sport?: string | null }).sport ?? initial.sport });
    toast.success("Profile updated");
    onClose();
  };

  return (
    <BottomSheet open={open} onClose={onClose} title="Edit profile" height="88dvh">
      <div className="flex h-full flex-col">
        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-4">
          <div className="flex justify-center gap-3">
            <button type="button" onClick={onChangePhoto} className="press text-[15px] font-semibold text-primary">Change photo</button>
            {hasPhoto && <button type="button" onClick={onRemovePhoto} className="press text-[15px] text-destructive">Remove</button>}
          </div>
          <label className="block">
            <span className="ios-group-label !px-0 block">Name</span>
            <input className={field} value={f.full_name} maxLength={100} autoComplete="name" onChange={(e) => setF({ ...f, full_name: e.target.value })} aria-invalid={!!nameErr} />
            {nameErr && <span className="mt-1 block text-[13px] text-destructive">{nameErr}</span>}
          </label>
          <label className="block">
            <span className="ios-group-label !px-0 block">Username</span>
            <div className="relative">
              <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground">@</span>
              <input className={`${field} pl-8`} value={f.username} maxLength={24} autoCapitalize="none" autoCorrect="off" spellCheck={false}
                onChange={(e) => setF({ ...f, username: e.target.value.toLowerCase().replace(/\s/g, "") })} aria-invalid={!!userErr} />
              {changedName && uState === "checking" && <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" />}
              {changedName && uState === "ok" && !userErr && <Check className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-primary" />}
            </div>
            {userErr && <span className="mt-1 block text-[13px] text-destructive">{userErr}</span>}
          </label>
          {isPlayer && (
            <div>
              <span className="ios-group-label !px-0 block">Sport</span>
              <div className="grid grid-cols-3 rounded-xl bg-secondary p-1" role="radiogroup" aria-label="Sport">
                {SPORTS.map((s) => (
                  <button key={s} type="button" role="radio" aria-checked={f.sport === s} onClick={() => setF({ ...f, sport: s })}
                    className={`h-9 rounded-[9px] text-[15px] font-medium ${f.sport === s ? "bg-card shadow-[0_1px_3px_hsl(var(--foreground)/0.12)]" : "text-muted-foreground"}`}>{SPORT_LABEL[s]}</button>
                ))}
              </div>
            </div>
          )}
          <label className="block">
            <span className="ios-group-label !px-0 block">Gender</span>
            <select className={field} value={f.gender} onChange={(e) => setF({ ...f, gender: e.target.value })}>
              <option value="">Prefer not to say</option><option value="male">Male</option><option value="female">Female</option><option value="other">Other</option>
            </select>
          </label>
          <p className="footnote">Your bio and achievements are edited from your profile. Phone number and date of birth are under Settings, Personal details.</p>
        </div>
        <div className="flex shrink-0 gap-2 border-t border-border/70 p-3">
          <button type="button" onClick={onClose} className="press h-12 flex-1 rounded-full bg-secondary text-[16px] font-semibold">Cancel</button>
          <button type="button" onClick={save} disabled={!canSave} className="press flex h-12 flex-[2] items-center justify-center rounded-full bg-primary text-[16px] font-semibold text-primary-foreground disabled:opacity-40">
            {saving ? <Loader2 className="h-5 w-5 animate-spin" /> : "Save"}
          </button>
        </div>
      </div>
    </BottomSheet>
  );
};

export default ProfileTab;
