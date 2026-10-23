import outlines from "../circuits/generated/outlines.json";
export function CircuitOutline({ className = "", circuitId = "shanghai" }: { className?: string; circuitId?: string }) {
  const outline = (outlines as Record<string, {path: string; start: number[]}>)[circuitId];
  if (!outline) return null;
  return (
    <svg
      className={className}
      viewBox="0 0 400 280"
      fill="none"
      aria-label={`${circuitId}赛道轮廓`}
      role="img"
    >
      <path
        d={outline.path}
        stroke="currentColor"
        strokeWidth="5"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      <circle
        cx={outline.start[0]}
        cy={outline.start[1]}
        r="7"
        fill="var(--product-accent)"
        stroke="var(--product-bg)"
        strokeWidth="4"
      />
    </svg>
  );
}
