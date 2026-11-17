import inter from "@fontsource-variable/inter/files/inter-latin-wght-normal.woff2?url";
import anton from "@fontsource/anton/files/anton-latin-400-normal.woff2?url";
import bebas from "@fontsource/bebas-neue/files/bebas-neue-latin-400-normal.woff2?url";
import marker from "@fontsource/permanent-marker/files/permanent-marker-latin-400-normal.woff2?url";
import pacifico from "@fontsource/pacifico/files/pacifico-latin-400-normal.woff2?url";
import bangla from "@fontsource/noto-sans-bengali/files/noto-sans-bengali-bengali-700-normal.woff2?url";

/** Fonts offered for text on highlights. Bangla letters fall back to Noto Sans Bengali in every style. */
export const TEXT_FONTS = [
  { id: "clean", label: "Clean", family: "CK Inter", weight: 800 },
  { id: "bold", label: "Bold", family: "CK Anton", weight: 400 },
  { id: "sport", label: "Sport", family: "CK Bebas", weight: 400 },
  { id: "marker", label: "Marker", family: "CK Marker", weight: 400 },
  { id: "script", label: "Script", family: "CK Pacifico", weight: 400 },
] as const;
export type TextFontId = (typeof TEXT_FONTS)[number]["id"];

export const fontStack = (id: TextFontId) => {
  const f = TEXT_FONTS.find((x) => x.id === id) ?? TEXT_FONTS[0];
  return { family: `"${f.family}", "CK Bangla", sans-serif`, weight: f.weight };
};

let loading: Promise<void> | null = null;
/** Registers the editor fonts once, so both the preview (CSS) and the export (canvas) can use them. */
export const loadEditorFonts = () => {
  if (loading || typeof document === "undefined" || typeof FontFace === "undefined") return loading ?? Promise.resolve();
  const faces: FontFace[] = [
    new FontFace("CK Inter", `url(${inter}) format("woff2")`, { weight: "100 900" }),
    new FontFace("CK Anton", `url(${anton}) format("woff2")`),
    new FontFace("CK Bebas", `url(${bebas}) format("woff2")`),
    new FontFace("CK Marker", `url(${marker}) format("woff2")`),
    new FontFace("CK Pacifico", `url(${pacifico}) format("woff2")`),
    new FontFace("CK Bangla", `url(${bangla}) format("woff2")`, { weight: "100 900", unicodeRange: "U+0951-0952, U+0964-0965, U+0980-09FE, U+1CD0, U+1CD2, U+1CD5-1CD6, U+1CD8, U+1CE1, U+1CEA, U+1CED, U+1CF2, U+1CF5-1CF7, U+200C-200D, U+20B9, U+25CC, U+A8F1" }),
  ];
  loading = Promise.all(faces.map(async (f) => { try { document.fonts.add(await f.load()); } catch { /* font unavailable: canvas falls back */ } })).then(() => undefined);
  return loading;
};
