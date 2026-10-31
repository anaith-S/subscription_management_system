/**
 * The billing month drawn as a loop: the seven things that happen in a month
 * at Brightloop, in order, ending where the next month starts (the gap at the
 * top).
 */
const STAGES = [
  { title: "Sign up", detail: "Accounts and roles" },
  { title: "Launch a plan", detail: "Products and variants" },
  { title: "Quote", detail: "Template to subscription" },
  { title: "Billing day", detail: "Invoices with tax, automatically" },
  { title: "Discounts", detail: "On the next invoice" },
  { title: "Payments", detail: "Matched to invoices" },
  { title: "Month end", detail: "Revenue and overdue" },
];

const BILLING_DAY = 3;

export default function MonthLoop({ monthLabel }: { monthLabel: string }) {
  const width = 760;
  const height = 600;
  const cx = width / 2;
  const cy = height / 2;
  const r = 188;
  const gap = 0.07; // fraction of the circle left open at the top

  const at = (t: number, radius: number) => {
    const angle = -Math.PI / 2 + t * 2 * Math.PI;
    // Rounded so the server and the browser render identical attributes.
    const round = (n: number) => Math.round(n * 100) / 100;
    return { x: round(cx + radius * Math.cos(angle)), y: round(cy + radius * Math.sin(angle)), angle };
  };
  const start = at(gap / 2, r);
  const end = at(1 - gap / 2, r);

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="h-auto w-full"
      role="img"
      aria-label="A billing month at Brightloop: sign up, launch a plan, quote, billing day, discounts, payments, month end."
    >
      <circle cx={cx} cy={cy} r={r + 58} fill="none" stroke="currentColor" strokeOpacity="0.07" />
      <path
        d={`M ${start.x} ${start.y} A ${r} ${r} 0 1 1 ${end.x} ${end.y}`}
        fill="none"
        stroke="currentColor"
        strokeOpacity="0.85"
        strokeWidth="2.5"
        strokeLinecap="round"
        pathLength={1}
        className="loop-draw"
        style={{ ["--loop-length" as string]: 1 }}
      />

      <text x={cx} y={cy - 16} textAnchor="middle" fontSize="16" fill="currentColor" fillOpacity="0.6">
        One billing month
      </text>
      <text
        x={cx}
        y={cy + 28}
        textAnchor="middle"
        className="font-display"
        fontSize="44"
        fontWeight="600"
        fill="currentColor"
        suppressHydrationWarning
      >
        {monthLabel}
      </text>

      {STAGES.map((stage, i) => {
        const t = (i + 0.5) / STAGES.length;
        const node = at(t, r);
        const cos = Math.cos(node.angle);
        const sin = Math.sin(node.angle);
        const label = at(t, r + 34);
        const anchor = Math.abs(cos) < 0.25 ? "middle" : cos > 0 ? "start" : "end";
        const dy = sin > 0.8 ? 18 : sin < -0.8 ? -26 : 0;
        const isBillingDay = i === BILLING_DAY;
        return (
          <g key={stage.title}>
            <circle
              cx={node.x}
              cy={node.y}
              r={isBillingDay ? 18 : 14}
              fill={isBillingDay ? "#f2a93b" : "#0e2a2e"}
              stroke={isBillingDay ? "none" : "currentColor"}
              strokeWidth="2"
            />
            <text
              x={node.x}
              y={node.y + 4.5}
              textAnchor="middle"
              fontSize="13"
              fontWeight="700"
              fill={isBillingDay ? "#0e2a2e" : "currentColor"}
            >
              {i + 1}
            </text>
            <text x={label.x} y={label.y + dy} textAnchor={anchor} fontSize="17" fontWeight="600" fill="currentColor">
              {stage.title}
            </text>
            <text
              x={label.x}
              y={label.y + dy + 20}
              textAnchor={anchor}
              fontSize="14"
              fill="currentColor"
              fillOpacity="0.6"
            >
              {stage.detail}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

export { STAGES as MONTH_STAGES };
