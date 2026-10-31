/**
 * Money helpers.
 *
 * Amounts are stored as Float columns, but every calculation is done in
 * integer cents and only converted back at the edge. That keeps totals exact
 * (no 0.30000000000000004) without changing the database schema or the JSON
 * shape the frontend already reads.
 */

export function toCents(amount: number): number {
  // toFixed first so values like 1.005 (really 1.00499999...) round correctly.
  return Math.round(Number((amount * 100).toFixed(4)));
}

export function fromCents(cents: number): number {
  return cents / 100;
}

/** `percent`% of an amount in cents, rounded to the nearest cent. */
export function percentOf(cents: number, percent: number): number {
  return Math.round((cents * percent) / 100);
}

/**
 * Splits `totalCents` across items in proportion to `weights`.
 * The parts always add up to exactly `totalCents` (largest-remainder method).
 */
export function allocate(totalCents: number, weights: number[]): number[] {
  const weightSum = weights.reduce((sum, w) => sum + w, 0);
  if (weightSum <= 0 || totalCents === 0) return weights.map(() => 0);

  const exact = weights.map((w) => (totalCents * w) / weightSum);
  const parts = exact.map(Math.floor);
  let remainder = totalCents - parts.reduce((sum, p) => sum + p, 0);

  const byFraction = exact
    .map((value, index) => ({ index, fraction: value - Math.floor(value) }))
    .sort((a, b) => b.fraction - a.fraction);

  for (const { index } of byFraction) {
    if (remainder <= 0) break;
    parts[index] += 1;
    remainder -= 1;
  }
  return parts;
}
