import { useState, useEffect, useRef } from "react";
import { Bell, Award, Star, Info, FileText, X, Flag, CheckCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import ReactDOM from "react-dom";

interface Notification {
  id: string;
  title: string;
  message: string;
  type: string;
  read: boolean;
  metadata: any;
  created_at: string;
}

const typeIcons: Record<string, any> = {
  info: Info,
  certificate: Award,
  feedback: Star,
  selection: Star,
  admin_notice: FileText,
  flag: Flag,
};

const typeColors: Record<string, string> = {
  certificate: "text-foreground",
  selection: "text-foreground",
  feedback: "text-foreground",
  admin_notice: "text-muted-foreground",
  flag: "text-destructive",
  info: "text-muted-foreground",
};

const NotificationBell = () => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [open, setOpen] = useState(false);
  const bellRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [dropdownStyle, setDropdownStyle] = useState<React.CSSProperties>({});

  const fetchNotifications = async () => {
    if (!user) return;
    const { data, error } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(30);
    if (!error && data) setNotifications(data as Notification[]);
  };

  useEffect(() => {
    if (!user) return;
    fetchNotifications();

    const channel = supabase
      .channel(`notifications-${user.id}`)
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "notifications",
        filter: `user_id=eq.${user.id}`,
      }, (payload) => {
        setNotifications((prev) => [payload.new as Notification, ...prev]);
      })
      .on("postgres_changes", {
        event: "UPDATE",
        schema: "public",
        table: "notifications",
        filter: `user_id=eq.${user.id}`,
      }, (payload) => {
        setNotifications((prev) => prev.map((n) => n.id === payload.new.id ? payload.new as Notification : n));
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user?.id]);

  // Calculate dropdown position — fixed to viewport, always on-screen
  useEffect(() => {
    if (open && bellRef.current) {
      const rect = bellRef.current.getBoundingClientRect();
      const dropdownWidth = Math.min(384, window.innerWidth - 16);

      // Align right edge with bell, but never let left edge go off-screen
      let rightEdgeFromViewportRight = window.innerWidth - rect.right;
      const leftEdge = rect.right - dropdownWidth;
      if (leftEdge < 8) {
        rightEdgeFromViewportRight = window.innerWidth - dropdownWidth - 8;
      }

      setDropdownStyle({
        position: "fixed",
        top: rect.bottom + 8,
        right: Math.max(8, rightEdgeFromViewportRight),
        width: dropdownWidth,
        maxWidth: "calc(100vw - 16px)",
        zIndex: 9999,
      });
    }
  }, [open]);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        bellRef.current && !bellRef.current.contains(target) &&
        dropdownRef.current && !dropdownRef.current.contains(target)
      ) {
        setOpen(false);
      }
    };
    if (open) document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const markRead = async (id: string) => {
    await supabase.from("notifications").update({ read: true } as any).eq("id", id);
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
  };

  const markAllRead = async () => {
    if (!user) return;
    const unreadIds = notifications.filter((n) => !n.read).map((n) => n.id);
    if (unreadIds.length === 0) return;
    await supabase.from("notifications").update({ read: true } as any).in("id", unreadIds);
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  if (!user) return null;

  const dropdown = open ? ReactDOM.createPortal(
    <div
      ref={dropdownRef}
      style={dropdownStyle}
      className="bg-card border border-border rounded-2xl shadow-2xl max-h-[75vh] overflow-hidden flex flex-col"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border shrink-0">
        <div className="flex items-center gap-2">
          <Bell className="h-4 w-4 text-foreground" />
          <h3 className="font-display text-base text-foreground">NOTIFICATIONS</h3>
          {unreadCount > 0 && (
            <span className="text-xs bg-foreground/15 text-foreground rounded-full px-2 py-0.5 font-semibold">
              {unreadCount} new
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          {unreadCount > 0 && (
            <Button size="sm" variant="ghost" onClick={markAllRead} className="text-xs h-7 px-2 gap-1">
              <CheckCheck className="h-3 w-3" /> All read
            </Button>
          )}
          <button onClick={() => setOpen(false)} className="p-1 rounded hover:bg-secondary transition-colors">
            <X className="h-4 w-4 text-muted-foreground" />
          </button>
        </div>
      </div>

      {/* List */}
      <div className="overflow-y-auto flex-1 divide-y divide-border">
        {notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 gap-3">
            <Bell className="h-8 w-8 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">No notifications yet</p>
          </div>
        ) : (
          notifications.map((n) => {
            const Icon = typeIcons[n.type] || Info;
            const iconColor = typeColors[n.type] || "text-muted-foreground";
            return (
              <div
                key={n.id}
                onClick={() => !n.read && markRead(n.id)}
                className={`p-4 hover:bg-secondary/50 cursor-pointer transition-colors ${!n.read ? "bg-foreground/5" : ""}`}
              >
                <div className="flex items-start gap-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${!n.read ? "bg-foreground/10" : "bg-secondary"}`}>
                    <Icon className={`h-4 w-4 ${!n.read ? iconColor : "text-muted-foreground"}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-medium leading-tight ${!n.read ? "text-foreground" : "text-muted-foreground"}`}>
                      {n.title}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed line-clamp-2">{n.message}</p>
                    <p className="text-[10px] text-muted-foreground/60 mt-1">
                      {new Date(n.created_at).toLocaleString()}
                    </p>
                  </div>
                  {!n.read && <div className="w-2 h-2 rounded-full bg-foreground shrink-0 mt-2" />}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>,
    document.body
  ) : null;

  return (
    <div ref={bellRef} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="relative p-2 rounded-lg hover:bg-secondary transition-colors"
        aria-label="Notifications"
      >
        <Bell className="h-5 w-5 text-muted-foreground" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] rounded-full bg-foreground text-background text-[10px] font-bold flex items-center justify-center px-1 pointer-events-none">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>
      {dropdown}
    </div>
  );
};

export default NotificationBell;
