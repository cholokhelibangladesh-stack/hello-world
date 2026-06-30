import { motion } from "framer-motion";
import { Upload, Tag, CreditCard, Award, Video, Loader2, Download, CheckCircle, FileText, User, Eye, Flag, Plus, Trash2, AlertTriangle } from "lucide-react";
import jsPDF from "jspdf";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useState, useEffect, useRef } from "react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "@tanstack/react-router";
import ProfileTab from "@/components/ProfileTab";
import PlayerVideosTab from "@/components/PlayerVideosTab";

const positionsBySport: Record<string, string[]> = {
  football: ["Striker", "Defender", "Goalkeeper", "Midfielder", "Winger"],
  cricket: ["Bowler (Fast)", "Bowler (Spin)", "Batsman", "Wicketkeeper", "All-rounder"],
  basketball: ["Point Guard", "Shooting Guard", "Small Forward", "Power Forward", "Center"],
};
const traitsBySport: Record<string, string[]> = {
  football: ["Tactical", "Pace Abuser", "Freestyler", "Classical", "Aggressive"],
  cricket: ["Aggressive", "Defensive", "Anchor", "Power Hitter", "Tactical"],
  basketball: ["Sharpshooter", "Playmaker", "Slasher", "Lockdown Defender", "Rim Protector"],
};
const SPORTS: { id: "football" | "cricket" | "basketball"; label: string; icon: string }[] = [
  { id: "football", label: "Football", icon: "⚽" },
  { id: "cricket", label: "Cricket", icon: "🏏" },
  { id: "basketball", label: "Basketball", icon: "🏀" },
];

interface Scout {
  user_id: string;
  full_name: string;
  organization: string | null;
}

interface VideoRecord {
  id: string;
  status: string;
  description: string | null;
  position_tags: string[];
  trait_tags: string[];
  video_url: string | null;
  created_at: string;
}

const PlayerDashboard = () => {
  const [selectedPositions, setSelectedPositions] = useState<string[]>([]);
  const [selectedTraits, setSelectedTraits] = useState<string[]>([]);
  const [description, setDescription] = useState("");
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [bkashNumber, setBkashNumber] = useState("");
  const [uploading, setUploading] = useState(false);
  const [paying, setPaying] = useState(false);
  const [videoId, setVideoId] = useState<string | null>(null);
  const [videoStatus, setVideoStatus] = useState<string | null>(null);
  const [paymentDone, setPaymentDone] = useState(false);
  const [transactionId, setTransactionId] = useState<string | null>(null);
  const [paymentId, setPaymentId] = useState<string | null>(null);
  const [sport, setSport] = useState<string>("football");
  const [reportOpen, setReportOpen] = useState(false);
  const [scouts, setScouts] = useState<Scout[]>([]);
  const [selectedScoutId, setSelectedScoutId] = useState<string>("");
  const [reportReason, setReportReason] = useState("");
  const [reporting, setReporting] = useState(false);
  const [allVideos, setAllVideos] = useState<VideoRecord[]>([]);
  const [deletingVideoId, setDeletingVideoId] = useState<string | null>(null);
  const [showNewUpload, setShowNewUpload] = useState(false);
  const [uploadsHalted, setUploadsHalted] = useState(false);
  const [birthCertUrl, setBirthCertUrl] = useState<string | null>(null);
  const [birthCertUploading, setBirthCertUploading] = useState(false);
  const [savingSport, setSavingSport] = useState(false);
  const [activeTab, setActiveTab] = useState(() => {
    const hash = window.location.hash.replace("#", "");
    return ["upload", "explore", "profile"].includes(hash) ? hash : "upload";
  });
  const fileRef = useRef<HTMLInputElement>(null);
  const bcRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  // Sync tab with URL hash
  useEffect(() => {
    const hash = window.location.hash.replace("#", "");
    if (["upload", "explore", "profile"].includes(hash)) setActiveTab(hash);
  }, []);

  // Update hash when tab changes
  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    window.history.replaceState(null, "", `/player#${tab}`);
  };

  const loadUserData = async (userId: string) => {
    const [profileRes, videosRes, docsRes] = await Promise.all([
      supabase.from("profiles").select("sport").eq("user_id", userId).maybeSingle(),
      supabase.from("videos").select("*").eq("user_id", userId).order("created_at", { ascending: false }),
      supabase.from("documents").select("url").eq("user_id", userId).eq("type", "birth_certificate").maybeSingle(),
    ]);

    if (profileRes.data?.sport) setSport(profileRes.data.sport);
    if (docsRes.data?.url) setBirthCertUrl(docsRes.data.url);

    const videos = (videosRes.data || []) as VideoRecord[];
    setAllVideos(videos);

    // Check if uploads are halted
    const { data: settingData } = await supabase
      .from("app_settings" as any)
      .select("value")
      .eq("key", "video_uploads_halted")
      .maybeSingle();
    setUploadsHalted((settingData as any)?.value === "true");

    // Set current active video (most recent live or pending_payment)
    const activeVideo = videos.find((v) => v.status === "live" || v.status === "pending_payment");
    if (activeVideo) {
      setVideoId(activeVideo.id);
      setVideoStatus(activeVideo.status);
      setDescription(activeVideo.description || "");
      setSelectedPositions(activeVideo.position_tags || []);
      setSelectedTraits(activeVideo.trait_tags || []);
      if (activeVideo.status === "live") setPaymentDone(true);
    }

    // Fetch active scouts for report dialog
    const { data: scoutProfiles } = await supabase.from("scout_profiles")
      .select("user_id, organization")
      .eq("verification_status", "active");

    if (scoutProfiles && scoutProfiles.length > 0) {
      const ids = scoutProfiles.map((s) => s.user_id);
      const { data: profiles } = await supabase.from("profiles").select("user_id, full_name").in("user_id", ids);
      const profileMap = new Map((profiles || []).map((p) => [p.user_id, p.full_name]));
      setScouts(scoutProfiles.map((s) => ({
        user_id: s.user_id,
        full_name: profileMap.get(s.user_id) || "Unknown Scout",
        organization: s.organization,
      })));
    }
  };

  useEffect(() => {
    if (!authLoading && !user) { navigate({ to: "/auth" as any }); return; }
    if (user) loadUserData(user.id);
  }, [user, authLoading]);

  const positionTags = positionsBySport[sport] || positionsBySport.football;
  const traitTags = traitsBySport[sport] || traitsBySport.football;
  const toggleTag = (tag: string, list: string[], setter: (v: string[]) => void) => {
    setter(list.includes(tag) ? list.filter((t) => t !== tag) : [...list, tag]);
  };

  const handleSportChange = async (newSport: "football" | "cricket" | "basketball") => {
    if (!user || newSport === sport) return;
    setSport(newSport);
    setSelectedPositions([]);
    setSelectedTraits([]);
    setSavingSport(true);
    try {
      const { error } = await supabase.from("profiles").update({ sport: newSport } as any).eq("user_id", user.id);
      if (error) throw error;
      toast({ title: "Sport updated", description: `Your profile sport is now ${newSport}.` });
    } catch (err: any) {
      toast({ title: "Failed to save sport", description: err.message, variant: "destructive" });
    } finally {
      setSavingSport(false);
    }
  };

  const handleBirthCertUpload = async (file: File) => {
    if (!user) return;
    if (file.size > 8 * 1024 * 1024) {
      toast({ title: "File too large", description: "Birth certificate must be under 8 MB.", variant: "destructive" });
      return;
    }
    setBirthCertUploading(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `${user.id}/birth_certificate_${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("documents").upload(path, file, { upsert: true });
      if (upErr) throw upErr;
      const { data: { publicUrl } } = supabase.storage.from("documents").getPublicUrl(path);
      await supabase.from("documents").delete().eq("user_id", user.id).eq("type", "birth_certificate");
      await supabase.from("documents").insert(
        { user_id: user.id, type: "birth_certificate", url: publicUrl, name: file.name } as any
      );
      setBirthCertUrl(publicUrl);
      toast({ title: "Birth certificate uploaded ✅" });
    } catch (err: any) {
      toast({ title: "Upload failed", description: err.message, variant: "destructive" });
    } finally {
      setBirthCertUploading(false);
    }
  };

  const resetUploadForm = () => {
    setVideoFile(null);
    setVideoId(null);
    setVideoStatus(null);
    setDescription("");
    setSelectedPositions([]);
    setSelectedTraits([]);
    setPaymentDone(false);
    setTransactionId(null);
    setPaymentId(null);
    setBkashNumber("");
    setShowNewUpload(false);
  };

  // Upload only the DB record — actual file upload happens AFTER payment
  const handleUpload = async () => {
    if (!videoFile || !user) return;
    setUploading(true);
    try {
      const { data: video, error: dbError } = await supabase.from("videos").insert({
        user_id: user.id,
        description,
        video_url: "",
        status: "pending_payment" as any,
        position_tags: selectedPositions,
        trait_tags: selectedTraits,
      }).select().single();
      if (dbError) throw dbError;
      setVideoId(video.id);
      setVideoStatus("pending_payment");
      setAllVideos((prev) => [video as VideoRecord, ...prev]);
      toast({ title: "Details saved!", description: "Complete payment to upload your video and go live." });
    } catch (err: any) {
      toast({ title: "Failed", description: err.message, variant: "destructive" });
    } finally { setUploading(false); }
  };

  const handlePayment = async () => {
    if (!videoId || !user || !videoFile) return;
    setPaying(true);
    try {
      const { data, error } = await supabase.functions.invoke("process-payment", {
        body: { video_id: videoId, bkash_number: bkashNumber },
      });
      if (error) throw error;

      const ext = videoFile.name.split(".").pop();
      const filePath = `${user.id}/${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage.from("player-videos").upload(filePath, videoFile);
      if (uploadError) throw uploadError;
      const { data: { publicUrl } } = supabase.storage.from("player-videos").getPublicUrl(filePath);

      await supabase.from("videos").update({ video_url: publicUrl, status: "live" as any }).eq("id", videoId);

      setPaymentDone(true);
      setVideoStatus("live");
      setTransactionId(data.transaction_id);
      setPaymentId(data.payment_id);
      setAllVideos((prev) => prev.map((v) => v.id === videoId ? { ...v, video_url: publicUrl, status: "live" } : v));

      await supabase.from("notifications").insert({
        user_id: user.id,
        title: "🎉 Payment Successful!",
        message: "Your video is now live. Download your certificate and invoice from the Upload Hub.",
        type: "certificate",
      } as any);

      toast({ title: "Payment successful! ✅", description: `Transaction: ${data.transaction_id}` });
    } catch (err: any) {
      toast({ title: "Payment failed", description: err.message, variant: "destructive" });
    } finally { setPaying(false); }
  };

  const handleDeleteVideo = async (vid: VideoRecord) => {
    if (!user) return;
    setDeletingVideoId(vid.id);
    try {
      // Delete from storage if URL exists
      if (vid.video_url) {
        const urlParts = vid.video_url.split("/player-videos/");
        if (urlParts[1]) {
          await supabase.storage.from("player-videos").remove([urlParts[1]]);
        }
      }
      await supabase.from("videos").delete().eq("id", vid.id);
      setAllVideos((prev) => prev.filter((v) => v.id !== vid.id));
      // Reset active video state if it's the one being deleted
      if (videoId === vid.id) resetUploadForm();
      toast({ title: "Video deleted", description: "Your video has been removed." });
    } catch (err: any) {
      toast({ title: "Delete failed", description: err.message, variant: "destructive" });
    } finally { setDeletingVideoId(null); }
  };

  const handleReport = async () => {
    if (!user || !selectedScoutId || !reportReason.trim()) return;
    setReporting(true);
    try {
      const { data: scoutProfile } = await supabase.from("profiles").select("full_name").eq("user_id", selectedScoutId).maybeSingle();
      const scoutName = scoutProfile?.full_name || "Unknown Scout";
      const { data: myProfile } = await supabase.from("profiles").select("full_name").eq("user_id", user.id).maybeSingle();
      const playerName = myProfile?.full_name || "Unknown Player";

      const { data: adminRoles } = await supabase.from("user_roles").select("user_id").eq("role", "admin" as any);
      if (adminRoles && adminRoles.length > 0) {
        const notifs = adminRoles.map((a) => ({
          user_id: a.user_id,
          title: `🚨 Player Report: ${scoutName}`,
          message: `Player "${playerName}" has reported scout "${scoutName}": ${reportReason}`,
          type: "info",
          metadata: { reporter_id: user.id, reported_scout_id: selectedScoutId },
        }));
        await supabase.from("notifications").insert(notifs as any);
      }

      toast({ title: "Report submitted", description: "Admin has been notified." });
      setReportOpen(false);
      setReportReason("");
      setSelectedScoutId("");
    } catch (err: any) {
      toast({ title: "Failed to submit", description: err.message, variant: "destructive" });
    } finally { setReporting(false); }
  };

  const downloadCertificate = () => {
    const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
    const w = doc.internal.pageSize.getWidth();
    const h = doc.internal.pageSize.getHeight();
    const name = user?.user_metadata?.full_name || "Player";
    const date = new Date().toLocaleDateString("en-BD", { year: "numeric", month: "long", day: "numeric" });

    // Background — deep black
    doc.setFillColor(10, 10, 10);
    doc.rect(0, 0, w, h, "F");

    // Outer border — thin white
    doc.setDrawColor(240, 240, 240);
    doc.setLineWidth(0.6);
    doc.rect(8, 8, w - 16, h - 16);

    // Inner border — subtle grey
    doc.setDrawColor(60, 60, 60);
    doc.setLineWidth(0.3);
    doc.rect(12, 12, w - 24, h - 24);

    // Top decorative bar
    doc.setFillColor(240, 240, 240);
    doc.rect(12, 12, w - 24, 2, "F");
    doc.rect(12, h - 14, w - 24, 2, "F");

    // Title
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(160, 160, 160);
    doc.text("SCOUT BD", w / 2, 30, { align: "center" });

    doc.setFontSize(28);
    doc.setTextColor(240, 240, 240);
    doc.text("CERTIFICATE OF PARTICIPATION", w / 2, 50, { align: "center" });

    // Divider line
    doc.setDrawColor(80, 80, 80);
    doc.setLineWidth(0.4);
    doc.line(w / 2 - 80, 56, w / 2 + 80, 56);

    // Body text
    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);
    doc.setTextColor(160, 160, 160);
    doc.text("This certifies that", w / 2, 72, { align: "center" });

    // Player name — big and bold
    doc.setFont("helvetica", "bold");
    doc.setFontSize(32);
    doc.setTextColor(255, 255, 255);
    doc.text(name, w / 2, 92, { align: "center" });

    // Underline the name
    const nameWidth = doc.getTextWidth(name);
    doc.setDrawColor(180, 180, 180);
    doc.setLineWidth(0.3);
    doc.line(w / 2 - nameWidth / 2, 95, w / 2 + nameWidth / 2, 95);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);
    doc.setTextColor(140, 140, 140);
    doc.text("has successfully registered and submitted a highlight video on the", w / 2, 108, { align: "center" });

    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.setTextColor(220, 220, 220);
    doc.text("Scout BD Platform — Digitizing Bangladesh Sports", w / 2, 122, { align: "center" });

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(100, 100, 100);
    doc.text(`Date: ${date}   |   Transaction ID: ${transactionId || "N/A"}`, w / 2, 136, { align: "center" });

    // Signature section
    const sigY = h - 36;
    const sig1X = w / 2 - 60;
    const sig2X = w / 2 + 60;

    doc.setDrawColor(80, 80, 80);
    doc.setLineWidth(0.3);
    doc.line(sig1X - 40, sigY, sig1X + 40, sigY);
    doc.line(sig2X - 40, sigY, sig2X + 40, sigY);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(180, 180, 180);
    doc.text("Nahroor Rahman Khan", sig1X, sigY + 6, { align: "center" });
    doc.text("Rayeed Bin Abdul Khaleque", sig2X, sigY + 6, { align: "center" });

    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(90, 90, 90);
    doc.text("Co-Founder, Scout BD", sig1X, sigY + 11, { align: "center" });
    doc.text("Co-Founder, Scout BD", sig2X, sigY + 11, { align: "center" });

    doc.save("ScoutBD_Certificate.pdf");
  };

  const downloadInvoice = () => {
    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    const w = doc.internal.pageSize.getWidth();
    const h = doc.internal.pageSize.getHeight();
    const name = user?.user_metadata?.full_name || "Player";
    const email = user?.email || "";
    const date = new Date().toLocaleDateString("en-BD", { year: "numeric", month: "long", day: "numeric" });

    // Background
    doc.setFillColor(10, 10, 10);
    doc.rect(0, 0, w, h, "F");

    // Header strip
    doc.setFillColor(240, 240, 240);
    doc.rect(0, 0, w, 38, "F");

    // Brand name in header
    doc.setFont("helvetica", "bold");
    doc.setFontSize(22);
    doc.setTextColor(10, 10, 10);
    doc.text("SCOUT BD", 18, 24);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(60, 60, 60);
    doc.text("INVOICE", w - 18, 20, { align: "right" });
    doc.text(`Date: ${date}`, w - 18, 28, { align: "right" });

    // Transaction details
    let y = 54;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(120, 120, 120);
    doc.text(`Transaction ID: ${transactionId || "N/A"}`, 18, y);
    doc.text(`Payment ID: ${paymentId || "N/A"}`, 18, y + 8);

    // Bill To
    y = 82;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(100, 100, 100);
    doc.text("BILL TO", 18, y);
    doc.setDrawColor(50, 50, 50);
    doc.setLineWidth(0.3);
    doc.line(18, y + 2, 60, y + 2);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(240, 240, 240);
    doc.text(name, 18, y + 12);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(120, 120, 120);
    doc.text(email, 18, y + 20);

    // Table header
    y = 122;
    doc.setFillColor(30, 30, 30);
    doc.rect(18, y - 6, w - 36, 12, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(160, 160, 160);
    doc.text("DESCRIPTION", 24, y);
    doc.text("QTY", w / 2, y, { align: "center" });
    doc.text("AMOUNT", w - 24, y, { align: "right" });

    // Table row
    y += 14;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(200, 200, 200);
    doc.text("Video Registration & Participation Fee", 24, y);
    doc.text("1", w / 2, y, { align: "center" });
    doc.text("৳100.00", w - 24, y, { align: "right" });

    // Divider
    y += 8;
    doc.setDrawColor(40, 40, 40);
    doc.setLineWidth(0.3);
    doc.line(18, y, w - 18, y);

    // Total
    y += 14;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(180, 180, 180);
    doc.text("TOTAL", w / 2 - 20, y);
    doc.setTextColor(240, 240, 240);
    doc.text("৳100.00", w - 24, y, { align: "right" });

    // Status
    y += 18;
    doc.setFillColor(25, 25, 25);
    doc.rect(18, y - 6, w - 36, 16, "F");
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(120, 120, 120);
    doc.text("Payment Method: bKash", 24, y + 2);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(200, 200, 200);
    doc.text("Status: PAID ✓", w - 24, y + 2, { align: "right" });

    // Footer
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(60, 60, 60);
    doc.text("Scout BD — Digitizing Bangladesh Sports", w / 2, h - 12, { align: "center" });

    doc.save("ScoutBD_Invoice.pdf");
  };

  // Swipe gesture handling
  const touchStartX = useRef<number | null>(null);
  const tabs = ["upload", "explore", "profile"];
  const handleTouchStart = (e: React.TouchEvent) => { touchStartX.current = e.touches[0].clientX; };
  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const diff = touchStartX.current - e.changedTouches[0].clientX;
    if (Math.abs(diff) < 50) return;
    const idx = tabs.indexOf(activeTab);
    if (diff > 0 && idx < tabs.length - 1) setActiveTab(tabs[idx + 1]);
    else if (diff < 0 && idx > 0) setActiveTab(tabs[idx - 1]);
    touchStartX.current = null;
  };

  if (authLoading) return <div className="min-h-screen flex items-center justify-center pt-16 pb-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  const liveVideos = allVideos.filter((v) => v.status === "live");
  const pendingVideos = allVideos.filter((v) => v.status === "pending_payment");

  return (
    <div className="min-h-screen pt-16 pb-20 md:pb-8">
      <div className="container max-w-4xl">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <div className="flex items-start justify-between mb-5 pt-4">
            <div>
              <h1 className="font-display text-3xl sm:text-4xl text-foreground mb-0.5">PLAYER DASHBOARD</h1>
              <p className="text-sm text-muted-foreground">Manage your profile, upload videos, and explore players</p>
            </div>
            <Dialog open={reportOpen} onOpenChange={setReportOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="border-destructive/40 text-destructive hover:bg-destructive/10 rounded-full text-xs shrink-0">
                  <Flag className="h-3 w-3 mr-1" /> <span className="hidden xs:inline">Report Scout</span><span className="xs:hidden">Report</span>
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-card border-border">
                <DialogHeader>
                  <DialogTitle className="font-display text-xl text-foreground">REPORT A SCOUT</DialogTitle>
                </DialogHeader>
                <p className="text-sm text-muted-foreground">Select the scout you want to report and describe the issue. Only the admin will see this.</p>
                <div className="space-y-3">
                  <div>
                    <Label className="text-sm text-muted-foreground">Select Scout</Label>
                    <Select value={selectedScoutId} onValueChange={setSelectedScoutId}>
                      <SelectTrigger className="bg-secondary border-border mt-1">
                        <SelectValue placeholder="Choose a scout..." />
                      </SelectTrigger>
                      <SelectContent className="bg-card border-border">
                        {scouts.map((s) => (
                          <SelectItem key={s.user_id} value={s.user_id}>
                            {s.full_name}{s.organization ? ` — ${s.organization}` : ""}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-sm text-muted-foreground">Reason / Description</Label>
                    <Textarea
                      placeholder="Describe what happened..."
                      className="mt-1 bg-secondary border-border resize-none"
                      rows={3}
                      value={reportReason}
                      onChange={(e) => setReportReason(e.target.value)}
                    />
                  </div>
                  <Button
                    onClick={handleReport}
                    disabled={reporting || !selectedScoutId || !reportReason.trim()}
                    className="w-full bg-destructive text-white hover:bg-destructive/90"
                  >
                    {reporting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Flag className="h-4 w-4 mr-2" />}
                    Submit Report to Admin
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-4 sm:space-y-6" onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}>
            <TabsList className="bg-card border border-border w-full grid grid-cols-3">
              <TabsTrigger value="upload" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground text-xs sm:text-sm">
                <Upload className="h-3.5 w-3.5 sm:mr-1.5 shrink-0" /> <span className="hidden sm:inline">Upload Hub</span><span className="sm:hidden ml-1">Upload</span>
              </TabsTrigger>
              <TabsTrigger value="explore" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground text-xs sm:text-sm">
                <Eye className="h-3.5 w-3.5 sm:mr-1.5 shrink-0" /> <span className="hidden sm:inline">Explore Players</span><span className="sm:hidden ml-1">Explore</span>
              </TabsTrigger>
              <TabsTrigger value="profile" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground text-xs sm:text-sm">
                <User className="h-3.5 w-3.5 sm:mr-1.5 shrink-0" /> <span className="hidden sm:inline">My Profile</span><span className="sm:hidden ml-1">Profile</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="upload" className="space-y-6">
              {/* Upload New button when videos already exist */}
              {allVideos.length > 0 && !showNewUpload && (
                <div className="flex justify-end">
                  <Button size="sm" variant="outline" onClick={() => { resetUploadForm(); setShowNewUpload(true); }} className="border-primary/40 text-primary hover:bg-primary/10 rounded-full text-xs">
                    <Plus className="h-3 w-3 mr-1" /> Upload New Video
                  </Button>
                </div>
              )}

              {/* New Upload Form */}
              {(allVideos.length === 0 || showNewUpload) && (
                <div className="space-y-6">
                  {showNewUpload && (
                    <div className="flex items-center justify-between">
                      <h3 className="font-display text-lg text-foreground">NEW VIDEO UPLOAD</h3>
                      <Button variant="ghost" size="sm" onClick={() => setShowNewUpload(false)} className="text-muted-foreground text-xs">Cancel</Button>
                    </div>
                  )}

                  {uploadsHalted ? (
                    <div className="bg-card border border-border rounded-xl p-10 text-center space-y-4">
                      <div className="w-14 h-14 rounded-full bg-secondary flex items-center justify-center mx-auto">
                        <Video className="h-6 w-6 text-muted-foreground" />
                      </div>
                      <p className="font-display text-xl text-foreground">MONTHLY LIMIT REACHED!</p>
                      <p className="text-sm text-muted-foreground max-w-xs mx-auto">
                        We will start accepting videos again next month. Thank you for your patience!
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      {/* Video Upload */}
                      <div className="bg-card border border-border rounded-xl p-6">
                        <div className="flex items-center gap-3 mb-4">
                          <Video className="h-5 w-5 text-primary" />
                          <h2 className="font-display text-xl text-foreground">HIGHLIGHT VIDEO</h2>
                          {videoStatus && (
                            <Badge variant={videoStatus === "live" ? "default" : "outline"} className={videoStatus === "live" ? "bg-primary text-primary-foreground" : ""}>{videoStatus.replace("_", " ")}</Badge>
                          )}
                        </div>
                        {!videoId ? (
                          <>
                            <div onClick={() => fileRef.current?.click()} className="border-2 border-dashed border-border rounded-xl p-12 text-center hover:border-primary/40 transition-colors cursor-pointer bg-secondary/50">
                              <Upload className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                              <p className="text-foreground font-medium mb-1">{videoFile ? videoFile.name : "Drop your video here"}</p>
                              <p className="text-xs text-muted-foreground">Max 3 minutes • MP4, MOV, AVI</p>
                              {videoFile && <p className="text-xs text-primary mt-2">✓ File selected — complete payment to upload</p>}
                            </div>
                            <input ref={fileRef} type="file" accept="video/*" className="hidden" onChange={(e) => setVideoFile(e.target.files?.[0] || null)} />
                          </>
                        ) : (
                          <div className="flex items-center gap-2 bg-secondary/50 rounded-lg p-4">
                            <CheckCircle className="h-5 w-5 text-primary" />
                            <span className="text-foreground text-sm">{paymentDone ? "Video uploaded and live!" : "Details saved — complete payment to upload video"}</span>
                          </div>
                        )}
                        <div className="mt-4">
                          <Label className="text-sm text-muted-foreground">Video Description (max 100 words)</Label>
                          <Textarea placeholder="Tell scouts what makes you special..." className="mt-1 bg-secondary border-border resize-none" rows={3} maxLength={600} value={description} onChange={(e) => setDescription(e.target.value)} />
                        </div>
                      </div>

                      {/* Tags */}
                      <div className="bg-card border border-border rounded-xl p-6">
                        <div className="flex items-center gap-3 mb-4">
                          <Tag className="h-5 w-5 text-primary" />
                          <h2 className="font-display text-xl text-foreground">POSITION & TRAITS</h2>
                        </div>
                        <div className="mb-4">
                          <Label className="text-xs text-muted-foreground uppercase tracking-wide">Position</Label>
                          <div className="flex flex-wrap gap-2 mt-2">
                            {positionTags.map((tag) => (
                              <Badge key={tag} variant={selectedPositions.includes(tag) ? "default" : "outline"}
                                className={`cursor-pointer transition-all ${selectedPositions.includes(tag) ? "bg-primary text-primary-foreground hover:bg-primary/90" : "border-border text-muted-foreground hover:border-primary/40 hover:text-foreground"}`}
                                onClick={() => toggleTag(tag, selectedPositions, setSelectedPositions)}>{tag}</Badge>
                            ))}
                          </div>
                        </div>
                        <div>
                          <Label className="text-xs text-muted-foreground uppercase tracking-wide">Play Style</Label>
                          <div className="flex flex-wrap gap-2 mt-2">
                            {traitTags.map((tag) => (
                              <Badge key={tag} variant={selectedTraits.includes(tag) ? "default" : "outline"}
                                className={`cursor-pointer transition-all ${selectedTraits.includes(tag) ? "bg-primary text-primary-foreground hover:bg-primary/90" : "border-border text-muted-foreground hover:border-primary/40 hover:text-foreground"}`}
                                onClick={() => toggleTag(tag, selectedTraits, setSelectedTraits)}>{tag}</Badge>
                            ))}
                          </div>
                        </div>
                      </div>

                      {/* Save details */}
                      {!videoId && videoFile && (
                        <Button onClick={handleUpload} disabled={uploading} className="w-full bg-primary text-primary-foreground font-bold hover:bg-primary/90">
                          {uploading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Upload className="h-4 w-4 mr-2" />}
                          Save Details & Proceed to Payment
                        </Button>
                      )}

                      {/* Payment */}
                      {videoId && !paymentDone && (
                        <div className="bg-card border border-border rounded-xl p-6">
                          <div className="flex items-center gap-3 mb-4">
                            <CreditCard className="h-5 w-5 text-primary" />
                            <h2 className="font-display text-xl text-foreground">PAYMENT</h2>
                          </div>
                          <div className="bg-primary/5 border border-primary/20 rounded-lg p-3 mb-4 text-sm text-muted-foreground">
                            💡 Your video will be uploaded <span className="text-foreground font-medium">only after</span> payment is confirmed.
                          </div>
                          <div className="flex items-center justify-between bg-secondary rounded-lg p-4 mb-4">
                            <div>
                              <p className="text-foreground font-medium">Participation Fee</p>
                              <p className="text-xs text-muted-foreground">One-time payment via bKash</p>
                            </div>
                            <span className="font-display text-3xl text-primary">৳100</span>
                          </div>
                          <div className="mb-4">
                            <Label className="text-sm text-muted-foreground">bKash Number</Label>
                            <Input placeholder="01XXXXXXXXX" className="mt-1 bg-secondary border-border" value={bkashNumber} onChange={(e) => setBkashNumber(e.target.value)} />
                          </div>
                          <Button className="w-full bg-primary text-primary-foreground font-bold hover:bg-primary/90" onClick={handlePayment} disabled={paying || !bkashNumber || !videoFile}>
                            {paying ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                            {paying ? "Uploading & Processing..." : "Pay with bKash & Upload Video"}
                          </Button>
                        </div>
                      )}

                      {/* Documents — only after payment */}
                      {paymentDone && (
                        <div className="bg-card border border-border rounded-xl p-6">
                          <div className="flex items-center gap-3 mb-4">
                            <Award className="h-5 w-5 text-primary" />
                            <h2 className="font-display text-xl text-foreground">DOCUMENTS</h2>
                          </div>
                          <p className="text-sm text-muted-foreground mb-4">Your video is now live! Download your certificate and invoice below.</p>
                          <div className="flex flex-col sm:flex-row gap-3">
                            <Button onClick={downloadCertificate} variant="outline" className="border-primary/40 text-primary hover:bg-primary/10">
                              <Download className="h-4 w-4 mr-2" /> Download Certificate
                            </Button>
                            <Button onClick={downloadInvoice} variant="outline" className="border-primary/40 text-primary hover:bg-primary/10">
                              <FileText className="h-4 w-4 mr-2" /> Download Invoice
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Show documents for existing live video when not in new upload mode */}
              {allVideos.length > 0 && !showNewUpload && liveVideos.length > 0 && paymentDone && (
                <div className="bg-card border border-border rounded-xl p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <Award className="h-5 w-5 text-primary" />
                    <h2 className="font-display text-xl text-foreground">DOCUMENTS</h2>
                  </div>
                  <p className="text-sm text-muted-foreground mb-4">Download your certificate and invoice.</p>
                  <div className="flex flex-col sm:flex-row gap-3">
                    <Button onClick={downloadCertificate} variant="outline" className="border-primary/40 text-primary hover:bg-primary/10">
                      <Download className="h-4 w-4 mr-2" /> Download Certificate
                    </Button>
                    <Button onClick={downloadInvoice} variant="outline" className="border-primary/40 text-primary hover:bg-primary/10">
                      <FileText className="h-4 w-4 mr-2" /> Download Invoice
                    </Button>
                  </div>
                </div>
              )}

              {/* Empty state */}
              {allVideos.length === 0 && !videoFile && (
                <div className="text-center py-8 text-muted-foreground">
                  <Video className="h-12 w-12 mx-auto mb-3 opacity-30" />
                  <p className="text-sm">No videos yet. Select a file above to get started.</p>
                </div>
              )}
            </TabsContent>

            <TabsContent value="explore">
              <PlayerVideosTab />
            </TabsContent>

            <TabsContent value="profile">
              <ProfileTab showVideos={allVideos} onDeleteVideo={handleDeleteVideo} deletingVideoId={deletingVideoId} />
            </TabsContent>
          </Tabs>
        </motion.div>
      </div>
    </div>
  );
};

export default PlayerDashboard;
