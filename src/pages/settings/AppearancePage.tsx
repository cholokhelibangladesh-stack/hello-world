import SettingsShell from "@/components/settings/SettingsShell";
import { SettingsChoice, SettingsSection } from "@/components/settings/SettingsControls";
import { useTheme, type ThemeMode } from "@/hooks/useTheme";

const AppearancePage = () => {
  const { mode, setMode } = useTheme();
  return (
    <SettingsShell title="Appearance">
      <SettingsSection footer="Automatic follows your phone's light or dark setting.">
        <SettingsChoice<ThemeMode>
          value={mode}
          onChange={setMode}
          options={[
            { value: "system", title: "Automatic" },
            { value: "light", title: "Light" },
            { value: "dark", title: "Dark" },
          ]}
        />
      </SettingsSection>
    </SettingsShell>
  );
};
export default AppearancePage;
