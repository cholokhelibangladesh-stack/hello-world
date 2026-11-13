import { ReactNode } from "react";
import { Switch } from "@/components/ui/switch";
import { Check, LucideIcon } from "lucide-react";

/** iOS grouped-list container. */
export const SettingsCard = ({ children, className = "" }: { children: ReactNode; className?: string }) => (
  <div className={`ios-group ${className}`}>{children}</div>
);

export const SettingsSection = ({ label, footer, children }: { label?: string; footer?: ReactNode; children: ReactNode }) => (
  <section className="pt-6 first:pt-0">
    {label ? <h2 className="ios-group-label">{label}</h2> : null}
    <SettingsCard>{children}</SettingsCard>
    {footer ? <p className="footnote px-4 pt-2">{footer}</p> : null}
  </section>
);

/** Row with a title, optional description, and a switch. */
export const SettingsToggle = ({ icon: Icon, title, description, checked, onChange, disabled }: {
  icon?: LucideIcon; title: string; description?: string; checked: boolean; onChange: (v: boolean) => void; disabled?: boolean;
}) => (
  <div className="ios-row items-start">
    {Icon ? <Icon className="mt-0.5 h-5 w-5 shrink-0 text-primary" strokeWidth={1.85} aria-hidden="true" /> : null}
    <div className="min-w-0 flex-1">
      <div className="text-[16px] leading-snug">{title}</div>
      {description ? <div className="footnote mt-0.5">{description}</div> : null}
    </div>
    <Switch aria-label={title} checked={checked} onCheckedChange={onChange} disabled={disabled} />
  </div>
);

/** Single choice list with a trailing checkmark, like iOS Settings. */
export function SettingsChoice<T extends string>({ value, onChange, options }: {
  value: T; onChange: (v: T) => void; options: Array<{ value: T; title: string; description?: string }>;
}) {
  return (
    <div role="radiogroup">
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button key={o.value} type="button" role="radio" aria-checked={active} onClick={() => onChange(o.value)}
            className="ios-row w-full text-left active:bg-muted">
            <span className="min-w-0 flex-1">
              <span className="block text-[16px] leading-snug">{o.title}</span>
              {o.description ? <span className="footnote mt-0.5 block">{o.description}</span> : null}
            </span>
            {active ? <Check className="h-5 w-5 shrink-0 text-primary" strokeWidth={2.5} aria-hidden="true" /> : null}
          </button>
        );
      })}
    </div>
  );
}

/** Read-only label/value row. */
export const SettingsDetail = ({ label, value, mono }: { label: string; value: ReactNode; mono?: boolean }) => (
  <div className="ios-row justify-between">
    <span className="text-[16px]">{label}</span>
    <span className={`min-w-0 truncate text-right text-[16px] text-muted-foreground ${mono ? "font-mono text-[14px]" : ""}`}>{value}</span>
  </div>
);
