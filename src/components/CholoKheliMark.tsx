import markAsset from "@/assets/cholo-kheli-mark.png.asset.json";

interface Props {
  className?: string;
  /** Kept for API compatibility; unused with raster logo. */
  color?: string;
  accent?: string;
}

/* Official Cholo Kheli mark — three swooping arcs + triangular blade.
   Rendered from the brand PNG (transparent) so it matches the master artwork. */
const CholoKheliMark = ({ className = "" }: Props) => (
  <img
    src={markAsset.url}
    alt="Cholo Kheli"
    className={`object-contain ${className}`}
    draggable={false}
  />
);

export default CholoKheliMark;
