import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import SettingsShell from "@/components/settings/SettingsShell";
import { SettingsSection, SettingsChoice } from "@/components/settings/SettingsControls";
import { Loader2 } from "lucide-react";
import { SPORTS, SPORT_LABEL, POSITIONS, isSport } from "@/lib/taxonomy";

type Sport = (typeof SPORTS)[number] | "any";

type Prefs = { preferred_sport: Sport; preferred_positions: string[] };

const ScoutPreferencesPage = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [prefs, setPrefs] = useState<Prefs | null>(null);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase
        .from("scout_profiles")
        .select("preferred_sport, preferred_positions")
        .eq("user_id", user.id)
        .maybeSingle();
      setPrefs({
        preferred_sport: ((data as any)?.preferred_sport as Sport) ?? "any",
        preferred_positions: ((data as any)?.preferred_positions as string[]) ?? [],
      });
    })();
  }, [user]);

  const save = async (patch: Partial<Prefs>) => {
    if (!user || !prefs) return;
    const next = { ...prefs, ...patch };
    setPrefs(next);
    const { error } = await supabase
      .from("scout_profiles")
      .update({
        preferred_sport: next.preferred_sport === "any" ? null : next.preferred_sport,
        preferred_positions: next.preferred_positions,
      } as any)
      .eq("user_id", user.id);
    if (error) toast({ title: "Could not save", description: error.message, variant: "destructive" });
  };

  const togglePos = (p: string) => {
    if (!prefs) return;
    const on = prefs.preferred_positions.some((x) => x.toLowerCase() === p.toLowerCase());
    save({
      preferred_positions: on
        ? prefs.preferred_positions.filter((x) => x.toLowerCase() !== p.toLowerCase())
        : [...prefs.preferred_positions, p].slice(0, 10),
    });
  };

  if (!prefs) {
    return (
      <SettingsShell title="Scouting preferences">
        <div className="grid place-items-center py-16 text-muted-foreground">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      </SettingsShell>
    );
  }

  return (
    <SettingsShell
      title="Scouting preferences"
      description="Boost the players that fit what you're looking for"
    >
      <SettingsSection label="Preferred sport">
        <SettingsChoice<Sport>
          value={prefs.preferred_sport}
          onChange={(v) => save({ preferred_sport: v })}
          options={[
            { value: "any", title: "Any sport" },
            ...SPORTS.map((s) => ({ value: s, title: SPORT_LABEL[s] })),
          ]}
        />
      </SettingsSection>

      <SettingsSection label="Positions you want to boost" footer="Matching highlights move up your Explore feed.">
        <div className="flex flex-wrap gap-2 px-4 py-3">
          {(isSport(prefs.preferred_sport) ? POSITIONS[prefs.preferred_sport] : SPORTS.flatMap((s) => POSITIONS[s])).map((p) => {
            const on = prefs.preferred_positions.some((x) => x.toLowerCase() === p.toLowerCase());
            return (
              <button key={p} type="button" aria-pressed={on} onClick={() => togglePos(p)}
                className={`press rounded-full px-3.5 py-1.5 text-[15px] ${on ? "bg-primary text-primary-foreground" : "bg-secondary text-foreground"}`}>
                {p}
              </button>
            );
          })}
        </div>
      </SettingsSection>
    </SettingsShell>
  );
};

export default ScoutPreferencesPage;
