import markAsset from "@/assets/cholo-kheli-mark-cropped.png.asset.json";

interface Props {
  className?: string;
  /** Kept for API compatibility. */
  color?: string;
  accent?: string;
}

/** Cholo Kheli mark: brand teal in light mode, a light tint in dark mode so it stays visible. */
const CholoKheliMark = ({ className = "" }: Props) => {
  const size = className || "h-8 w-11";
  return (
    <span className={`relative inline-block select-none ${size}`} role="img" aria-label="Cholo Kheli">
      <img src={markAsset.url} alt="" draggable={false} className="absolute inset-0 h-full w-full object-contain dark:hidden" />
      <img src="/brand/cholo-kheli-mark-light@4x.png" alt="" draggable={false} className="absolute inset-0 hidden h-full w-full object-contain dark:block" />
    </span>
  );
};

export default CholoKheliMark;
