import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import SettingsShell from "@/components/settings/SettingsShell";
import { Loader2, Check } from "lucide-react";
import { useLanguage } from "@/i18n/LanguageProvider";

const LANGS = [
  { code: "en", label: "English" },
  { code: "bn", label: "বাংলা (Bengali)" },
];

const LanguagePage = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const { lang, setLang } = useLanguage();
  const [current, setCurrent] = useState<string>(lang);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase
        .from("privacy_settings")
        .select("language")
        .eq("user_id", user.id)
        .maybeSingle();
      if (data?.language === "en" || data?.language === "bn") setCurrent(data.language);
      setLoading(false);
    })();
  }, [user]);

  const pick = async (code: string) => {
    if (!user) return;
    setCurrent(code);
    // Switch straight away; the saved setting follows the account to other devices.
    if (code === "en" || code === "bn") setLang(code);
    const { error } = await supabase
      .from("privacy_settings")
      .upsert({ user_id: user.id, language: code }, { onConflict: "user_id" });
    if (error)
      toast({ title: "Could not save", description: error.message, variant: "destructive" });
    else {
      toast({ title: code === "bn" ? "ভাষা বদলানো হয়েছে" : "Language updated" });
    }
  };

  if (loading) {
    return (
      <SettingsShell title="Language and translations">
        <div className="grid place-items-center py-16 text-muted-foreground">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      </SettingsShell>
    );
  }

  return (
    <SettingsShell title="Language and translations">
      <div className="divide-y divide-border ios-group" role="radiogroup" aria-label="Language">
        {LANGS.map((l) => (
          <button
            key={l.code}
            type="button"
            role="radio"
            aria-checked={current === l.code}
            onClick={() => pick(l.code)}
            className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-card"
          >
            <span className="flex-1 text-[15px] font-medium">{l.label}</span>
            {current === l.code && (
              <Check className="h-5 w-5 text-primary" strokeWidth={2.5} />
            )}
          </button>
        ))}
      </div>
    </SettingsShell>
  );
};

export default LanguagePage;
