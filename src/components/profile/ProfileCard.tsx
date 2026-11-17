import { useEffect, useState, type ReactNode } from "react";
import { BadgeCheck, Lock } from "lucide-react";
import { safeMediaUrl } from "@/lib/sanitize";
import { formatCount } from "@/lib/taxonomy";

/** Solid until just past the name, then fades out completely by the bottom edge. */
const FADE = "linear-gradient(to bottom, #000 0%, #000 62%, rgba(0,0,0,0.55) 82%, transparent 100%)";

type Count = { label: string; value: number; onClick?: () => void };

/** Round frosted button for the top of the profile photo. */
export const HeroIconButton = ({ label, onClick, children }: { label: string; onClick?: () => void; children: ReactNode }) => (
  <button type="button" onClick={onClick} aria-label={label}
    className="press grid h-11 w-11 place-items-center rounded-full bg-black/25 text-white ring-1 ring-white/30 backdrop-blur-xl">
    {children}
  </button>
);

/**
 * The page behind a profile: the profile photo, heavily blurred and darkened, fills the screen so the
 * cards below the hero read as dark glass tinted by the photo. Text tokens flip to white inside.
 */
export const ProfileSurface = ({ avatarUrl, children }: { avatarUrl?: string | null; children: ReactNode }) => (
  <div className="profile-dark relative isolate min-h-[100dvh] overflow-hidden bg-[#0B1F26]">
    <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 bg-[#0B1F26]">
      {avatarUrl && <img src={safeMediaUrl(avatarUrl)} alt="" className="absolute inset-x-0 top-0 h-[110dvh] w-full scale-125 object-cover opacity-70 blur-3xl"
        style={{ WebkitMaskImage: "linear-gradient(#000 60%, transparent)", maskImage: "linear-gradient(#000 60%, transparent)" }} />}
      <div className="absolute inset-x-0 top-0 h-[110dvh] bg-gradient-to-b from-[#0B1F26]/30 via-[#0B1F26]/70 to-[#0B1F26]" />
    </div>
    {children}
  </div>
);

/**
 * Profile hero: the photo fills the top of the screen edge to edge and melts into a blurred copy of
 * itself, with the name in large white type over the blur, the main actions, and the counts below.
 */
const ProfileCard = ({ name, subtitle, avatarUrl, verified, isPrivate, counts, topLeft, topRight, children }: {
  name: string; subtitle: string; avatarUrl?: string | null; verified?: boolean; isPrivate?: boolean;
  counts: Count[]; topLeft?: ReactNode; topRight?: ReactNode; children?: ReactNode;
  /** Kept for callers that still pass them; photo changes now live in the actions row. */
  onChangePhoto?: () => void; uploading?: boolean;
}) => {
  const initial = (name || "?").trim().charAt(0).toUpperCase();
  const [broken, setBroken] = useState(false);
  useEffect(() => setBroken(false), [avatarUrl]);
  const photo = avatarUrl && !broken ? safeMediaUrl(avatarUrl) : null;

  return (
    <section className="relative text-white">
      <div className="relative h-[60dvh] min-h-[400px] max-h-[620px] w-full md:mx-auto md:mt-4 md:max-w-[620px]">
        {/* Photo layers fade out at the bottom so the picture dissolves into the blurred page behind it,
            with no edge between the hero and the rest of the profile. */}
        <div aria-hidden className="absolute inset-0 overflow-hidden md:rounded-t-[34px]"
          style={{ WebkitMaskImage: FADE, maskImage: FADE }}>
          {photo ? (
            <>
              <img src={photo} alt="" onError={() => setBroken(true)} className="absolute inset-0 h-full w-full object-cover" />
              {/* The lower part of the photo turns into frosted glass */}
              <img src={photo} alt="" className="absolute inset-0 h-full w-full scale-110 object-cover blur-2xl"
                style={{ WebkitMaskImage: "linear-gradient(to bottom, transparent 45%, #000 80%)", maskImage: "linear-gradient(to bottom, transparent 45%, #000 80%)" }} />
            </>
          ) : (
            <div className="absolute inset-0 grid place-items-center"
              style={{ background: "radial-gradient(70% 60% at 25% 20%, #7EC8FF 0%, transparent 70%), radial-gradient(70% 70% at 80% 80%, #13738F 0%, transparent 70%), #0E2A33" }}>
              <span className="text-[120px] font-semibold leading-none text-white/85">{initial}</span>
            </div>
          )}
          <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-b from-transparent to-black/30" />
        </div>

        <div className="absolute inset-x-0 top-0 flex items-center justify-between px-4" style={{ paddingTop: "calc(env(safe-area-inset-top) + 12px)" }}>
          <div className="flex gap-2">{topLeft}</div>
          <div className="flex gap-2">{topRight}</div>
        </div>

        <div className="absolute inset-x-0 bottom-0 px-5 pb-5 text-center">
          <h1 className="flex items-center justify-center gap-2 text-[34px] font-bold leading-tight tracking-[-0.02em] drop-shadow-[0_2px_14px_rgba(0,0,0,0.35)]">
            <span className="truncate">{name || "Add your name"}</span>
            {verified && <BadgeCheck className="h-6 w-6 shrink-0 text-[#7EC8FF]" aria-label="Verified scout" />}
            {isPrivate && <Lock className="h-5 w-5 shrink-0 text-white/80" aria-label="Private account" />}
          </h1>
          {subtitle && <p className="mt-1 truncate text-[16px] text-white/65">{subtitle}</p>}
        </div>
      </div>

      <div className="mx-auto max-w-[620px] px-5">
        {children}
        <dl className="mt-5 grid grid-cols-3 text-center">
          {counts.map((c) => {
            const inner = (
              <>
                <dt className="order-2 mt-1.5 text-[14px] text-white/60">{c.label}</dt>
                <dd className="order-1 text-[28px] font-bold leading-none tabular-nums">{formatCount(c.value)}</dd>
              </>
            );
            return c.onClick
              ? <button key={c.label} type="button" onClick={c.onClick} className="press flex flex-col items-center py-1">{inner}</button>
              : <div key={c.label} className="flex flex-col items-center py-1">{inner}</div>;
          })}
        </dl>
      </div>
    </section>
  );
};

export default ProfileCard;
