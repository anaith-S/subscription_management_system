import { prisma } from "@/lib/prisma";
import { InvoiceStatus, PaymentMethod } from "@prisma/client";

/**
 * Handles invoice state transitions: confirm, cancel, send, pay.
 */
export async function transitionInvoice(
  invoiceId: string,
  action: "confirm" | "cancel" | "send" | "pay",
  options?: {
    paymentMethod?: PaymentMethod;
    paymentAmount?: number;
    paymentNote?: string;
  }
) {
  const invoice = await prisma.invoice.findUnique({
    where: { id: invoiceId },
    include: { customer: true, payments: true },
  });

  if (!invoice) {
    throw new Error("Invoice not found");
  }

  switch (action) {
    case "confirm": {
      if (invoice.status !== InvoiceStatus.DRAFT) {
        throw new Error(`Only DRAFT invoices can be confirmed. Current status: ${invoice.status}`);
      }
      return await prisma.invoice.update({
        where: { id: invoiceId },
        data: { status: InvoiceStatus.CONFIRMED },
        include: { customer: true, lines: true, payments: true },
      });
    }

    case "cancel": {
      if (invoice.status === InvoiceStatus.PAID) {
        throw new Error("Cannot cancel an already PAID invoice.");
      }
      return await prisma.invoice.update({
        where: { id: invoiceId },
        data: { status: InvoiceStatus.CANCELLED },
        include: { customer: true, lines: true, payments: true },
      });
    }

    case "send": {
      // Record sent timestamp and simulation log
      const sentInvoice = await prisma.invoice.update({
        where: { id: invoiceId },
        data: {
          sentAt: new Date(),
        },
        include: { customer: true, lines: true, payments: true },
      });

      console.log(
        `✉️ [INVOICE SENT] Invoice ${sentInvoice.invoiceNumber} delivered to ${sentInvoice.customer.email} (Total: $${sentInvoice.totalAmount})`
      );

      return sentInvoice;
    }

    case "pay": {
      if (invoice.status === InvoiceStatus.CANCELLED) {
        throw new Error("Cannot pay a CANCELLED invoice.");
      }

      const paymentAmount = options?.paymentAmount ?? invoice.totalAmount;
      const paymentMethod = options?.paymentMethod ?? PaymentMethod.BANK_TRANSFER;
      const paymentNote = options?.paymentNote ?? "Direct settlement";

      return await prisma.$transaction(async (tx) => {
        // Record payment
        await tx.payment.create({
          data: {
            invoiceId,
            method: paymentMethod,
            amount: paymentAmount,
            note: paymentNote,
            paymentDate: new Date(),
          },
        });

        // Update invoice to PAID
        const updatedInvoice = await tx.invoice.update({
          where: { id: invoiceId },
          data: {
            status: InvoiceStatus.PAID,
          },
          include: { customer: true, lines: true, payments: true },
        });

        return updatedInvoice;
      });
    }

    default:
      throw new Error(`Unsupported invoice action: ${action}`);
  }
}
