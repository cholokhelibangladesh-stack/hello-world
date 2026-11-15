import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Send } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { fetchConversations } from "./Inbox";

/** "Message" link to the approved conversation with this person. Renders nothing if there isn't one. */
const MessageButton = ({ otherId, className, round }: { otherId: string; className?: string; round?: boolean }) => {
  const { user, role } = useAuth();
  const [id, setId] = useState<string | null>(null);
  useEffect(() => {
    if (!user || role === "admin") return;
    let alive = true;
    fetchConversations().then((c) => { if (alive) setId(c.find((x) => x.other_id === otherId && x.status === "open")?.id ?? null); });
    return () => { alive = false; };
  }, [user?.id, role, otherId]);
  if (!id) return null;
  if (round) {
    return (
      <Link to="/messages/$id" params={{ id }} aria-label="Message"
        className="press grid h-12 w-12 shrink-0 place-items-center rounded-full bg-white/10 text-white ring-1 ring-white/30 backdrop-blur-xl">
        <Send className="h-5 w-5" />
      </Link>
    );
  }
  return (
    <Link to="/messages/$id" params={{ id }}
      className={className ?? "press inline-flex h-8 items-center justify-center gap-1.5 rounded-full bg-secondary px-3 text-[13px] font-semibold"}>
      <Send className="h-4 w-4" /> Message
    </Link>
  );
};

export default MessageButton;
