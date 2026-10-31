import { prisma } from "@/lib/prisma";
import { InvoiceStatus, PaymentMethod } from "@prisma/client";
import { AppError } from "@/lib/errors";
import { fromCents, toCents } from "@/lib/money";

/**
 * Invoice lifecycle. Each action lists the statuses it may start from:
 *
 *   DRAFT --confirm--> CONFIRMED --pay (in full)--> PAID
 *     |                    |
 *     +------cancel--------+--> CANCELLED
 *
 * `send` (email the invoice / receipt) is allowed once confirmed and doesn't
 * change the status. Partial payments keep the invoice CONFIRMED until the
 * balance reaches zero.
 */
const ALLOWED_FROM = {
  confirm: [InvoiceStatus.DRAFT],
  send: [InvoiceStatus.CONFIRMED, InvoiceStatus.PAID],
  pay: [InvoiceStatus.CONFIRMED],
  cancel: [InvoiceStatus.DRAFT, InvoiceStatus.CONFIRMED],
} as const satisfies Record<string, readonly InvoiceStatus[]>;

export type InvoiceAction = keyof typeof ALLOWED_FROM;

export const INVOICE_ACTIONS = Object.keys(ALLOWED_FROM) as InvoiceAction[];

export function isInvoiceAction(value: unknown): value is InvoiceAction {
  return typeof value === "string" && value in ALLOWED_FROM;
}

const INVOICE_RESULT_INCLUDE = { customer: true, lines: true, payments: true } as const;

export async function transitionInvoice(
  invoiceId: string,
  action: InvoiceAction,
  options?: {
    paymentMethod?: PaymentMethod | string;
    paymentAmount?: number;
    paymentNote?: string;
  }
) {
  const result = await prisma.$transaction(async (tx) => {
    const invoice = await tx.invoice.findUnique({
      where: { id: invoiceId },
      include: { payments: true },
    });
    if (!invoice) throw new AppError("Invoice not found", 404);

    const allowed: readonly InvoiceStatus[] = ALLOWED_FROM[action];
    if (!allowed.includes(invoice.status)) {
      throw new AppError(
        `Cannot ${action} an invoice that is ${invoice.status}. Allowed from: ${allowed.join(", ")}`,
        409
      );
    }

    const paidCents = invoice.payments.reduce((sum, p) => sum + toCents(p.amount), 0);

    switch (action) {
      case "confirm":
        return tx.invoice.update({
          where: { id: invoiceId },
          data: { status: InvoiceStatus.CONFIRMED },
          include: INVOICE_RESULT_INCLUDE,
        });

      case "cancel":
        if (paidCents > 0) {
          throw new AppError(
            "This invoice has payments recorded. Refund them before cancelling it.",
            409
          );
        }
        return tx.invoice.update({
          where: { id: invoiceId },
          data: { status: InvoiceStatus.CANCELLED },
          include: INVOICE_RESULT_INCLUDE,
        });

      case "send":
        return tx.invoice.update({
          where: { id: invoiceId },
          data: { sentAt: new Date() },
          include: INVOICE_RESULT_INCLUDE,
        });

      case "pay": {
        const balanceCents = toCents(invoice.totalAmount) - paidCents;
        const amountCents =
          options?.paymentAmount === undefined ? balanceCents : toCents(options.paymentAmount);

        if (!Number.isFinite(amountCents) || amountCents <= 0) {
          throw new AppError("Payment amount must be greater than zero");
        }
        if (amountCents > balanceCents) {
          throw new AppError(
            `Payment of ${fromCents(amountCents).toFixed(2)} is more than the balance due of ${fromCents(
              balanceCents
            ).toFixed(2)}`
          );
        }

        const method = options?.paymentMethod ?? PaymentMethod.BANK_TRANSFER;
        if (!Object.values(PaymentMethod).includes(method as PaymentMethod)) {
          throw new AppError(
            `Invalid payment method. Use one of: ${Object.values(PaymentMethod).join(", ")}`
          );
        }

        await tx.payment.create({
          data: {
            invoiceId,
            method: method as PaymentMethod,
            amount: fromCents(amountCents),
            note: options?.paymentNote || "Direct settlement",
            paymentDate: new Date(),
          },
        });

<<<<<<< HEAD
        // Compute total payments using SQL aggregate
        const paymentSumAgg = await tx.payment.aggregate({
          where: { invoiceId },
          _sum: { amount: true },
        });

        const totalPaid = Number((paymentSumAgg._sum.amount || 0).toFixed(2));
        const invoiceTotal = Number(invoice.totalAmount.toFixed(2));
        const newStatus = totalPaid >= invoiceTotal ? InvoiceStatus.PAID : InvoiceStatus.CONFIRMED;

        // Update invoice status based on payment total
        const updatedInvoice = await tx.invoice.update({
          where: { id: invoiceId },
          data: {
            status: newStatus,
          },
          include: { customer: true, lines: true, payments: true },
=======
        const fullyPaid = paidCents + amountCents >= toCents(invoice.totalAmount);
        return tx.invoice.update({
          where: { id: invoiceId },
          data: { status: fullyPaid ? InvoiceStatus.PAID : InvoiceStatus.CONFIRMED },
          include: INVOICE_RESULT_INCLUDE,
>>>>>>> 904d2ec375d6a3500b2b79c0196455cd5a68ab46
        });
      }
    }
  });

  if (action === "send") {
    console.log(
      `✉️ [INVOICE SENT] Invoice ${result.invoiceNumber} delivered to ${result.customer.email} (Total: $${result.totalAmount})`
    );
  }

  return result;
}
