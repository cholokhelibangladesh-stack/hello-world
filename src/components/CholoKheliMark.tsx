interface Props {
  className?: string;
  color?: string;
  accent?: string;
}

/* Cholo Kheli — three swooping arcs forming an "A/arrow" mark */
const CholoKheliMark = ({ className = "", color = "currentColor", accent }: Props) => {
  const a = accent ?? color;
  return (
    <svg
      viewBox="0 0 200 140"
      className={className}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="Cholo Kheli"
    >
      {/* Outer arc */}
      <path
        d="M20 130 C 60 40, 110 20, 175 30"
        stroke={color}
        strokeWidth="9"
        strokeLinecap="round"
        opacity="0.55"
      />
      {/* Middle arc */}
      <path
        d="M50 130 C 80 55, 120 40, 170 50"
        stroke={color}
        strokeWidth="9"
        strokeLinecap="round"
        opacity="0.85"
      />
      {/* Solid triangular blade — the "peak" */}
      <path
        d="M95 130 L 150 25 L 165 130 Z"
        fill={a}
      />
    </svg>
  );
};

export default CholoKheliMark;
