import { useEffect, useState } from "react";
import { Newspaper, Megaphone, Calendar, Trophy, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { uniqueChannel } from "@/lib/realtime";

export type NewsPost = {
  id: string;
  title: string;
  body: string;
  tag: string | null;
  media_url: string | null;
  media_type: "image" | "video" | null;
  created_at: string;
};

const tagIcon = (tag: string | null) => {
  const t = (tag || "").toLowerCase();
  if (t.includes("event")) return Calendar;
  if (t.includes("campaign")) return Trophy;
  if (t.includes("announce")) return Megaphone;
  return Newspaper;
};

async function signMedia(url: string | null): Promise<string | null> {
  if (!url) return null;
  // If already a full URL, return as-is; otherwise treat as path within "media" bucket
  if (/^https?:\/\//.test(url)) return url;
  const { data } = await supabase.storage.from("media").createSignedUrl(url, 60 * 60);
  return data?.signedUrl ?? null;
}

interface Props {
  /** If true, show a small "Delete" button on each row (admin home). */
  adminControls?: boolean;
  /** Refresh trigger (bumped after posting) */
  refreshKey?: number;
  /** Rendered when there are no published posts. */
  empty?: React.ReactNode;
}

const NewsPostsList = ({ adminControls, refreshKey, empty }: Props) => {
  const [posts, setPosts] = useState<(NewsPost & { resolved_media: string | null })[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("news_posts" as any)
      .select("id, title, body, tag, media_url, media_type, created_at")
      .eq("is_published", true)
      .order("created_at", { ascending: false })
      .limit(30);
    const rows = ((data as unknown) as NewsPost[]) || [];
    const withMedia = await Promise.all(
      rows.map(async (p) => ({ ...p, resolved_media: await signMedia(p.media_url) })),
    );
    setPosts(withMedia);
    setLoading(false);
  };

  useEffect(() => {
    load();
    // subscribe to news_posts changes so home stays fresh
    const ch = supabase
      .channel(uniqueChannel("news_posts_home"))
      .on("postgres_changes", { event: "*", schema: "public", table: "news_posts" }, () => load())
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshKey]);

  const remove = async (id: string) => {
    if (!confirm("Delete this news post?")) return;
    const { error } = await supabase.from("news_posts" as any).delete().eq("id", id);
    if (error) toast({ title: "Delete failed", description: error.message, variant: "destructive" });
    else {
      toast({ title: "News post deleted" });
      load();
    }
  };

  if (loading && posts.length === 0) return null;
  if (posts.length === 0) return <>{empty ?? null}</>;

  return (
    <div className="space-y-3">
      {posts.map((item) => {
        const Icon = tagIcon(item.tag);
        return (
          <article key={item.id} className="ios-group">
            {item.resolved_media && item.media_type === "image" && (
              <img src={item.resolved_media} alt="" className="max-h-72 w-full object-cover" loading="lazy" />
            )}
            {item.resolved_media && item.media_type === "video" && (
              <video src={item.resolved_media} controls playsInline className="max-h-72 w-full bg-black object-cover" />
            )}
            <div className="p-4">
              <div className="mb-1.5 flex items-center gap-2 text-[13px] text-muted-foreground">
                <Icon className="h-4 w-4 text-primary" strokeWidth={2} aria-hidden="true" />
                {item.tag && <span className="font-medium text-primary">{item.tag}</span>}
                <time dateTime={item.created_at} className="ml-auto">
                  {new Date(item.created_at).toLocaleDateString([], { day: "numeric", month: "short" })}
                </time>
                {adminControls && (
                  <button onClick={() => remove(item.id)} className="-mr-1 grid h-8 w-8 place-items-center rounded-full text-destructive" aria-label={`Delete “${item.title}”`}>
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
              <h3 className="headline">{item.title}</h3>
              <p className="mt-1 whitespace-pre-wrap text-[15px] leading-relaxed text-muted-foreground">{item.body}</p>
            </div>
          </article>
        );
      })}
    </div>
  );
};

export default NewsPostsList;
