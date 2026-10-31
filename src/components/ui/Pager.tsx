"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";

export default function Pager({
  page,
  pageSize,
  total,
  onPageChange,
  noun = "results",
}: {
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
  noun?: string;
}) {
  const lastPage = Math.max(1, Math.ceil(total / pageSize));
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(total, page * pageSize);

  return (
    <nav
      className="flex items-center justify-between gap-3 border-t border-zinc-200 px-4 py-3 text-[13px] text-zinc-600 dark:border-zinc-800 dark:text-zinc-400"
      aria-label="Pagination"
    >
      <p className="tabular">
        {from.toLocaleString("en-US")}–{to.toLocaleString("en-US")} of {total.toLocaleString("en-US")} {noun}
      </p>
      <div className="flex items-center gap-1">
        <button
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
          className="flex items-center gap-1 rounded-lg px-2.5 py-1.5 font-medium hover:bg-zinc-100 disabled:pointer-events-none disabled:opacity-40 dark:hover:bg-zinc-800"
        >
          <ChevronLeft className="h-4 w-4" />
          Previous
        </button>
        <span className="px-2 tabular">
          Page {page} of {lastPage}
        </span>
        <button
          onClick={() => onPageChange(page + 1)}
          disabled={page >= lastPage}
          className="flex items-center gap-1 rounded-lg px-2.5 py-1.5 font-medium hover:bg-zinc-100 disabled:pointer-events-none disabled:opacity-40 dark:hover:bg-zinc-800"
        >
          Next
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </nav>
  );
}
