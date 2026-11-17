import { BN_UI } from "./bn-ui";
import { translations } from "./translations";

/**
 * Shows the whole interface in Bangla. Most components write their labels in English; instead of threading
 * a translation call through every one of them, this watches the page and swaps interface text (text nodes and
 * the placeholder, aria-label, title and alt attributes) for its Bangla version from one dictionary.
 *
 * Only exact interface strings are swapped, so names, bios, captions and messages people write are left as
 * they are. Anything inside [translate="no"] or [data-no-i18n] is never touched. Switching back to English
 * restores the original text. React keeps working because only a text node's value changes, never the nodes.
 */

const norm = (s: string) => s.replace(/\s+/g, " ").trim();

let dict: Map<string, string> | null = null;
const getDict = () => {
  if (dict) return dict;
  dict = new Map<string, string>();
  for (const [en, bn] of Object.entries(BN_UI)) dict.set(norm(en), bn);
  // Every string that already has a translation key also works when written out in English.
  const en = translations.en as Record<string, string>;
  const bn = translations.bn as Record<string, string>;
  for (const k of Object.keys(en)) if (bn[k] && en[k] !== bn[k]) dict.set(norm(en[k]), bn[k]);
  return dict;
};

const BN_DIGITS = "০১২৩৪৫৬৭৮৯";
const bnNum = (s: string) => s.replace(/\d/g, (d) => BN_DIGITS[+d]);

const MONTHS: Record<string, string> = { Jan: "জানু", Feb: "ফেব্রু", Mar: "মার্চ", Apr: "এপ্রিল", May: "মে", Jun: "জুন", Jul: "জুলাই", Aug: "আগস্ট", Sep: "সেপ্টে", Oct: "অক্টো", Nov: "নভে", Dec: "ডিসে" };
const UNIT: Record<string, string> = { follower: "ফলোয়ার", like: "লাইক", view: "ভিউ", comment: "কমেন্ট", highlight: "হাইলাইট", share: "শেয়ার", player: "খেলোয়াড়", scout: "স্কাউট", admin: "অ্যাডমিন", video: "ভিডিও", request: "অনুরোধ", message: "মেসেজ", notification: "নোটিফিকেশন", day: "দিন", hour: "ঘণ্টা", minute: "মিনিট", second: "সেকেন্ড", live: "চালু", flagged: "চিহ্নিত", unread: "না পড়া", new: "নতুন" };
const unit = (w: string) => UNIT[w.toLowerCase().replace(/s$/, "")] ?? UNIT[w.toLowerCase()] ?? null;
/** Look a word or phrase up, also as Sentence case (tags are stored lower-case). */
const word = (w: string): string | null => {
  const d = getDict();
  return d.get(w) ?? d.get(w.charAt(0).toUpperCase() + w.slice(1)) ?? null;
};

/** Labels built in code around a number, a date or a name. */
const PATTERNS: [RegExp, (...m: string[]) => string | null][] = [
  [/^[\d.,:%+\-–/ ]*\d[\d.,:%+\-–/ ]*[KM]?$/, (all) => bnNum(all)],
  [/^(\d+)([mhd]|w)( ago)?$/, (_, n, u, ago) => `${bnNum(n)} ${({ m: "মি.", h: "ঘ.", d: "দিন", w: "সপ্তাহ" } as Record<string, string>)[u]}${ago ? " আগে" : ""}`],
  [/^(\d[\d,]*) ([A-Za-z]+)$/, (_, n, w) => { const u = unit(w); return u ? `${bnNum(n)} ${u}` : null; }],
  [/^([A-Za-z]+)$/, (w) => unit(w)],
  [/^(\d+) live · (\d+) flagged$/, (_, a, b) => `${bnNum(a)} চালু · ${bnNum(b)} চিহ্নিত`],
  [/^New in (\d+) days$/, (_, n) => `গত ${bnNum(n)} দিনে নতুন`],
  [/^Hi, (.+)$/, (_, n) => `হাই, ${n}`],
  [/^Ranked for (.+)$/, (_, s) => `${word(s) ?? s} অনুযায়ী সাজানো`],
  [/^(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec) (\d{1,2})(?:, (\d{4}))?$/, (_, m, d, y) => `${bnNum(d)} ${MONTHS[m]}${y ? ` ${bnNum(y)}` : ""}`],
  [/^(\d{1,2}):(\d{2})(?::(\d{2}))? ?(AM|PM)$/, (_, h, mi, se, ap) => `${bnNum(h)}:${bnNum(mi)}${se ? ":" + bnNum(se) : ""} ${ap}`],
  [/^(\d{1,2})\/(\d{1,2})\/(\d{4}), (.+)$/, (_, mo, d, y, rest) => `${bnNum(d)}/${bnNum(mo)}/${bnNum(y)}, ${translateString(rest) ?? rest}`],
  [/^(.+) \((\d+)\)$/, (_, w, n) => { const t = word(w); return t ? `${t} (${bnNum(n)})` : null; }],
  [/^(.+), (\d+) unread$/, (_, w, n) => { const t = word(w); return t ? `${t}, ${bnNum(n)}টি না পড়া` : null; }],
];

/** Extra rules for aria-labels and titles, which often wrap a name: "Open Rafiq's profile". */
const ATTR_PATTERNS: [RegExp, (...m: string[]) => string][] = [
  [/^Open (.+)'s profile$/, (_, n) => `${n}-এর প্রোফাইল খুলুন`],
  [/^(.+)'s profile$/, (_, n) => `${n}-এর প্রোফাইল`],
  [/^Follow (.+)$/, (_, n) => `${n}-কে ফলো করুন`],
  [/^Unfollow (.+)$/, (_, n) => `${n}-কে আনফলো করুন`],
  [/^Play (.+)$/, (_, n) => `চালান: ${n}`],
  [/^Delete (.+)$/, (_, n) => `মুছুন: ${n}`],
  [/^Remove (.+)$/, (_, n) => `সরান: ${n}`],
  [/^Message (.+)$/, (_, n) => `${n}-কে মেসেজ দিন`],
];

const translateCore = (key: string, attr: boolean): string | null => {
  const hit = word(key);
  if (hit) return hit;
  // Built labels are short; longer text that only matches a pattern is someone's own words, so leave it.
  if (key.length > 40) return null;
  for (const [re, fn] of PATTERNS) { const m = key.match(re); if (m) { const r = fn(...m); if (r) return r; } }
  if (attr) for (const [re, fn] of ATTR_PATTERNS) { const m = key.match(re); if (m) return fn(...m); }
  // "@rafiq_10 · Football": translate each part on its own.
  if (key.includes(" · ")) {
    const parts = key.split(" · ");
    const out = parts.map((p) => translateCore(p, attr) ?? p);
    if (out.some((o, i) => o !== parts[i])) return out.join(" · ");
  }
  return null;
};

export const translateString = (raw: string, attr = false): string | null => {
  const key = norm(raw);
  if (!key || !/[A-Za-z0-9]/.test(key)) return null;
  const out = translateCore(key, attr);
  if (!out || out === key) return null;
  // Keep the spacing around the text so inline layouts don't change.
  const lead = raw.match(/^\s*/)?.[0] ?? "";
  const trail = raw.match(/\s*$/)?.[0] ?? "";
  return lead + out + trail;
};

const ATTRS = ["placeholder", "aria-label", "title", "alt"] as const;
const SKIP_TAGS = new Set(["SCRIPT", "STYLE", "NOSCRIPT", "TEXTAREA", "CODE", "PRE"]);

/** Original English for everything we changed, so switching back is exact. */
const textOrig = new WeakMap<Text, { en: string; bn: string }>();
const attrOrig = new WeakMap<Element, Map<string, { en: string; bn: string }>>();
const touched = new Set<WeakRef<Text | Element>>();

const skipped = (el: Element | null) => !!el?.closest('[translate="no"],[data-no-i18n],[contenteditable="true"]');

const doText = (node: Text) => {
  const v = node.nodeValue ?? "";
  const rec = textOrig.get(node);
  if (rec && v === rec.bn) return; // already ours
  const parent = node.parentElement;
  if (!parent || SKIP_TAGS.has(parent.tagName) || skipped(parent)) return;
  const bn = translateString(v);
  if (bn === null) { if (rec) textOrig.delete(node); return; }
  textOrig.set(node, { en: v, bn });
  touched.add(new WeakRef(node));
  node.nodeValue = bn;
};

const doAttrs = (el: Element) => {
  for (const a of ATTRS) {
    const v = el.getAttribute(a);
    if (v === null) continue;
    let map = attrOrig.get(el);
    const rec = map?.get(a);
    if (rec && v === rec.bn) continue;
    if (skipped(el)) return;
    const bn = translateString(v, true);
    if (bn === null) continue;
    if (!map) { map = new Map(); attrOrig.set(el, map); }
    map.set(a, { en: v, bn });
    touched.add(new WeakRef(el));
    el.setAttribute(a, bn);
  }
  // Buttons built as <input type="submit" value="...">
  if (el instanceof HTMLInputElement && (el.type === "submit" || el.type === "button") && el.value) {
    const bn = translateString(el.value); if (bn) el.value = bn;
  }
};

const walk = (root: Node) => {
  if (root.nodeType === Node.TEXT_NODE) { doText(root as Text); return; }
  if (root.nodeType !== Node.ELEMENT_NODE) return;
  const el = root as Element;
  if (SKIP_TAGS.has(el.tagName)) return;
  doAttrs(el);
  const tw = document.createTreeWalker(el, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT);
  let n = tw.nextNode();
  while (n) {
    if (n.nodeType === Node.TEXT_NODE) doText(n as Text); else doAttrs(n as Element);
    n = tw.nextNode();
  }
};

let observer: MutationObserver | null = null;

const start = () => {
  if (observer || typeof document === "undefined") return;
  walk(document.body);
  observer = new MutationObserver((records) => {
    for (const r of records) {
      if (r.type === "characterData") doText(r.target as Text);
      else if (r.type === "attributes") doAttrs(r.target as Element);
      else r.addedNodes.forEach(walk);
    }
  });
  observer.observe(document.body, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: [...ATTRS] });
};

const stop = () => {
  observer?.disconnect(); observer = null;
  for (const ref of touched) {
    const n = ref.deref();
    if (!n) continue;
    if (n instanceof Text) { const r = textOrig.get(n); if (r && n.nodeValue === r.bn) n.nodeValue = r.en; textOrig.delete(n); }
    else { const m = attrOrig.get(n); m?.forEach((r, a) => { if (n.getAttribute(a) === r.bn) n.setAttribute(a, r.en); }); attrOrig.delete(n); }
  }
  touched.clear();
};

/** Turn the Bangla interface on or off. */
export const applyDomLanguage = (lang: string) => (lang === "bn" ? start() : stop());
