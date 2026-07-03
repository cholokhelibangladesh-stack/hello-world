import { useState, useEffect, useRef } from "react";
import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Send, CheckCheck, Check, AlertTriangle, Search, Filter, MessageSquare, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { safeMediaUrl } from "@/lib/sanitize";

interface Message {
  id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  flagged: boolean;
  flag_reason: string | null;
  created_at: string;
  sender_name?: string;
  receiver_name?: string;
  sender_avatar?: string;
}

interface ChatUser {
  id: string;
  name: string;
  avatar?: string;
  lastMessage?: string;
  unread?: number;
  role?: string;
}

interface Props {
  adminView?: boolean;
  peerId?: string;
  peerName?: string;
}

const ChatInterface = React.forwardRef<HTMLDivElement, Props>(({ adminView = false, peerId, peerName }, _ref) => {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [chatUsers, setChatUsers] = useState<ChatUser[]>([]);
  const [selectedUser, setSelectedUser] = useState<ChatUser | null>(null);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "flagged">("all");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => { scrollToBottom(); }, [messages]);

  const fetchMessages = async (withUserId?: string) => {
    if (!user) return;
    const targetId = withUserId || peerId;
    if (!targetId && !adminView) return;

    let query = supabase.from("messages").select("*").order("created_at", { ascending: true });
    if (adminView && !withUserId) {
      query = query.limit(200);
    } else if (targetId) {
      query = query.or(`and(sender_id.eq.${user.id},receiver_id.eq.${targetId}),and(sender_id.eq.${targetId},receiver_id.eq.${user.id})`);
    }

    const { data } = await query;
    const msgs = data || [];

    // Fetch profile names
    const userIds = [...new Set(msgs.flatMap((m: any) => [m.sender_id, m.receiver_id]))];
    let profileMap = new Map<string, { name: string; avatar?: string }>();
    if (userIds.length > 0) {
      const { data: profiles } = await supabase.from("profiles").select("user_id, full_name, avatar_url").in("user_id", userIds);
      (profiles || []).forEach((p) => profileMap.set(p.user_id, { name: p.full_name, avatar: p.avatar_url || undefined }));
    }

    setMessages(msgs.map((m: any) => ({
      ...m,
      sender_name: profileMap.get(m.sender_id)?.name || "Unknown",
      receiver_name: profileMap.get(m.receiver_id)?.name || "Unknown",
      sender_avatar: profileMap.get(m.sender_id)?.avatar,
    })));

    // Build chat users list for admin
    if (adminView) {
      const userMap = new Map<string, ChatUser>();
      msgs.forEach((m: any) => {
        [m.sender_id, m.receiver_id].forEach((uid) => {
          if (!userMap.has(uid)) {
            const p = profileMap.get(uid);
            userMap.set(uid, { id: uid, name: p?.name || "Unknown", avatar: p?.avatar });
          }
        });
      });
      setChatUsers(Array.from(userMap.values()));
    }
  };

  useEffect(() => {
    fetchMessages(selectedUser?.id);

    if (!user) return;
    const channel = supabase
      .channel("chat-realtime")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages" }, () => {
        fetchMessages(selectedUser?.id);
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user, selectedUser?.id, peerId]);

  const sendMessage = async () => {
    const targetId = selectedUser?.id || peerId;
    if (!newMessage.trim() || !user || !targetId) return;
    setSending(true);
    const { error } = await supabase.from("messages").insert({
      sender_id: user.id,
      receiver_id: targetId,
      content: newMessage.trim(),
    } as any);
    if (!error) {
      setNewMessage("");
    }
    setSending(false);
  };

  const toggleFlag = async (msgId: string, flagged: boolean) => {
    await supabase.from("messages").update({
      flagged: !flagged,
      flag_reason: !flagged ? "Flagged by admin for review" : null,
    } as any).eq("id", msgId);
    fetchMessages(selectedUser?.id);
  };

  const filteredMessages = messages.filter((m) => {
    if (filter === "flagged") return m.flagged;
    if (search) return m.content.toLowerCase().includes(search.toLowerCase()) || m.sender_name?.toLowerCase().includes(search.toLowerCase());
    return true;
  });

  const filteredUsers = chatUsers.filter((u) =>
    !search || u.name.toLowerCase().includes(search.toLowerCase())
  );

  const formatTime = (ts: string) => {
    const d = new Date(ts);
    const now = new Date();
    const isToday = d.toDateString() === now.toDateString();
    return isToday
      ? d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
      : d.toLocaleDateString([], { month: "short", day: "numeric" });
  };

  // Admin conversation view
  if (adminView) {
    return (
      <div className="flex h-[600px] bg-card border border-border rounded-2xl overflow-hidden">
        {/* Sidebar */}
        <div className="w-72 border-r border-border flex flex-col">
          <div className="p-3 border-b border-border">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input placeholder="Search conversations..." className="pl-8 h-8 text-xs bg-secondary border-border rounded-lg" value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            <div className="flex gap-1.5 mt-2">
              {(["all", "flagged"] as const).map((f) => (
                <button key={f} onClick={() => setFilter(f)}
                  className={`text-[10px] px-2 py-0.5 rounded-full border transition-colors capitalize ${filter === f ? "border-primary text-primary bg-primary/10" : "border-border text-muted-foreground"}`}>
                  {f === "flagged" && <AlertTriangle className="h-2.5 w-2.5 inline mr-0.5" />}{f}
                </button>
              ))}
            </div>
          </div>
          <div className="overflow-y-auto flex-1">
            {filteredUsers.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-8">No conversations</p>
            ) : (
              filteredUsers.map((u) => (
                <button key={u.id} onClick={() => setSelectedUser(u)}
                  className={`w-full flex items-center gap-2.5 p-3 hover:bg-secondary/50 transition-colors text-left border-b border-border/50 ${selectedUser?.id === u.id ? "bg-primary/5 border-l-2 border-l-primary" : ""}`}>
                  <div className="w-8 h-8 rounded-full bg-secondary border border-border flex items-center justify-center shrink-0 overflow-hidden">
                    {u.avatar ? <img src={safeMediaUrl(u.avatar)} alt="" loading="lazy" decoding="async" className="w-full h-full object-cover" /> : <User className="h-4 w-4 text-muted-foreground" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-foreground truncate">{u.name}</p>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Messages area */}
        <div className="flex-1 flex flex-col">
          {selectedUser ? (
            <>
              <div className="p-3 border-b border-border flex items-center gap-2.5 bg-card/50">
                <div className="w-8 h-8 rounded-full bg-secondary border border-border flex items-center justify-center overflow-hidden">
                  {selectedUser.avatar ? <img src={safeMediaUrl(selectedUser.avatar)} alt="" loading="lazy" decoding="async" className="w-full h-full object-cover" /> : <User className="h-4 w-4 text-muted-foreground" />}
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">{selectedUser.name}</p>
                  <p className="text-[10px] text-muted-foreground">Conversation log</p>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                <AnimatePresence initial={false}>
                  {filteredMessages
                    .filter((m) => m.sender_id === selectedUser.id || m.receiver_id === selectedUser.id)
                    .map((m) => (
                    <motion.div key={m.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                      className={`flex gap-2 ${m.flagged ? "bg-accent/5 rounded-xl p-1.5 border border-accent/20" : ""}`}>
                      <div className="w-6 h-6 rounded-full bg-secondary border border-border flex items-center justify-center shrink-0 mt-0.5 overflow-hidden">
                        {m.sender_avatar ? <img src={safeMediaUrl(m.sender_avatar)} alt="" loading="lazy" decoding="async" className="w-full h-full object-cover" /> : <User className="h-3 w-3 text-muted-foreground" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 mb-0.5">
                          <span className="text-[11px] font-semibold text-foreground">{m.sender_name}</span>
                          <span className="text-[10px] text-muted-foreground">{formatTime(m.created_at)}</span>
                          {m.flagged && <Badge className="text-[9px] h-4 bg-accent/20 text-accent border-accent/30 rounded-full px-1.5">Flagged</Badge>}
                        </div>
                        <div className="flex items-start gap-2">
                          <p className="text-xs text-foreground/80 bg-secondary rounded-lg px-2.5 py-1.5 inline-block max-w-xs">{m.content}</p>
                          <button onClick={() => toggleFlag(m.id, m.flagged)}
                            className={`text-[10px] px-1.5 py-0.5 rounded border transition-colors shrink-0 mt-0.5 ${m.flagged ? "border-primary/30 text-primary" : "border-accent/30 text-accent"}`}>
                            {m.flagged ? "Unflag" : "Flag"}
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
                <div ref={messagesEndRef} />
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center gap-3 text-muted-foreground">
              <MessageSquare className="h-10 w-10 opacity-30" />
              <p className="text-sm">Select a conversation to view</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Scout/Player chat view
  return (
    <div className="flex flex-col h-[500px] bg-card border border-border rounded-2xl overflow-hidden">
      {(peerId || selectedUser) && (
        <div className="p-3 border-b border-border flex items-center gap-2.5 bg-card/50">
          <div className="w-8 h-8 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center">
            <User className="h-4 w-4 text-primary" />
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">{peerName || selectedUser?.name}</p>
            <div className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
              <p className="text-[10px] text-primary">Online</p>
            </div>
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {filteredMessages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-muted-foreground">
            <MessageSquare className="h-10 w-10 opacity-30" />
            <p className="text-sm">No messages yet. Start the conversation!</p>
          </div>
        ) : (
          <AnimatePresence initial={false}>
            {filteredMessages.map((m) => {
              const isOwn = m.sender_id === user?.id;
              return (
                <motion.div key={m.id} initial={{ opacity: 0, y: 8, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ duration: 0.2 }}
                  className={`flex gap-2 ${isOwn ? "flex-row-reverse" : ""}`}>
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 mt-auto overflow-hidden border ${isOwn ? "bg-primary/20 border-primary/30" : "bg-secondary border-border"}`}>
                    {m.sender_avatar ? <img src={safeMediaUrl(m.sender_avatar)} alt="" loading="lazy" decoding="async" className="w-full h-full object-cover" /> : <User className={`h-3.5 w-3.5 ${isOwn ? "text-primary" : "text-muted-foreground"}`} />}
                  </div>
                  <div className={`max-w-[70%] flex flex-col gap-0.5 ${isOwn ? "items-end" : "items-start"}`}>
                    {!isOwn && <span className="text-[10px] text-muted-foreground px-1">{m.sender_name}</span>}
                    <div className={`px-3 py-2 rounded-2xl text-sm leading-relaxed ${isOwn
                      ? "bg-primary text-primary-foreground rounded-br-sm"
                      : "bg-secondary text-foreground rounded-bl-sm border border-border"
                    }`}>
                      {m.content}
                    </div>
                    <div className={`flex items-center gap-1 px-1 ${isOwn ? "flex-row-reverse" : ""}`}>
                      <span className="text-[10px] text-muted-foreground">{formatTime(m.created_at)}</span>
                      {isOwn && <CheckCheck className="h-3 w-3 text-primary/60" />}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        )}
        <div ref={messagesEndRef} />
      </div>

      {(peerId || selectedUser) && (
        <div className="p-3 border-t border-border">
          <div className="flex gap-2">
            <Input
              placeholder="Type a message..."
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && sendMessage()}
              className="bg-secondary border-border rounded-full text-sm"
            />
            <Button onClick={sendMessage} disabled={sending || !newMessage.trim()} size="icon"
              className="bg-primary text-primary-foreground rounded-full shrink-0 hover:bg-primary/90">
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
});

ChatInterface.displayName = "ChatInterface";

export default ChatInterface;
