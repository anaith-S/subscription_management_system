/**
 * Reads ?page=&pageSize= from a list request. Lists are always paginated so a
 * page stays fast with thousands of rows.
 */
export function parsePagination(searchParams: URLSearchParams, defaults = { pageSize: 25, max: 100 }) {
  const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10) || 1);
  const requested = parseInt(searchParams.get("pageSize") || searchParams.get("page_size") || "", 10);
  const pageSize = Math.min(defaults.max, Math.max(1, requested || defaults.pageSize));
  return { page, pageSize, skip: (page - 1) * pageSize, take: pageSize };
}

/** Trimmed search text from ?q=, or undefined. */
export function parseSearch(searchParams: URLSearchParams): string | undefined {
  const q = searchParams.get("q")?.trim();
  return q ? q.slice(0, 100) : undefined;
}
