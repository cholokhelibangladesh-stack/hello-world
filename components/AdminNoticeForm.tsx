import { useState } from "react";
import { Send, Loader2, Users, User, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { motion, AnimatePresence } from "framer-motion";

type Audience = "all" | "players" | "scouts" | "selective";

const AdminNoticeForm = () => {
  const { toast } = useToast();
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [audience, setAudience] = useState<Audience>("all");
  const [searchEmail, setSearchEmail] = useState("");
  const [selectedUsers, setSelectedUsers] = useState<{ user_id: string; full_name: string; role: string }[]>([]);
  const [searchResults, setSearchResults] = useState<{ user_id: string; full_name: string; role: string }[]>([]);
  const [searching, setSearching] = useState(false);

  const handleUserSearch = async (query: string) => {
    setSearchEmail(query);
    if (query.length < 2) { setSearchResults([]); return; }
    setSearching(true);
    try {
      // Get profiles matching name
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, full_name")
        .ilike("full_name", `%${query}%`)
        .limit(10);

      if (profiles && profiles.length > 0) {
        const userIds = profiles.map((p) => p.user_id);
        const { data: roles } = await supabase.from("user_roles").select("user_id, role").in("user_id", userIds);
        const roleMap = new Map((roles || []).map((r) => [r.user_id, r.role]));
        setSearchResults(profiles.map((p) => ({
          user_id: p.user_id,
          full_name: p.full_name,
          role: roleMap.get(p.user_id) || "unknown",
        })));
      } else {
        setSearchResults([]);
      }
    } finally {
      setSearching(false);
    }
  };

  const addUser = (u: { user_id: string; full_name: string; role: string }) => {
    if (!selectedUsers.find((s) => s.user_id === u.user_id)) {
      setSelectedUsers((prev) => [...prev, u]);
    }
    setSearchEmail("");
    setSearchResults([]);
  };

  const removeUser = (uid: string) => setSelectedUsers((prev) => prev.filter((u) => u.user_id !== uid));

  const handleSend = async () => {
    if (!title.trim() || !message.trim()) return;
    setSending(true);

    try {
      let userIds: string[] = [];

      if (audience === "selective") {
        userIds = selectedUsers.map((u) => u.user_id);
        if (userIds.length === 0) {
          toast({ title: "No users selected", description: "Add at least one user for selective notices.", variant: "destructive" });
          setSending(false);
          return;
        }
      } else {
        // Get roles
        let query = supabase.from("user_roles").select("user_id, role");
        const { data: roles } = await query;
        const allRoles = roles || [];

        if (audience === "all") {
          userIds = allRoles.map((r) => r.user_id);
        } else if (audience === "players") {
          userIds = allRoles.filter((r) => r.role === "player").map((r) => r.user_id);
        } else if (audience === "scouts") {
          userIds = allRoles.filter((r) => r.role === "scout").map((r) => r.user_id);
        }
      }

      if (userIds.length === 0) {
        toast({ title: "No users found" });
        setSending(false);
        return;
      }

      const notifications = userIds.map((uid) => ({
        user_id: uid,
        title,
        message,
        type: "admin_notice",
      }));

      const { error } = await supabase.from("notifications").insert(notifications as any);
      if (error) {
        toast({ title: "Error", description: error.message, variant: "destructive" });
      } else {
        const audienceLabel = audience === "all" ? "all users" : audience === "players" ? "all players" : audience === "scouts" ? "all scouts" : `${userIds.length} selected user(s)`;
        toast({ title: `Notice sent to ${audienceLabel}!` });
        setTitle("");
        setMessage("");
        setSelectedUsers([]);
        setAudience("all");
      }
    } finally {
      setSending(false);
    }
  };

  const audienceOptions: { value: Audience; label: string; desc: string }[] = [
    { value: "all", label: "All Users", desc: "Players, scouts & admins" },
    { value: "players", label: "Players Only", desc: "All registered players" },
    { value: "scouts", label: "Scouts Only", desc: "All verified scouts" },
    { value: "selective", label: "Selective", desc: "Pick specific users" },
  ];

  return (
    <div className="space-y-4">
      {/* Broadcast Card */}
      <div className="bg-card border border-border rounded-2xl p-6 space-y-5">
        <h3 className="font-display text-xl text-foreground">SEND NOTICE</h3>

        {/* Audience Selector */}
        <div>
          <Label className="text-xs text-muted-foreground uppercase tracking-wide mb-2 block">Send To</Label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {audienceOptions.map((opt) => (
              <motion.button
                key={opt.value}
                type="button"
                onClick={() => setAudience(opt.value)}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className={`p-3 rounded-xl border text-left transition-all ${
                  audience === opt.value
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border bg-secondary text-muted-foreground hover:border-primary/40"
                }`}
              >
                <p className="text-xs font-semibold">{opt.label}</p>
                <p className="text-[10px] mt-0.5 opacity-70">{opt.desc}</p>
              </motion.button>
            ))}
          </div>
        </div>

        {/* Selective user picker */}
        <AnimatePresence>
          {audience === "selective" && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden space-y-2"
            >
              <Label className="text-xs text-muted-foreground uppercase tracking-wide block">Search Users</Label>
              <div className="relative">
                <Input
                  placeholder="Type a name to search..."
                  value={searchEmail}
                  onChange={(e) => handleUserSearch(e.target.value)}
                  className="bg-secondary border-border rounded-xl text-sm"
                />
                {searching && <Loader2 className="absolute right-3 top-3 h-4 w-4 animate-spin text-muted-foreground" />}
                {searchResults.length > 0 && (
                  <div className="absolute top-full left-0 right-0 z-10 bg-card border border-border rounded-xl mt-1 overflow-hidden shadow-xl">
                    {searchResults.map((u) => (
                      <button
                        key={u.user_id}
                        onClick={() => addUser(u)}
                        className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-secondary transition-colors text-left"
                      >
                        <span className="text-sm text-foreground">{u.full_name}</span>
                        <Badge variant="outline" className="text-xs rounded-full capitalize">{u.role}</Badge>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              {selectedUsers.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {selectedUsers.map((u) => (
                    <Badge key={u.user_id} variant="outline" className="text-xs border-primary/30 text-primary rounded-full flex items-center gap-1.5 px-2 py-1">
                      <User className="h-3 w-3" /> {u.full_name}
                      <button onClick={() => removeUser(u.user_id)} className="ml-0.5 hover:text-destructive transition-colors">×</button>
                    </Badge>
                  ))}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        <div>
          <Label className="text-sm text-muted-foreground">Title</Label>
          <Input className="mt-1 bg-secondary border-border rounded-xl" placeholder="Notice title" value={title} onChange={(e) => setTitle(e.target.value)} />
        </div>
        <div>
          <Label className="text-sm text-muted-foreground">Message</Label>
          <Textarea className="mt-1 bg-secondary border-border resize-none rounded-xl" rows={3} placeholder="Write your notice..." value={message} onChange={(e) => setMessage(e.target.value)} />
        </div>
        <Button
          onClick={handleSend}
          disabled={sending || !title.trim() || !message.trim()}
          className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-full"
        >
          {sending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Send className="h-4 w-4 mr-2" />}
          {audience === "all" ? "Broadcast to All" : audience === "players" ? "Send to Players" : audience === "scouts" ? "Send to Scouts" : `Send to ${selectedUsers.length} User(s)`}
        </Button>
      </div>
    </div>
  );
};

export default AdminNoticeForm;
