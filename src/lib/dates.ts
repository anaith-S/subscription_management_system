/**
 * Date helpers for billing. Everything works in UTC so a billing period means
 * the same thing whether the server runs in IST locally or UTC on a host.
 */

const DAY_MS = 24 * 60 * 60 * 1000;

export function startOfUtcDay(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

export function endOfUtcDay(date: Date): Date {
  return new Date(startOfUtcDay(date).getTime() + DAY_MS - 1);
}

export function addUtcDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * DAY_MS);
}

function daysInUtcMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
}

/**
 * Adds calendar months without overflowing into the next month.
 *
 * Plain `setMonth(+1)` turns Jan 31 into Mar 3. Here the day is clamped to the
 * end of the target month, and `anchorDay` (the subscription's original
 * billing day) is restored when a later month is long enough:
 * Jan 31 -> Feb 28 -> Mar 31 -> Apr 30.
 */
export function addUtcMonths(date: Date, months: number, anchorDay = date.getUTCDate()): Date {
  const monthIndex = date.getUTCMonth() + months;
  const year = date.getUTCFullYear() + Math.floor(monthIndex / 12);
  const month = ((monthIndex % 12) + 12) % 12;
  const day = Math.min(anchorDay, daysInUtcMonth(year, month));

  return new Date(
    Date.UTC(
      year,
      month,
      day,
      date.getUTCHours(),
      date.getUTCMinutes(),
      date.getUTCSeconds(),
      date.getUTCMilliseconds()
    )
  );
}
