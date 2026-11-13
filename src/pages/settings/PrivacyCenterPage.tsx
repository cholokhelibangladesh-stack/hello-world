import { useState } from "react";
import { toast } from "sonner";
import { Download, FileText, Lock, UserX } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import SettingsShell from "@/components/settings/SettingsShell";
import { SettingsGroup, SettingsRow } from "@/components/settings/SettingsRow";

/** What Cholo Kheli keeps, who can see it, and the user's data rights. */
const PrivacyCenterPage = () => {
  const { user, role } = useAuth();
  const [requested, setRequested] = useState(false);

  const requestCopy = async () => {
    if (!user) return;
    const { error } = await supabase.from("contact_messages").insert({
      name: (user.user_metadata?.full_name as string | undefined)?.slice(0, 100) ?? "Cholo Kheli user",
      email: user.email ?? "",
      subject: "Data download request",
      message: `Please send a copy of my account data. Account id: ${user.id}`,
    });
    if (error) { toast.error("Couldn't send your request", { description: "Try again in a little while." }); return; }
    setRequested(true);
    toast.success("Request sent", { description: "We'll email a copy of your data to you." });
  };

  return (
    <SettingsShell title="Your data">
      <div className="ios-group space-y-3 p-4 text-[15px] leading-relaxed">
        <p><span className="font-semibold">Public to verified scouts and players:</span> your name, username, sport, positions, bio, photo and live videos (unless your account is private).</p>
        <p><span className="font-semibold">Only you and admins:</span> phone number, date of birth, guardian details and any ID documents you upload.</p>
        <p className="text-muted-foreground">Scouts never contact players directly. Every request goes through a Cholo Kheli admin.</p>
      </div>
      <SettingsGroup>
        {role === "player" && <SettingsRow icon={Lock} label="Private account" to="/player/settings/privacy" />}
        <SettingsRow icon={Download} label={requested ? "Copy requested" : "Request a copy of your data"} onClick={requested ? undefined : requestCopy} />
        <SettingsRow icon={FileText} label="Privacy Policy" to="/privacy-policy" />
        {role !== "admin" && <SettingsRow icon={UserX} label="Delete account" to="/player/settings/delete-account" tint="destructive" />}
      </SettingsGroup>
    </SettingsShell>
  );
};
export default PrivacyCenterPage;
