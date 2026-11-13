import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import SettingsShell from "@/components/settings/SettingsShell";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Loader2, LifeBuoy } from "lucide-react";

const HelpPage = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);

  const send = async () => {
    if (!message.trim()) return;
    setSending(true);
    const { error } = await supabase.from("contact_messages").insert({
      name: user?.user_metadata?.full_name ?? user?.email ?? "Player",
      email: user?.email ?? "unknown@cholokheli.app",
      subject: subject || null,
      message,
    });
    setSending(false);
    if (error) {
      toast({ title: "Could not send", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Message sent", description: "We'll get back to you soon." });
      setSubject(""); setMessage("");
    }
  };

  return (
    <SettingsShell title="Help" description="Report a problem or ask a question">
      <div className="ios-group p-5">
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-[#7EC8FF]/20 to-[hsl(var(--teal-deep))]/20">
            <LifeBuoy className="h-5 w-5 text-primary" />
          </div>
          <div>
            <div className="text-[15px] font-semibold">Contact support</div>
            <p className="text-xs text-muted-foreground">Tell us what's going on and we'll help.</p>
          </div>
        </div>
        <div className="mt-4 space-y-3">
          <Input placeholder="Subject (optional)" value={subject} onChange={(e) => setSubject(e.target.value)} />
          <Textarea placeholder="Describe your issue…" rows={5} value={message} onChange={(e) => setMessage(e.target.value)} />
          <Button onClick={send} disabled={sending || !message.trim()} className="w-full">
            {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Send message"}
          </Button>
        </div>
      </div>
    </SettingsShell>
  );
};

export default HelpPage;
