import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { SETTINGS_GROUP_ORDER, filterCatalogForRole, type CatalogItem } from "@/components/settings/settingsCatalog";
import { SettingsGroup, SettingsRow } from "@/components/settings/SettingsRow";

const SettingsHub = () => {
  const { user, role } = useAuth();
  const [q, setQ] = useState("");
  const catalog = useMemo(() => filterCatalogForRole(role), [role]);
  const grouped = useMemo(() => {
    const term = q.trim().toLowerCase();
    const items = term
      ? catalog.filter((i) => `${i.label} ${i.keywords ?? ""} ${i.group}`.toLowerCase().includes(term))
      : catalog;
    const map = new Map<string, CatalogItem[]>(SETTINGS_GROUP_ORDER.map((g) => [g, []]));
    for (const i of items) map.get(i.group)?.push(i);
    return [...map.entries()].filter(([, arr]) => arr.length);
  }, [q, catalog]);

  return (
    <div className="min-h-full pb-10" style={{ paddingTop: "env(safe-area-inset-top)" }}>
      <div className="mx-auto w-full max-w-2xl px-4 pt-4">
        <h1 className="large-title">Settings</h1>
        <div className="relative mt-3">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
          <input
            type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search" aria-label="Search settings"
            className="h-10 w-full rounded-xl bg-secondary pl-10 pr-3 text-[16px] outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-ring"
          />
        </div>
        {grouped.map(([label, items]) => (
          <SettingsGroup key={label || "session"} label={label || undefined}>
            {items.map((i) => <SettingsRow key={i.id} icon={i.icon} label={i.label} to={i.to} tint={i.tint} />)}
          </SettingsGroup>
        ))}
        {grouped.length === 0 && <p className="mt-10 text-center text-muted-foreground">No settings match “{q}”.</p>}
        <p className="footnote pt-8 text-center">Signed in as {user?.email}</p>
      </div>
    </div>
  );
};

export default SettingsHub;
