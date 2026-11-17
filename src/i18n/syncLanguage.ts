import { supabase } from "@/integrations/supabase/client";
import { STORAGE_KEY, storeLanguage } from "./LanguageProvider";

/**
 * Keeps the language with the account. A choice made on this device (on the welcome or sign-up screen, or in
 * Settings) is the latest one, so it is saved to the account. A device with no choice yet, such as a new phone,
 * takes the language saved on the account.
 */
export const syncLanguage = async (userId: string) => {
  try {
    let local: string | null = null;
    try { local = window.localStorage.getItem(STORAGE_KEY); } catch { /* storage off */ }
    if (local === "en" || local === "bn") {
      await supabase.from("privacy_settings").upsert({ user_id: userId, language: local }, { onConflict: "user_id" });
      return;
    }
    const { data } = await supabase.from("privacy_settings").select("language").eq("user_id", userId).maybeSingle();
    if (data?.language === "en" || data?.language === "bn") storeLanguage(data.language);
  } catch { /* language stays as it is on this device */ }
};
