import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Send } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { fetchConversations } from "./Inbox";

/** "Message" link to the approved conversation with this person. Renders nothing if there isn't one. */
const MessageButton = ({ otherId, className }: { otherId: string; className?: string }) => {
  const { user, role } = useAuth();
  const [id, setId] = useState<string | null>(null);
  useEffect(() => {
    if (!user || role === "admin") return;
    let alive = true;
    fetchConversations().then((c) => { if (alive) setId(c.find((x) => x.other_id === otherId && x.status === "open")?.id ?? null); });
    return () => { alive = false; };
  }, [user?.id, role, otherId]);
  if (!id) return null;
  return (
    <Link to="/messages/$id" params={{ id }}
      className={className ?? "press inline-flex h-8 items-center justify-center gap-1.5 rounded-full bg-secondary px-3 text-[13px] font-semibold"}>
      <Send className="h-4 w-4" /> Message
    </Link>
  );
};

export default MessageButton;
