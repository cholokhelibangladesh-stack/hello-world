import { ShieldCheck, FileText, LifeBuoy } from "lucide-react";
import SettingsShell from "@/components/settings/SettingsShell";
import { SettingsGroup, SettingsRow } from "@/components/settings/SettingsRow";
import CholoKheliMark from "@/components/CholoKheliMark";

const AboutPage = () => (
  <SettingsShell title="About">
    <div className="ios-group flex flex-col items-center px-6 py-6 text-center">
      <CholoKheliMark className="h-10 w-14" />
      <p className="headline mt-3">Cholo Kheli</p>
      <p className="footnote mt-1">Grassroots scouting for Bangladesh</p>
      <p className="footnote mt-3">Version {import.meta.env.VITE_APP_VERSION ?? "1.0.0"}</p>
    </div>
    <SettingsGroup>
      <SettingsRow icon={ShieldCheck} label="Safe scouting" to="/safe-scouting" />
      <SettingsRow icon={FileText} label="Privacy Policy" to="/privacy-policy" />
      <SettingsRow icon={LifeBuoy} label="FAQ and contact" to="/faq" />
    </SettingsGroup>
  </SettingsShell>
);
export default AboutPage;
