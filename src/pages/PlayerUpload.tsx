import { motion } from "framer-motion";
import { Upload, Tag, CreditCard, Award, Video, Loader2, Download, FileText, Plus, Flag } from "lucide-react";
import jsPDF from "jspdf";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState, useEffect, useRef } from "react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";

const footballTags = ["Striker", "Defender", "Goalkeeper", "Midfielder", "Winger"];
const cricketTags = ["Bowler (Fast)", "Bowler (Spin)", "Batsman", "Wicketkeeper", "All-rounder"];
const traitTags = ["Tactical", "Pace Abuser", "Freestyler", "Classical", "Aggressive"];

interface Scout { user_id: string; full_name: string; organization: string | null; }
interface VideoRecord {
  id: string; status: string; description: string | null;
  position_tags: string[]; trait_tags: string[]; video_url: string | null; created_at: string;
}

const PlayerUpload = () => {
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
  const [showNewUpload, setShowNewUpload] = useState(false);
  const [uploadsHalted, setUploadsHalted] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  const loadUserData = async (userId: string) => {
    const [profileRes, videosRes] = await Promise.all([
      supabase.from("profiles").select("sport").eq("user_id", userId).maybeSingle(),
      supabase.from("videos").select("*").eq("user_id", userId).order("created_at", { ascending: false }),
    ]);
    if (profileRes.data?.sport) setSport(profileRes.data.sport);
    const videos = (videosRes.data || []) as VideoRecord[];
    setAllVideos(videos);

    const { data: settingData } = await supabase.from("app_settings" as any).select("value").eq("key", "video_uploads_halted").maybeSingle();
    setUploadsHalted((settingData as any)?.value === "true");

    const activeVideo = videos.find((v) => v.status === "live" || v.status === "pending_payment");
    if (activeVideo) {
      setVideoId(activeVideo.id);
      setVideoStatus(activeVideo.status);
      setDescription(activeVideo.description || "");
      setSelectedPositions(activeVideo.position_tags || []);
      setSelectedTraits(activeVideo.trait_tags || []);
      if (activeVideo.status === "live") setPaymentDone(true);
    }

    const { data: scoutProfiles } = await supabase.from("scout_profiles").select("user_id, organization").eq("verification_status", "active");
    if (scoutProfiles && scoutProfiles.length > 0) {
      const ids = scoutProfiles.map((s) => s.user_id);
      const { data: profiles } = await supabase.from("profiles").select("user_id, full_name").in("user_id", ids);
      const profileMap = new Map((profiles || []).map((p) => [p.user_id, p.full_name]));
      setScouts(scoutProfiles.map((s) => ({ user_id: s.user_id, full_name: profileMap.get(s.user_id) || "Unknown Scout", organization: s.organization })));
    }
  };

  useEffect(() => {
    if (!authLoading && !user) { navigate("/auth"); return; }
    if (user) loadUserData(user.id);
  }, [user, authLoading]);

  const positionTags = sport === "cricket" ? cricketTags : footballTags;
  const toggleTag = (tag: string, list: string[], setter: (v: string[]) => void) => {
    setter(list.includes(tag) ? list.filter((t) => t !== tag) : [...list, tag]);
  };

  const resetUploadForm = () => {
    setVideoFile(null); setVideoId(null); setVideoStatus(null); setDescription("");
    setSelectedPositions([]); setSelectedTraits([]); setPaymentDone(false);
    setTransactionId(null); setPaymentId(null); setBkashNumber(""); setShowNewUpload(false);
  };

  const handleUpload = async () => {
    if (!videoFile || !user) return;
    setUploading(true);
    try {
      const { data: video, error: dbError } = await supabase.from("videos").insert({
        user_id: user.id, description, video_url: null, status: "pending_payment" as any,
        position_tags: selectedPositions, trait_tags: selectedTraits,
      }).select().single();
      if (dbError) throw dbError;
      setVideoId(video.id); setVideoStatus("pending_payment");
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
      const { data, error } = await supabase.functions.invoke("process-payment", { body: { video_id: videoId, bkash_number: bkashNumber } });
      if (error) throw error;
      const ext = videoFile.name.split(".").pop();
      const filePath = `${user.id}/${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage.from("player-videos").upload(filePath, videoFile);
      if (uploadError) throw uploadError;
      const { data: { publicUrl } } = supabase.storage.from("player-videos").getPublicUrl(filePath);
      await supabase.from("videos").update({ video_url: publicUrl, status: "live" as any }).eq("id", videoId);
      setPaymentDone(true); setVideoStatus("live"); setTransactionId(data.transaction_id); setPaymentId(data.payment_id);
      setAllVideos((prev) => prev.map((v) => v.id === videoId ? { ...v, video_url: publicUrl, status: "live" } : v));
      await supabase.from("notifications").insert({ user_id: user.id, title: "🎉 Payment Successful!", message: "Your video is now live. Download your certificate and invoice.", type: "certificate" } as any);
      toast({ title: "Payment successful! ✅", description: `Transaction: ${data.transaction_id}` });
    } catch (err: any) {
      toast({ title: "Payment failed", description: err.message, variant: "destructive" });
    } finally { setPaying(false); }
  };

  const handleReport = async () => {
    if (!user || !selectedScoutId || !reportReason.trim()) return;
    setReporting(true);
    try {
      const { data: scoutProfile } = await supabase.from("profiles").select("full_name").eq("user_id", selectedScoutId).maybeSingle();
      const { data: myProfile } = await supabase.from("profiles").select("full_name").eq("user_id", user.id).maybeSingle();
      const { data: adminRoles } = await supabase.from("user_roles").select("user_id").eq("role", "admin" as any);
      if (adminRoles && adminRoles.length > 0) {
        await supabase.from("notifications").insert(adminRoles.map((a) => ({
          user_id: a.user_id, title: `🚨 Player Report: ${scoutProfile?.full_name}`,
          message: `Player "${myProfile?.full_name}" reported "${scoutProfile?.full_name}": ${reportReason}`,
          type: "info", metadata: { reporter_id: user.id, reported_scout_id: selectedScoutId },
        })) as any);
      }
      toast({ title: "Report submitted" });
      setReportOpen(false); setReportReason(""); setSelectedScoutId("");
    } catch (err: any) {
      toast({ title: "Failed", description: err.message, variant: "destructive" });
    } finally { setReporting(false); }
  };

  const downloadCertificate = () => {
    const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
    const w = doc.internal.pageSize.getWidth(); const h = doc.internal.pageSize.getHeight();
    const name = user?.user_metadata?.full_name || "Player";
    const date = new Date().toLocaleDateString("en-BD", { year: "numeric", month: "long", day: "numeric" });
    doc.setFillColor(10, 10, 10); doc.rect(0, 0, w, h, "F");
    doc.setDrawColor(240, 240, 240); doc.setLineWidth(0.6); doc.rect(8, 8, w - 16, h - 16);
    doc.setDrawColor(60, 60, 60); doc.setLineWidth(0.3); doc.rect(12, 12, w - 24, h - 24);
    doc.setFillColor(240, 240, 240); doc.rect(12, 12, w - 24, 2, "F"); doc.rect(12, h - 14, w - 24, 2, "F");
    doc.setFont("helvetica", "bold"); doc.setFontSize(10); doc.setTextColor(160, 160, 160); doc.text("SCOUT BD", w / 2, 30, { align: "center" });
    doc.setFontSize(28); doc.setTextColor(240, 240, 240); doc.text("CERTIFICATE OF PARTICIPATION", w / 2, 50, { align: "center" });
    doc.setDrawColor(80, 80, 80); doc.setLineWidth(0.4); doc.line(w / 2 - 80, 56, w / 2 + 80, 56);
    doc.setFont("helvetica", "normal"); doc.setFontSize(11); doc.setTextColor(160, 160, 160); doc.text("This certifies that", w / 2, 72, { align: "center" });
    doc.setFont("helvetica", "bold"); doc.setFontSize(32); doc.setTextColor(255, 255, 255); doc.text(name, w / 2, 92, { align: "center" });
    const nameWidth = doc.getTextWidth(name); doc.setDrawColor(180, 180, 180); doc.setLineWidth(0.3); doc.line(w / 2 - nameWidth / 2, 95, w / 2 + nameWidth / 2, 95);
    doc.setFont("helvetica", "normal"); doc.setFontSize(11); doc.setTextColor(140, 140, 140); doc.text("has successfully registered and submitted a highlight video on the", w / 2, 108, { align: "center" });
    doc.setFont("helvetica", "bold"); doc.setFontSize(14); doc.setTextColor(220, 220, 220); doc.text("Scout BD Platform — Digitizing Bangladesh Sports", w / 2, 122, { align: "center" });
    doc.setFont("helvetica", "normal"); doc.setFontSize(9); doc.setTextColor(100, 100, 100); doc.text(`Date: ${date}   |   Transaction ID: ${transactionId || "N/A"}`, w / 2, 136, { align: "center" });
    const sigY = h - 36; const sig1X = w / 2 - 60; const sig2X = w / 2 + 60;
    doc.setDrawColor(80, 80, 80); doc.setLineWidth(0.3); doc.line(sig1X - 40, sigY, sig1X + 40, sigY); doc.line(sig2X - 40, sigY, sig2X + 40, sigY);
    doc.setFont("helvetica", "bold"); doc.setFontSize(8); doc.setTextColor(180, 180, 180);
    doc.text("Nahroor Rahman Khan", sig1X, sigY + 6, { align: "center" }); doc.text("Rayeed Bin Abdul Khaleque", sig2X, sigY + 6, { align: "center" });
    doc.setFont("helvetica", "normal"); doc.setFontSize(7); doc.setTextColor(90, 90, 90);
    doc.text("Co-Founder, Scout BD", sig1X, sigY + 11, { align: "center" }); doc.text("Co-Founder, Scout BD", sig2X, sigY + 11, { align: "center" });
    doc.save("ScoutBD_Certificate.pdf");
  };

  const downloadInvoice = () => {
    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    const w = doc.internal.pageSize.getWidth(); const h = doc.internal.pageSize.getHeight();
    const name = user?.user_metadata?.full_name || "Player"; const email = user?.email || "";
    const date = new Date().toLocaleDateString("en-BD", { year: "numeric", month: "long", day: "numeric" });
    doc.setFillColor(10, 10, 10); doc.rect(0, 0, w, h, "F");
    doc.setFillColor(240, 240, 240); doc.rect(0, 0, w, 38, "F");
    doc.setFont("helvetica", "bold"); doc.setFontSize(22); doc.setTextColor(10, 10, 10); doc.text("SCOUT BD", 18, 24);
    doc.setFont("helvetica", "normal"); doc.setFontSize(9); doc.setTextColor(60, 60, 60); doc.text("INVOICE", w - 18, 20, { align: "right" }); doc.text(`Date: ${date}`, w - 18, 28, { align: "right" });
    let y = 54; doc.setFont("helvetica", "normal"); doc.setFontSize(9); doc.setTextColor(120, 120, 120);
    doc.text(`Transaction ID: ${transactionId || "N/A"}`, 18, y); doc.text(`Payment ID: ${paymentId || "N/A"}`, 18, y + 8);
    y = 82; doc.setFont("helvetica", "bold"); doc.setFontSize(8); doc.setTextColor(100, 100, 100); doc.text("BILL TO", 18, y);
    doc.setDrawColor(50, 50, 50); doc.setLineWidth(0.3); doc.line(18, y + 2, 60, y + 2);
    doc.setFont("helvetica", "bold"); doc.setFontSize(12); doc.setTextColor(240, 240, 240); doc.text(name, 18, y + 12);
    doc.setFont("helvetica", "normal"); doc.setFontSize(9); doc.setTextColor(120, 120, 120); doc.text(email, 18, y + 20);
    y = 122; doc.setFillColor(30, 30, 30); doc.rect(18, y - 6, w - 36, 12, "F");
    doc.setFont("helvetica", "bold"); doc.setFontSize(8); doc.setTextColor(160, 160, 160);
    doc.text("DESCRIPTION", 24, y); doc.text("QTY", w / 2, y, { align: "center" }); doc.text("AMOUNT", w - 24, y, { align: "right" });
    y += 14; doc.setFont("helvetica", "normal"); doc.setFontSize(9); doc.setTextColor(200, 200, 200);
    doc.text("Video Registration & Participation Fee", 24, y); doc.text("1", w / 2, y, { align: "center" }); doc.text("৳100.00", w - 24, y, { align: "right" });
    y += 8; doc.setDrawColor(40, 40, 40); doc.setLineWidth(0.3); doc.line(18, y, w - 18, y);
    y += 14; doc.setFont("helvetica", "bold"); doc.setFontSize(11); doc.setTextColor(180, 180, 180); doc.text("TOTAL", w / 2 - 20, y);
    doc.setTextColor(240, 240, 240); doc.text("৳100.00", w - 24, y, { align: "right" });
    y += 18; doc.setFillColor(25, 25, 25); doc.rect(18, y - 6, w - 36, 16, "F");
    doc.setFont("helvetica", "normal"); doc.setFontSize(8); doc.setTextColor(120, 120, 120); doc.text("Payment Method: bKash", 24, y + 2);
    doc.setFont("helvetica", "bold"); doc.setTextColor(200, 200, 200); doc.text("Status: PAID ✓", w - 24, y + 2, { align: "right" });
    doc.setFont("helvetica", "normal"); doc.setFontSize(7); doc.setTextColor(60, 60, 60); doc.text("Scout BD — Digitizing Bangladesh Sports", w / 2, h - 12, { align: "center" });
    doc.save("ScoutBD_Invoice.pdf");
  };

  if (authLoading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  const liveVideos = allVideos.filter((v) => v.status === "live");

  return (
    <div className="min-h-screen pt-16 pb-24">
      <div className="container max-w-2xl">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6 pt-4">

          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="font-display text-3xl text-foreground">UPLOAD HUB</h1>
              <p className="text-sm text-muted-foreground">Submit your highlight video</p>
            </div>
            <Dialog open={reportOpen} onOpenChange={setReportOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="border-destructive/40 text-destructive hover:bg-destructive/10 rounded-full text-xs shrink-0">
                  <Flag className="h-3 w-3 mr-1" /> Report
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-card border-border">
                <DialogHeader><DialogTitle className="font-display text-xl text-foreground">REPORT A SCOUT</DialogTitle></DialogHeader>
                <div className="space-y-3">
                  <Select value={selectedScoutId} onValueChange={setSelectedScoutId}>
                    <SelectTrigger className="bg-secondary border-border"><SelectValue placeholder="Choose a scout..." /></SelectTrigger>
                    <SelectContent className="bg-card border-border">
                      {scouts.map((s) => <SelectItem key={s.user_id} value={s.user_id}>{s.full_name}{s.organization ? ` — ${s.organization}` : ""}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Textarea placeholder="Describe what happened..." className="bg-secondary border-border resize-none" rows={3} value={reportReason} onChange={(e) => setReportReason(e.target.value)} />
                  <Button onClick={handleReport} disabled={reporting || !selectedScoutId || !reportReason.trim()} className="w-full bg-destructive text-white hover:bg-destructive/90">
                    {reporting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Flag className="h-4 w-4 mr-2" />} Submit Report
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {/* Upload New button when videos exist */}
          {allVideos.length > 0 && !showNewUpload && (
            <div className="flex justify-end">
              <Button size="sm" variant="outline" onClick={() => { resetUploadForm(); setShowNewUpload(true); }} className="border-primary/40 text-primary hover:bg-primary/10 rounded-full text-xs">
                <Plus className="h-3 w-3 mr-1" /> Upload New Video
              </Button>
            </div>
          )}

          {/* Upload form */}
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
                  <Video className="h-12 w-12 mx-auto text-muted-foreground opacity-30" />
                  <p className="font-display text-xl text-foreground">MONTHLY LIMIT REACHED!</p>
                  <p className="text-sm text-muted-foreground max-w-xs mx-auto">We will start accepting videos again next month. Thank you for your patience!</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* File pick */}
                  <div className="bg-card border border-border rounded-xl p-6">
                    <div className="flex items-center gap-3 mb-4">
                      <Upload className="h-5 w-5 text-primary" />
                      <h2 className="font-display text-xl text-foreground">SELECT VIDEO</h2>
                    </div>
                    <div
                      className="border-2 border-dashed border-border rounded-xl p-8 text-center cursor-pointer hover:border-primary/50 transition-colors"
                      onClick={() => fileRef.current?.click()}
                    >
                      {videoFile ? (
                        <div className="space-y-1">
                          <Video className="h-8 w-8 mx-auto text-primary" />
                          <p className="text-sm text-foreground font-medium">{videoFile.name}</p>
                          <p className="text-xs text-muted-foreground">{(videoFile.size / 1024 / 1024).toFixed(1)} MB</p>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <Upload className="h-8 w-8 mx-auto text-muted-foreground" />
                          <p className="text-sm text-muted-foreground">Tap to select your highlight video</p>
                          <p className="text-xs text-muted-foreground/60">MP4, MOV up to 100MB</p>
                        </div>
                      )}
                    </div>
                    <input ref={fileRef} type="file" accept="video/*" className="hidden" onChange={(e) => e.target.files?.[0] && setVideoFile(e.target.files[0])} />
                  </div>

                  {/* Tags */}
                  {videoFile && (
                    <div className="bg-card border border-border rounded-xl p-6 space-y-4">
                      <div className="flex items-center gap-3 mb-2">
                        <Tag className="h-5 w-5 text-primary" />
                        <h2 className="font-display text-xl text-foreground">DETAILS</h2>
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground uppercase tracking-wide">Description</Label>
                        <Textarea placeholder="Short description of your highlights..." className="mt-1 bg-secondary border-border resize-none rounded-xl" rows={2} value={description} onChange={(e) => setDescription(e.target.value)} />
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground uppercase tracking-wide">Position</Label>
                        <div className="flex flex-wrap gap-2 mt-2">
                          {positionTags.map((tag) => (
                            <Badge key={tag} variant={selectedPositions.includes(tag) ? "default" : "outline"}
                              className={`cursor-pointer transition-all ${selectedPositions.includes(tag) ? "bg-primary text-primary-foreground" : "border-border text-muted-foreground hover:border-primary/40"}`}
                              onClick={() => toggleTag(tag, selectedPositions, setSelectedPositions)}>{tag}</Badge>
                          ))}
                        </div>
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground uppercase tracking-wide">Play Style</Label>
                        <div className="flex flex-wrap gap-2 mt-2">
                          {traitTags.map((tag) => (
                            <Badge key={tag} variant={selectedTraits.includes(tag) ? "default" : "outline"}
                              className={`cursor-pointer transition-all ${selectedTraits.includes(tag) ? "bg-primary text-primary-foreground" : "border-border text-muted-foreground hover:border-primary/40"}`}
                              onClick={() => toggleTag(tag, selectedTraits, setSelectedTraits)}>{tag}</Badge>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

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
                      <Label className="text-sm text-muted-foreground">bKash Number</Label>
                      <Input placeholder="01XXXXXXXXX" className="mt-1 bg-secondary border-border mb-4" value={bkashNumber} onChange={(e) => setBkashNumber(e.target.value)} />
                      <Button className="w-full bg-primary text-primary-foreground font-bold hover:bg-primary/90" onClick={handlePayment} disabled={paying || !bkashNumber || !videoFile}>
                        {paying ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                        {paying ? "Uploading & Processing..." : "Pay with bKash & Upload Video"}
                      </Button>
                    </div>
                  )}

                  {/* Documents after payment */}
                  {paymentDone && (
                    <div className="bg-card border border-border rounded-xl p-6">
                      <div className="flex items-center gap-3 mb-4">
                        <Award className="h-5 w-5 text-primary" />
                        <h2 className="font-display text-xl text-foreground">DOCUMENTS</h2>
                      </div>
                      <p className="text-sm text-muted-foreground mb-4">Your video is now live! Download your certificate and invoice below.</p>
                      <div className="flex flex-col sm:flex-row gap-3">
                        <Button onClick={downloadCertificate} variant="outline" className="border-primary/40 text-primary hover:bg-primary/10 flex-1">
                          <Download className="h-4 w-4 mr-2" /> Download Certificate
                        </Button>
                        <Button onClick={downloadInvoice} variant="outline" className="border-primary/40 text-primary hover:bg-primary/10 flex-1">
                          <FileText className="h-4 w-4 mr-2" /> Download Invoice
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Documents for existing live video */}
          {allVideos.length > 0 && !showNewUpload && liveVideos.length > 0 && paymentDone && (
            <div className="bg-card border border-border rounded-xl p-6">
              <div className="flex items-center gap-3 mb-4">
                <Award className="h-5 w-5 text-primary" />
                <h2 className="font-display text-xl text-foreground">DOCUMENTS</h2>
              </div>
              <div className="flex flex-col sm:flex-row gap-3">
                <Button onClick={downloadCertificate} variant="outline" className="border-primary/40 text-primary hover:bg-primary/10 flex-1">
                  <Download className="h-4 w-4 mr-2" /> Download Certificate
                </Button>
                <Button onClick={downloadInvoice} variant="outline" className="border-primary/40 text-primary hover:bg-primary/10 flex-1">
                  <FileText className="h-4 w-4 mr-2" /> Download Invoice
                </Button>
              </div>
            </div>
          )}

          {allVideos.length === 0 && !videoFile && (
            <div className="text-center py-8 text-muted-foreground">
              <Video className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p className="text-sm">No videos yet. Select a file above to get started.</p>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
};

export default PlayerUpload;
