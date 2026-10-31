/**
 * Where this period's billed money stands, drawn as the Brightloop loop:
 * collected, still due (not yet late) and overdue.
 */
export const REVENUE_COLORS = {
  collected: "#1c636a",
  due: "#acd4d5",
  overdue: "#e0604a",
};

export default function RevenueLoop({
  collected,
  due,
  overdue,
}: {
  collected: number;
  due: number;
  overdue: number;
}) {
  const size = 280;
  const c = size / 2;
  const r = 112;
  const stroke = 22;
  const total = collected + due + overdue;
  const parts = [
    { key: "collected", value: collected, color: REVENUE_COLORS.collected },
    { key: "due", value: due, color: REVENUE_COLORS.due },
    { key: "overdue", value: overdue, color: REVENUE_COLORS.overdue },
  ].filter((p) => p.value > 0);

  const circumference = 2 * Math.PI * r;
  const gapLength = parts.length > 1 ? 6 : 0;
  let offset = 0;
  const collectedShare = total > 0 ? Math.round((collected / total) * 100) : 0;

  return (
    <svg
      viewBox={`0 0 ${size} ${size}`}
      className="h-auto w-full max-w-[280px]"
      role="img"
      aria-label={`${collectedShare}% of billed revenue collected`}
    >
      <circle cx={c} cy={c} r={r} fill="none" stroke="currentColor" strokeOpacity="0.08" strokeWidth={stroke} />
      {total > 0 &&
        parts.map((part) => {
          const length = (part.value / total) * circumference;
          const visible = Math.max(0, length - gapLength);
          const el = (
            <circle
              key={part.key}
              cx={c}
              cy={c}
              r={r}
              fill="none"
              stroke={part.color}
              strokeWidth={stroke}
              strokeDasharray={`${visible.toFixed(2)} ${circumference.toFixed(2)}`}
              strokeDashoffset={(-offset).toFixed(2)}
              transform={`rotate(-90 ${c} ${c})`}
            />
          );
          offset += length;
          return el;
        })}
      <text x={c} y={c + 6} textAnchor="middle" className="font-display" fontSize="52" fontWeight="600" fill="currentColor">
        {collectedShare}%
      </text>
      <text x={c} y={c + 34} textAnchor="middle" fontSize="14" fill="currentColor" fillOpacity="0.6">
        collected
      </text>
    </svg>
  );
}
