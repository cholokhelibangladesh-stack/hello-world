import { useEffect, useState, type ReactNode } from "react";
import { BadgeCheck, Camera, Loader2, Lock } from "lucide-react";
import { safeMediaUrl } from "@/lib/sanitize";
import { formatCount } from "@/lib/taxonomy";

type Count = { label: string; value: number; onClick?: () => void };

/**
 * The profile hero: a tall photo card with a frosted panel across the bottom. The panel blurs and
 * darkens whatever is behind it, so the white name and details read clearly on any photo.
 * Counts sit in a row of glass pills under the card.
 */
const ProfileCard = ({ name, subtitle, avatarUrl, verified, isPrivate, counts, onChangePhoto, uploading, children }: {
  name: string; subtitle: string; avatarUrl?: string | null; verified?: boolean; isPrivate?: boolean;
  counts: Count[]; onChangePhoto?: () => void; uploading?: boolean; children?: ReactNode;
}) => {
  const initial = (name || "?").trim().charAt(0).toUpperCase();
  const [broken, setBroken] = useState(false);
  useEffect(() => setBroken(false), [avatarUrl]);
  return (
    <section className="px-4 pt-3 md:grid md:grid-cols-[minmax(0,300px)_1fr] md:items-end md:gap-6">
      <div className="relative aspect-[4/5] w-full overflow-hidden rounded-[30px] shadow-[0_24px_50px_-24px_rgba(14,42,51,0.55)]">
        {avatarUrl && !broken ? (
          <img src={safeMediaUrl(avatarUrl)} alt="" onError={() => setBroken(true)} className="absolute inset-0 h-full w-full object-cover" />
        ) : (
          <div aria-hidden="true" className="absolute inset-0 grid place-items-center"
            style={{ background: "radial-gradient(70% 60% at 25% 20%, #7EC8FF 0%, transparent 70%), radial-gradient(70% 70% at 80% 80%, #13738F 0%, transparent 70%), #0E2A33" }}>
            <span className="text-[96px] font-semibold leading-none text-white/85">{initial}</span>
          </div>
        )}

        {onChangePhoto && (
          <button type="button" onClick={onChangePhoto} aria-label={avatarUrl ? "Change profile photo" : "Add profile photo"}
            className="press absolute right-3 top-3 grid h-11 w-11 place-items-center rounded-full bg-black/25 text-white ring-1 ring-white/35 backdrop-blur-xl">
            {uploading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Camera className="h-5 w-5" />}
          </button>
        )}

        <div className="absolute inset-x-2.5 bottom-2.5 rounded-[22px] bg-black/30 px-4 py-3.5 text-white ring-1 ring-white/25 backdrop-blur-2xl backdrop-saturate-150">
          <h1 className="flex items-center gap-1.5 text-[24px] font-bold leading-tight tracking-tight">
            <span className="truncate">{name || "Add your name"}</span>
            {verified && <BadgeCheck className="h-5 w-5 shrink-0 text-[#7EC8FF]" aria-label="Verified scout" />}
            {isPrivate && <Lock className="h-4 w-4 shrink-0 text-white/80" aria-label="Private account" />}
          </h1>
          {subtitle && <p className="mt-0.5 truncate text-[15px] text-white/85">{subtitle}</p>}
        </div>
      </div>

      <div className="min-w-0">
      <dl className="mt-3 grid grid-cols-3 gap-2 md:mt-0">
        {counts.map((c, i) => {
          const inner = (
            <>
              <dd className="text-[20px] font-bold leading-tight tabular-nums">{formatCount(c.value)}</dd>
              <dt className="text-[13px] text-muted-foreground">{c.label}</dt>
            </>
          );
          const cls = `flex flex-col-reverse items-center !rounded-[20px] py-2.5 ${["glass-tint-sky", "glass-tint-mint", "glass-tint-sand"][i % 3]}`;
          return c.onClick
            ? <button key={c.label} type="button" onClick={c.onClick} className={`press ${cls}`}>{inner}</button>
            : <div key={c.label} className={cls}>{inner}</div>;
        })}
      </dl>
      {children}
      </div>
    </section>
  );
};

export default ProfileCard;
