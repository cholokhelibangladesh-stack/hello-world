import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import NewsPostsList from "@/components/NewsPostsList";
import PostNewsDialog from "@/components/PostNewsDialog";
import { useState } from "react";

/** Admin panel tab: manage news posts published to the home feed. */
const AdminNewsManager = () => {
  const [refreshKey, setRefreshKey] = useState(0);

  return (
    <div className="space-y-4">
      <div className="apple-glass glass-card rounded-2xl p-5 flex items-center justify-between">
        <div>
          <h2 className="font-display text-xl text-foreground">News and announcements</h2>
          <p className="text-xs text-muted-foreground mt-1">
            Publish news, events, or announcements — with an optional image or video — to
            everyone's home feed.
          </p>
        </div>
        <PostNewsDialog
          onPosted={() => setRefreshKey((k) => k + 1)}
          trigger={
            <Button className="rounded-full bg-primary text-primary-foreground hover:bg-primary/90 shrink-0">
              <Plus className="h-4 w-4 mr-1.5" /> New post
            </Button>
          }
        />
      </div>

      <NewsPostsList adminControls refreshKey={refreshKey} />
    </div>
  );
};

export default AdminNewsManager;
