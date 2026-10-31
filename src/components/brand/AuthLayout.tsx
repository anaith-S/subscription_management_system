import Link from "next/link";
import { Wordmark } from "@/components/brand/Logo";

/**
 * Split layout for sign-in, sign-up and password pages: the brand panel on
 * the left (hidden on small screens), the form on the right.
 */
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-screen bg-white dark:bg-zinc-950 lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
      <aside className="relative hidden overflow-hidden bg-deep p-12 text-white lg:flex lg:flex-col">
        <Link href="/" aria-label="Brightloop home">
          <Wordmark tone="light" />
        </Link>

        <div className="mt-auto max-w-[420px]">
          <p className="font-display text-[40px] font-semibold leading-[1.05] tracking-tight">
            Every renewal, invoice and payment, on time.
          </p>
          <p className="mt-5 text-[16px] leading-relaxed text-white/65">
            Customers see their own subscriptions and invoices. The team runs billing day, records payments and chases
            what&apos;s overdue.
          </p>
        </div>

        {/* The loop, cropped off the corner of the panel */}
        <svg
          className="pointer-events-none absolute -right-40 -top-40 h-[520px] w-[520px] text-white/10"
          viewBox="0 0 100 100"
          aria-hidden="true"
        >
          <path d="M84 30A40 40 0 1 1 64 13" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
          <circle cx="78" cy="20" r="3.2" fill="#f2a93b" />
        </svg>
      </aside>

      <main className="flex flex-col px-5 py-8 sm:px-10">
        <div className="lg:hidden">
          <Link href="/" aria-label="Brightloop home">
            <Wordmark />
          </Link>
        </div>
        <div className="mx-auto flex w-full max-w-[400px] flex-1 flex-col justify-center py-10">{children}</div>
      </main>
    </div>
  );
}
