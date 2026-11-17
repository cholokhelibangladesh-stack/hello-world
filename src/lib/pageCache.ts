import { useState } from "react";

/**
 * Remembers the last data a screen loaded (in memory, for this session), so coming back to a tab paints
 * the previous content straight away while fresh data loads behind it, instead of a blank or a spinner.
 * Cleared on sign-out because keys include the user id.
 */
const store = new Map<string, unknown>();

export const usePageCache = <T,>(key: string | null): [T | null, (v: T) => void] => {
  const [value, setValue] = useState<T | null>(() => (key ? ((store.get(key) as T | undefined) ?? null) : null));
  const save = (v: T) => { if (key) store.set(key, v); setValue(v); };
  return [value, save];
};

export const clearPageCache = () => store.clear();
