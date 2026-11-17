import { useState } from "react";
import { ChevronRight, Plus } from "lucide-react";

export type Achievement = { id: string; title: string; description: string | null; year: number | null };

const Header = ({ title, action, onAction }: { title: string; action?: string; onAction?: () => void }) => (
  <div className="mb-1.5 flex items-baseline justify-between px-4">
    <h2 className="text-[20px] font-bold tracking-tight">{title}</h2>
    {action && <button type="button" onClick={onAction} aria-label={`${action} ${title.toLowerCase()}`} className="press text-[15px] text-primary">{action}</button>}
  </div>
);

/** The bio, on its own card. Long text folds to five lines with a "more" link. */
export const AboutSection = ({ bio, onEdit, emptyHint }: { bio: string; onEdit?: () => void; emptyHint?: string }) => {
  const [open, setOpen] = useState(false);
  if (!bio && !onEdit) return null;
  const long = bio.length > 220 || bio.split("\n").length > 5;
  return (
    <section className="mx-4 mt-6" aria-label="About">
      <Header title="About" action={onEdit && bio ? "Edit" : undefined} onAction={onEdit} />
      {bio ? (
        <div className="rounded-[14px] bg-card px-4 py-3">
          <p data-bio translate="no" className={`whitespace-pre-line break-words text-[16px] leading-[1.45] text-foreground ${open || !long ? "" : "line-clamp-5"}`}>{bio}</p>
          {long && <button type="button" onClick={() => setOpen((o) => !o)} className="mt-1 text-[15px] text-primary">{open ? "Show less" : "more"}</button>}
        </div>
      ) : (
        <button type="button" onClick={onEdit} className="press flex w-full items-center gap-3 rounded-[14px] bg-card px-4 py-3 text-left">
          <span className="grid h-7 w-7 place-items-center rounded-full bg-primary text-primary-foreground"><Plus className="h-4 w-4" strokeWidth={2.5} /></span>
          <span className="flex-1"><span className="block text-[16px] text-primary">Add a bio</span>{emptyHint && <span className="block text-[13px] text-muted-foreground">{emptyHint}</span>}</span>
        </button>
      )}
    </section>
  );
};

/** Achievements as an iOS list: title, year on the right, details underneath. Tap a row to edit when it's yours. */
export const AchievementsSection = ({ items, onAdd, onOpen }: { items: Achievement[]; onAdd?: () => void; onOpen?: (a: Achievement) => void }) => {
  if (items.length === 0 && !onAdd) return null;
  return (
    <section className="mx-4 mt-6" aria-label="Achievements">
      <Header title="Achievements" />
      <div className="ios-group">
        {items.map((a) => {
          const body = (
            <>
              <span className="min-w-0 flex-1">
                <span className="block text-[16px] leading-snug">{a.title}</span>
                {a.description && <span className="mt-0.5 block text-[13px] leading-snug text-muted-foreground">{a.description}</span>}
              </span>
              {a.year && <span className="shrink-0 text-[15px] tabular-nums text-muted-foreground">{a.year}</span>}
              {onOpen && <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground/60" aria-hidden="true" />}
            </>
          );
          return onOpen
            ? <button key={a.id} type="button" onClick={() => onOpen(a)} aria-label={`Edit ${a.title}`} className="ios-row w-full text-left">{body}</button>
            : <div key={a.id} className="ios-row">{body}</div>;
        })}
        {onAdd && (
            <button type="button" onClick={onAdd} className="ios-row w-full text-left text-[16px] text-primary">
              <span className="grid h-7 w-7 place-items-center rounded-full bg-primary text-primary-foreground"><Plus className="h-4 w-4" strokeWidth={2.5} /></span>
              <span className="flex-1">Add achievement</span>
            </button>
        )}
      </div>
      {onAdd && items.length === 0 && <p className="footnote px-4 pt-1.5">Trophies, selections and awards. Scouts see these on your profile.</p>}
    </section>
  );
};
