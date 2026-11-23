import { Link } from "@tanstack/react-router";
import CholoKheliMark from "@/components/CholoKheliMark";
import LanguageSwitch from "@/components/i18n/LanguageSwitch";
import { useLanguage } from "@/i18n/LanguageProvider";
import { BUSINESS, mailto } from "@/lib/business";
import { LEGAL, type LegalId } from "./content";

export const LEGAL_LINKS: { id: LegalId; to: string; en: string; bn: string }[] = [
  { id: "privacy", to: "/privacy-policy", en: "Privacy Policy", bn: "গোপনীয়তা নীতি" },
  { id: "terms", to: "/terms", en: "Terms of Service", bn: "ব্যবহারের শর্তাবলি" },
  { id: "refund", to: "/refund-policy", en: "Refund Policy", bn: "রিফান্ড নীতি" },
  { id: "cookies", to: "/cookie-policy", en: "Cookie Policy", bn: "কুকি নীতি" },
  { id: "deletion", to: "/delete-data", en: "Delete your data", bn: "তথ্য মুছুন" },
  { id: "licences", to: "/licences", en: "Credits and licences", bn: "কৃতজ্ঞতা ও লাইসেন্স" },
];

/** Business details every page footer carries (name, place, registration status, contact). */
export function BusinessDetails({ className = "" }: { className?: string }) {
  const { lang } = useLanguage();
  return (
    <address className={`not-italic text-[13px] leading-relaxed text-muted-foreground ${className}`}>
      <strong className="font-semibold text-foreground">{BUSINESS.name}</strong>
      {" · "}{lang === "bn" ? "ঢাকা, বাংলাদেশ" : BUSINESS.city}
      <br />
      {lang === "bn" ? "কোম্পানি নিবন্ধনের কাজ চলছে।" : BUSINESS.registration}
      <br />
      <a href={mailto("Hello")} className="underline underline-offset-2 hover:text-foreground">{BUSINESS.email}</a>
    </address>
  );
}

/** Row of links to every legal page. */
export function LegalLinks({ className = "" }: { className?: string }) {
  const { lang } = useLanguage();
  return (
    <nav aria-label={lang === "bn" ? "আইনি তথ্য" : "Legal"} className={className}>
      <ul className="flex flex-wrap gap-x-4 gap-y-2 text-[13px]">
        {LEGAL_LINKS.map((l) => (
          <li key={l.id}>
            <Link to={l.to as never} className="text-muted-foreground underline-offset-2 hover:text-foreground hover:underline">{lang === "bn" ? l.bn : l.en}</Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}

export default function LegalPage({ id }: { id: LegalId }) {
  const { lang } = useLanguage();
  const doc = LEGAL[id][lang === "bn" ? "bn" : "en"];
  return (
    <main className="min-h-[100dvh] bg-background px-4 pb-16" style={{ paddingTop: "calc(1.25rem + env(safe-area-inset-top))" }}>
      <article className="mx-auto max-w-2xl">
        <div className="flex items-center justify-between">
          <Link to="/" aria-label={lang === "bn" ? "চলো খেলি হোম" : "Cholo Kheli home"} className="press inline-flex items-center gap-2 rounded-xl py-2">
            <CholoKheliMark className="h-7 w-8" />
            <span className="text-[15px] font-semibold">Cholo Kheli</span>
          </Link>
          <LanguageSwitch />
        </div>
        <header className="pb-6 pt-8">
          <h1 className="text-[32px] font-extrabold leading-tight tracking-[-0.02em]">{doc.title}</h1>
          <p className="mt-2 text-[16px] text-muted-foreground">{doc.summary}</p>
          <p className="mt-2 text-[13px] text-muted-foreground">
            {lang === "bn" ? "কার্যকর: ২৪ নভেম্বর ২০২৬" : `Effective ${BUSINESS.legalEffective}`}
          </p>
        </header>
        {doc.sections.map((s) => (
          <section key={s.h} className="border-t border-border py-6">
            <h2 className="text-[20px] font-bold">{s.h}</h2>
            {s.p?.map((t, i) => <p key={i} className="mt-3 text-[16px] leading-relaxed text-foreground/90">{t}</p>)}
            {s.list && (
              <ul className="mt-3 list-disc space-y-2 pl-5 text-[16px] leading-relaxed text-foreground/90 marker:text-primary">
                {s.list.map((t, i) => <li key={i}>{t}</li>)}
              </ul>
            )}
          </section>
        ))}
        <footer className="space-y-4 border-t border-border pt-6">
          <LegalLinks />
          <BusinessDetails />
        </footer>
      </article>
    </main>
  );
}
