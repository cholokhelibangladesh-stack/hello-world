import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Loader2, Paperclip, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

interface Props {
  trigger: React.ReactNode;
  onPosted?: () => void;
}

/** Admin composer for news_posts (title, body, tag, optional image/video). */
const PostNewsDialog = ({ trigger, onPosted }: Props) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [tag, setTag] = useState("News");
  const [file, setFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);

  const reset = () => {
    setTitle("");
    setBody("");
    setTag("News");
    setFile(null);
  };

  const submit = async () => {
    if (!title.trim() || !body.trim() || !user) return;
    setSaving(true);
    try {
      let mediaPath: string | null = null;
      let mediaType: "image" | "video" | null = null;
      if (file) {
        const ext = file.name.split(".").pop() || "bin";
        mediaType = file.type.startsWith("video/") ? "video" : "image";
        mediaPath = `news/${user.id}/${Date.now()}.${ext}`;
        const { error: upErr } = await supabase.storage
          .from("media")
          .upload(mediaPath, file, { contentType: file.type, upsert: false });
        if (upErr) throw upErr;
      }
      const { error } = await supabase.from("news_posts" as any).insert({
        title: title.trim(),
        body: body.trim(),
        tag: tag.trim() || null,
        media_url: mediaPath,
        media_type: mediaType,
        created_by: user.id,
      } as any);
      if (error) throw error;
      toast({ title: "News published" });
      reset();
      setOpen(false);
      onPosted?.();
    } catch (err: any) {
      toast({ title: "Failed to publish", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Post news</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label className="text-xs   text-muted-foreground">Tag</Label>
            <div className="flex gap-1.5 mt-1 flex-wrap">
              {["News", "Announcement", "Event", "Campaign"].map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTag(t)}
                  className={`text-[11px] px-3 py-1 rounded-full border ${
                    tag === t
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border text-muted-foreground"
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>
          <div>
            <Label className="text-xs   text-muted-foreground">Title</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={140} className="mt-1" />
          </div>
          <div>
            <Label className="text-xs   text-muted-foreground">Body</Label>
            <Textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={5}
              maxLength={2000}
              className="mt-1 resize-none"
            />
          </div>
          <div>
            <Label className="text-xs   text-muted-foreground">Attach media (optional)</Label>
            {file ? (
              <div className="mt-1 flex items-center gap-2 text-xs rounded-lg border border-border p-2">
                <Paperclip className="h-3.5 w-3.5" />
                <span className="truncate flex-1">{file.name}</span>
                <button type="button" onClick={() => setFile(null)} aria-label="Remove">
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ) : (
              <Input
                type="file"
                accept="image/*,video/*"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                className="mt-1"
              />
            )}
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={submit} disabled={saving || !title.trim() || !body.trim()}>
              {saving && <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />}
              Publish
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PostNewsDialog;
