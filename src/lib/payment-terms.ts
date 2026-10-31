import { AppError } from "@/lib/errors";

/**
 * Payment terms are stored as text: "Immediate" or "Net <days>" (Net 7,
 * Net 15, Net 30, Net 45, ...). Anything else is rejected when a subscription
 * is created, so billing never has to guess.
 */
const NET_TERMS = /^net\s*(\d{1,3})$/i;

export function paymentTermsToDays(terms: string): number {
  const trimmed = terms.trim();
  if (/^immediate$/i.test(trimmed)) return 0;
  const match = NET_TERMS.exec(trimmed);
  if (match) return Number(match[1]);
  throw new AppError(`Unsupported payment terms '${terms}'. Use 'Immediate' or 'Net <days>'.`);
}

/** Validates and normalises payment terms from user input. */
export function normalizePaymentTerms(terms: unknown, fallback = "Net 15"): string {
  if (terms === undefined || terms === null || terms === "") return fallback;
  if (typeof terms !== "string") throw new AppError("paymentTerms must be a string");
  const days = paymentTermsToDays(terms);
  return days === 0 ? "Immediate" : `Net ${days}`;
}
