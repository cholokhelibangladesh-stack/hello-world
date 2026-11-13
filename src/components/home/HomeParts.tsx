import { Link } from "@tanstack/react-router";
import { ChevronRight, type LucideIcon } from "lucide-react";
import { ReactNode } from "react";

/** Large-title header for a tab root. */
export const HomeHeader = ({ title, subtitle }: { title: string; subtitle?: string }) => (
  <header className="px-4 pt-4">
    <h1 className="large-title">{title}</h1>
    {subtitle ? <p className="mt-1 text-[15px] text-muted-foreground">{subtitle}</p> : null}
  </header>
);

export const HomeSection = ({ title, children, action }: { title?: string; children: ReactNode; action?: ReactNode }) => (
  <section className="px-4 pt-6">
    {title ? (
      <div className="flex items-baseline justify-between pb-2">
        <h2 className="title-2">{title}</h2>
        {action}
      </div>
    ) : null}
    {children}
  </section>
);

/** Row inside an ios-group: icon square, label, detail, optional badge and chevron. */
export const HomeRow = ({ icon: Icon, label, detail, to, badge, tone = "primary" }: {
  icon: LucideIcon; label: string; detail?: string; to?: string; badge?: number; tone?: "primary" | "success" | "muted";
}) => {
  const bg = tone === "success" ? "bg-success" : tone === "muted" ? "bg-muted-foreground/60" : "bg-primary";
  const inner = (
    <div className="ios-row">
      <span className={`grid h-[30px] w-[30px] shrink-0 place-items-center rounded-[8px] ${bg}`}>
        <Icon className={`h-[18px] w-[18px] ${tone === "primary" ? "text-primary-foreground" : "text-white"}`} strokeWidth={2} aria-hidden="true" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[16px]">{label}</span>
        {detail ? <span className="footnote block truncate">{detail}</span> : null}
      </span>
      {badge ? <span className="min-w-[22px] rounded-full bg-destructive px-1.5 py-0.5 text-center text-[13px] font-semibold text-white">{badge > 99 ? "99+" : badge}</span> : null}
      {to ? <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground/60" aria-hidden="true" /> : null}
    </div>
  );
  return to ? <Link to={to as never} className="block active:bg-muted">{inner}</Link> : inner;
};

/** Three-up stat tiles. */
export const StatTiles = ({ items }: { items: { label: string; value: string | number }[] }) => (
  <div className="grid grid-cols-3 gap-3">
    {items.map((s) => (
      <div key={s.label} className="ios-group px-3 py-3">
        <p className="text-[24px] font-bold leading-none tracking-tight">{s.value}</p>
        <p className="footnote mt-1.5">{s.label}</p>
      </div>
    ))}
  </div>
);

export const compact = (n: number) => (n >= 1000 ? `${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}k` : String(n));
