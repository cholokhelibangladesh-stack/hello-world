import { Link } from "@tanstack/react-router";
import { ChevronRight, LucideIcon } from "lucide-react";
import { ReactNode } from "react";

/** Navigation row: tinted icon square, label, optional trailing value, chevron. */
export const SettingsRow = ({ icon: Icon, label, to, onClick, trailing, tint = "default" }: {
  icon: LucideIcon; label: string; to?: string; onClick?: () => void; trailing?: ReactNode; tint?: "default" | "destructive" | "accent";
}) => {
  const destructive = tint === "destructive";
  const inner = (
    <div className="ios-row">
      <span className={`grid h-[30px] w-[30px] shrink-0 place-items-center rounded-[8px] ${destructive ? "bg-destructive" : "bg-primary"}`}>
        <Icon className={`h-[18px] w-[18px] ${destructive ? "text-white" : "text-primary-foreground"}`} strokeWidth={2} aria-hidden="true" />
      </span>
      <span className={`flex-1 truncate text-[16px] ${destructive ? "text-destructive" : "text-foreground"}`}>{label}</span>
      {trailing ? <span className="text-[15px] text-muted-foreground">{trailing}</span> : null}
      {to || onClick ? <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground/60" aria-hidden="true" /> : null}
    </div>
  );
  const cls = "block w-full text-left active:bg-muted";
  if (to) return <Link to={to as never} className={cls}>{inner}</Link>;
  return <button type="button" onClick={onClick} className={cls}>{inner}</button>;
};

export const SettingsGroup = ({ label, children }: { label?: string; children: ReactNode }) => (
  <section className="pt-6">
    {label ? <h2 className="ios-group-label">{label}</h2> : null}
    <div className="ios-group">{children}</div>
  </section>
);
