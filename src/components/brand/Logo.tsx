/**
 * Brightloop mark: an open loop (the billing cycle) with a marigold dot where
 * the next cycle starts.
 */
export function LogoMark({
  size = 28,
  tone = "light",
}: {
  size?: number;
  tone?: "light" | "dark";
}) {
  const ring = tone === "light" ? "#ffffff" : "#174f55";
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true">
      <path
        d="M27.2 11.4A12 12 0 1 1 20.6 4.9"
        fill="none"
        stroke={ring}
        strokeWidth="4"
        strokeLinecap="round"
      />
      <circle cx="25.6" cy="7.2" r="3.2" fill="#f2a93b" />
    </svg>
  );
}

export function Wordmark({ tone = "dark" }: { tone?: "light" | "dark" }) {
  return (
    <span className="flex items-center gap-2.5">
      <LogoMark tone={tone === "light" ? "light" : "dark"} />
      <span
        className={`font-display text-[19px] font-semibold tracking-tight ${
          tone === "light" ? "text-white" : "text-zinc-900 dark:text-white"
        }`}
      >
        Brightloop
      </span>
    </span>
  );
}
