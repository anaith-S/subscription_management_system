import { Prisma, PrismaClient } from "@prisma/client";

type Db = Prisma.TransactionClient | PrismaClient;

const PREFIXES = {
  INVOICE: "INV",
  SUBSCRIPTION: "SUB",
} as const;

export type SequenceName = keyof typeof PREFIXES;

function trailingNumber(value: string): number {
  const match = /(\d+)$/.exec(value);
  return match ? Number(match[1]) : 0;
}

async function highestExistingNumber(db: Db, name: SequenceName): Promise<number> {
  const values =
    name === "INVOICE"
      ? (await db.invoice.findMany({ select: { invoiceNumber: true } })).map((r) => r.invoiceNumber)
      : (await db.subscription.findMany({ select: { subscriptionNumber: true } })).map(
          (r) => r.subscriptionNumber
        );
  return values.reduce((max, value) => Math.max(max, trailingNumber(value)), 0);
}

/**
 * Reserves the next document number (INV-0001, SUB-0001, ...).
 *
 * The counter lives in its own row and is bumped with an atomic increment, so
 * two requests at the same moment can't get the same number, and deleting a
 * record never makes a number come back. Call it inside the same transaction
 * that inserts the record so a failed insert doesn't burn a number.
 */
export async function nextDocumentNumber(db: Db, name: SequenceName): Promise<string> {
  const counter = await db.sequence.findUnique({ where: { name } });

  let value: number;
  if (counter) {
    value = (await db.sequence.update({ where: { name }, data: { value: { increment: 1 } } })).value;
  } else {
    // First use: continue after any numbers that already exist (e.g. seed data).
    const start = (await highestExistingNumber(db, name)) + 1;
    value = (
      await db.sequence.upsert({
        where: { name },
        create: { name, value: start },
        update: { value: { increment: 1 } },
      })
    ).value;
  }

  return `${PREFIXES[name]}-${String(value).padStart(4, "0")}`;
}
