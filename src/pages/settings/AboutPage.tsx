import { ShieldCheck, FileText, LifeBuoy, Receipt, Cookie, Trash2, Award } from "lucide-react";
import SettingsShell from "@/components/settings/SettingsShell";
import { SettingsGroup, SettingsRow } from "@/components/settings/SettingsRow";
import CholoKheliMark from "@/components/CholoKheliMark";
import { BusinessDetails } from "@/pages/legal/LegalPage";

const AboutPage = () => (
  <SettingsShell title="About">
    <div className="ios-group flex flex-col items-center px-6 py-6 text-center">
      <CholoKheliMark className="h-10 w-14" />
      <p className="headline mt-3">Cholo Kheli</p>
      <p className="footnote mt-1">Grassroots scouting for Bangladesh</p>
      <p className="footnote mt-3">Version {import.meta.env.VITE_APP_VERSION ?? "1.0.0"}</p>
      <BusinessDetails className="mt-4" />
    </div>
    <SettingsGroup>
      <SettingsRow icon={ShieldCheck} label="Safe scouting" to="/safe-scouting" />
      <SettingsRow icon={LifeBuoy} label="FAQ and contact" to="/faq" />
    </SettingsGroup>
    <SettingsGroup>
      <SettingsRow icon={FileText} label="Terms of Service" to="/terms" />
      <SettingsRow icon={FileText} label="Privacy Policy" to="/privacy-policy" />
      <SettingsRow icon={Receipt} label="Refund Policy" to="/refund-policy" />
      <SettingsRow icon={Cookie} label="Cookie Policy" to="/cookie-policy" />
      <SettingsRow icon={Trash2} label="Delete your data" to="/delete-data" />
      <SettingsRow icon={Award} label="Credits and licences" to="/licences" />
    </SettingsGroup>
  </SettingsShell>
);
export default AboutPage;
