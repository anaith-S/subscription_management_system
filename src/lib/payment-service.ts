import { prisma } from "@/lib/prisma";
import { InvoiceStatus, PaymentMethod, SubscriptionStatus } from "@prisma/client";
import { AuthenticatedUser } from "@/lib/deps";
import { AppError } from "@/lib/errors";
import { fromCents, toCents } from "@/lib/money";

export interface RecordPaymentInput {
  invoiceId: string;
  method?: string | PaymentMethod;
  amount: number;
  paymentDate?: string | Date;
  note?: string;
  createdBy?: string;
  user?: AuthenticatedUser | { id: string; role: string; name?: string } | null;
}

export interface PaymentListFilters {
  invoiceId?: string;
  method?: string;
  startDate?: string | Date;
  endDate?: string | Date;
  customerId?: string;
  user?: AuthenticatedUser | { id: string; role: string } | null;
  page?: number;
  pageSize?: number;
}

export interface InvoicePaymentViewsFilters {
  type?: "paid" | "outstanding" | "all";
  customerId?: string;
  user?: AuthenticatedUser | { id: string; role: string } | null;
  page?: number;
  pageSize?: number;
}

export interface OverdueInvoicesFilters {
  today?: string | Date;
  customerId?: string;
  user?: AuthenticatedUser | { id: string; role: string } | null;
  page?: number;
  pageSize?: number;
}

export interface ReportsSummaryFilters {
  startDate?: string | Date;
  endDate?: string | Date;
  customerId?: string;
  subscriptionStatus?: string;
  user?: AuthenticatedUser | { id: string; role: string } | null;
}

/**
 * Normalize payment method string into PaymentMethod enum
 */
export function normalizePaymentMethod(method?: string | PaymentMethod): PaymentMethod {
  if (!method) return PaymentMethod.BANK_TRANSFER;
  const upper = String(method).toUpperCase().trim();
  if (upper === "CASH") return PaymentMethod.CASH;
  if (upper === "CARD" || upper === "CREDIT_CARD" || upper === "CREDITCARD") return PaymentMethod.CREDIT_CARD;
  if (upper === "BANK" || upper === "BANK_TRANSFER" || upper === "WIRE") return PaymentMethod.BANK_TRANSFER;
  return PaymentMethod.OTHER;
}

/**
 * POST /payments: Records a payment against an invoice.
 * - Rejects payments on CANCELLED invoices.
 * - After saving, if the sum of payments is at least the invoice total, sets invoice to PAID.
 * - Partial payments keep invoice CONFIRMED, returning the outstanding balance.
 */
export async function recordPayment(input: RecordPaymentInput) {
  const { invoiceId, method, amount, paymentDate, note, createdBy, user } = input;

  if (!invoiceId) {
    throw new AppError("invoiceId is required to record a payment");
  }

  const amountCents = toCents(Number(amount));
  if (!Number.isFinite(amountCents) || amountCents <= 0) {
    throw new AppError("Payment amount must be greater than zero");
  }

  const effectiveDate = paymentDate ? new Date(paymentDate) : new Date();
  if (Number.isNaN(effectiveDate.getTime())) {
    throw new AppError("paymentDate is not a valid date");
  }
  const effectiveMethod = normalizePaymentMethod(method);

  // Read, validate and write in one transaction so two payments at once can't
  // both pass the balance check.
  return await prisma.$transaction(async (tx) => {
    const invoice = await tx.invoice.findUnique({
      where: { id: invoiceId },
      include: { payments: { select: { amount: true } } },
    });
    if (!invoice) {
      throw new AppError("Invoice not found", 404);
    }

    // Customer role permission check: customers can only pay their own invoices
    if (user && user.role === "CUSTOMER" && invoice.customerId !== user.id) {
      throw new AppError("Forbidden: You cannot record payments against another customer's invoice", 403);
    }

    // Same rule as the invoice "pay" action: only CONFIRMED invoices take payments.
    if (invoice.status !== InvoiceStatus.CONFIRMED) {
      throw new AppError(
        `Payments can only be recorded on CONFIRMED invoices. This invoice is ${invoice.status}.`,
        409
      );
    }

    const totalCents = toCents(invoice.totalAmount);
    const paidCents = invoice.payments.reduce((sum, p) => sum + toCents(p.amount), 0);
    const balanceCents = totalCents - paidCents;
    if (amountCents > balanceCents) {
      throw new AppError(
        `Payment of ${fromCents(amountCents).toFixed(2)} is more than the balance due of ${fromCents(balanceCents).toFixed(2)}`
      );
    }

    const payment = await tx.payment.create({
      data: {
        invoiceId,
        method: effectiveMethod,
        amount: fromCents(amountCents),
        paymentDate: effectiveDate,
        note: note ? note.trim() : null,
        createdBy: createdBy || user?.id || null,
      },
    });

    const newPaidCents = paidCents + amountCents;
    const updatedInvoice = await tx.invoice.update({
      where: { id: invoiceId },
      data: { status: newPaidCents >= totalCents ? InvoiceStatus.PAID : InvoiceStatus.CONFIRMED },
      include: {
        customer: { select: { id: true, name: true, email: true } },
      },
    });

    return {
      payment,
      invoice: {
        id: updatedInvoice.id,
        invoiceNumber: updatedInvoice.invoiceNumber,
        status: updatedInvoice.status,
        totalAmount: updatedInvoice.totalAmount,
        amountPaid: fromCents(newPaidCents),
        balanceDue: fromCents(totalCents - newPaidCents),
        customer: updatedInvoice.customer,
      },
    };
  });
}

/**
 * GET /payments: List with filters (invoice, method, date range) & pagination.
 * Customer role scoped automatically.
 */
export async function getPayments(filters: PaymentListFilters = {}) {
  const {
    invoiceId,
    method,
    startDate,
    endDate,
    customerId,
    user,
    page = 1,
    pageSize = 20,
  } = filters;

  const pageNum = Math.max(1, Number(page) || 1);
  const take = Math.min(100, Math.max(1, Number(pageSize) || 20));
  const skip = (pageNum - 1) * take;

  const where: any = {};

  if (invoiceId) {
    where.invoiceId = invoiceId;
  }

  if (method && method !== "ALL") {
    where.method = normalizePaymentMethod(method);
  }

  if (startDate || endDate) {
    where.paymentDate = {};
    if (startDate) where.paymentDate.gte = new Date(startDate);
    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      where.paymentDate.lte = end;
    }
  }

  // Scoping: If user is CUSTOMER, only show payments for their own invoices
  if (user && user.role === "CUSTOMER") {
    where.invoice = { customerId: user.id };
  } else if (customerId && customerId !== "ALL") {
    where.invoice = { customerId };
  }

  // Performance requirement: SQL aggregates & count + pagination
  const [total, sumResult, payments] = await Promise.all([
    prisma.payment.count({ where }),
    prisma.payment.aggregate({ where, _sum: { amount: true } }),
    prisma.payment.findMany({
      where,
      skip,
      take,
      orderBy: { paymentDate: "desc" },
      include: {
        invoice: {
          select: {
            id: true,
            invoiceNumber: true,
            totalAmount: true,
            status: true,
            dueDate: true,
            customer: { select: { id: true, name: true, email: true } },
          },
        },
      },
    }),
  ]);

  const totalAmount = Number((sumResult._sum.amount || 0).toFixed(2));

  return {
    payments,
    total,
    page: pageNum,
    pageSize: take,
    totalPages: Math.ceil(total / take) || 1,
    totalAmount,
  };
}

/**
 * Invoice payment views: paid versus outstanding lists, with amount_paid and balance_due per invoice.
 */
export async function getInvoicePaymentViews(filters: InvoicePaymentViewsFilters = {}) {
  const { type = "all", customerId, user, page = 1, pageSize = 20 } = filters;

  const pageNum = Math.max(1, Number(page) || 1);
  const take = Math.min(100, Math.max(1, Number(pageSize) || 20));
  const skip = (pageNum - 1) * take;

  const where: any = {};

  if (type === "paid") {
    where.status = InvoiceStatus.PAID;
  } else if (type === "outstanding") {
    where.status = { notIn: [InvoiceStatus.PAID, InvoiceStatus.CANCELLED] };
  }

  if (user && user.role === "CUSTOMER") {
    where.customerId = user.id;
  } else if (customerId && customerId !== "ALL") {
    where.customerId = customerId;
  }

  const [total, invoices] = await Promise.all([
    prisma.invoice.count({ where }),
    prisma.invoice.findMany({
      where,
      skip,
      take,
      orderBy: { createdAt: "desc" },
      include: {
        customer: { select: { id: true, name: true, email: true } },
        subscription: { select: { id: true, subscriptionNumber: true } },
        payments: {
          select: { id: true, amount: true, method: true, paymentDate: true, note: true },
        },
      },
    }),
  ]);

  // Transform with amount_paid and balance_due
  const invoicesWithBalances = invoices.map((inv) => {
    const amountPaid = Number(
      inv.payments.reduce((acc, p) => acc + p.amount, 0).toFixed(2)
    );
    const balanceDue = Math.max(0, Number((inv.totalAmount - amountPaid).toFixed(2)));
    return {
      id: inv.id,
      invoiceNumber: inv.invoiceNumber,
      status: inv.status,
      invoiceDate: inv.invoiceDate,
      dueDate: inv.dueDate,
      subtotal: inv.subtotal,
      taxAmount: inv.taxAmount,
      discountAmount: inv.discountAmount,
      totalAmount: inv.totalAmount,
      amountPaid,
      balanceDue,
      customer: inv.customer,
      subscription: inv.subscription,
      paymentsCount: inv.payments.length,
      payments: inv.payments,
    };
  });

  return {
    invoices: invoicesWithBalances,
    total,
    page: pageNum,
    pageSize: take,
    totalPages: Math.ceil(total / take) || 1,
  };
}

/**
 * Overdue query: invoices where due_date is before today and the status is not Paid or Cancelled.
 */
export async function getOverdueInvoices(filters: OverdueInvoicesFilters = {}) {
  const { today, customerId, user, page = 1, pageSize = 20 } = filters;

  const pageNum = Math.max(1, Number(page) || 1);
  const take = Math.min(100, Math.max(1, Number(pageSize) || 20));
  const skip = (pageNum - 1) * take;

  const referenceDate = today ? new Date(today) : new Date();

  const where: any = {
    dueDate: { lt: referenceDate },
    status: { notIn: [InvoiceStatus.PAID, InvoiceStatus.CANCELLED] },
  };

  if (user && user.role === "CUSTOMER") {
    where.customerId = user.id;
  } else if (customerId && customerId !== "ALL") {
    where.customerId = customerId;
  }

  const [total, overdueInvoices] = await Promise.all([
    prisma.invoice.count({ where }),
    prisma.invoice.findMany({
      where,
      skip,
      take,
      orderBy: { dueDate: "asc" }, // Most urgent overdue first
      include: {
        customer: { select: { id: true, name: true, email: true } },
        subscription: {
          select: {
            id: true,
            subscriptionNumber: true,
            plan: { select: { name: true } },
          },
        },
        payments: { select: { amount: true } },
      },
    }),
  ]);

  const items = overdueInvoices.map((inv) => {
    const amountPaid = Number(
      inv.payments.reduce((acc, p) => acc + p.amount, 0).toFixed(2)
    );
    const balanceDue = Math.max(0, Number((inv.totalAmount - amountPaid).toFixed(2)));
    const diffMs = referenceDate.getTime() - new Date(inv.dueDate).getTime();
    const daysOverdue = Math.max(1, Math.floor(diffMs / (1000 * 60 * 60 * 24)));

    return {
      id: inv.id,
      invoiceNumber: inv.invoiceNumber,
      status: inv.status,
      dueDate: inv.dueDate,
      invoiceDate: inv.invoiceDate,
      totalAmount: inv.totalAmount,
      amountPaid,
      balanceDue,
      daysOverdue,
      customer: inv.customer,
      subscription: inv.subscription,
    };
  });

  return {
    overdueInvoices: items,
    total,
    page: pageNum,
    pageSize: take,
    totalPages: Math.ceil(total / take) || 1,
    asOf: referenceDate.toISOString(),
  };
}

/**
 * GET /reports/summary: Returns active subscription count, revenue collected, total outstanding and overdue count.
 * Filters: date range, customer and subscription status.
 * Uses SQL aggregates (SUM, COUNT), satisfying the performance requirement.
 */
export async function getReportsSummary(filters: ReportsSummaryFilters = {}) {
  const { startDate, endDate, customerId, subscriptionStatus, user } = filters;

  const now = new Date();

  // 1. Customer Scoping
  const effectiveCustomerId =
    user && user.role === "CUSTOMER"
      ? user.id
      : customerId && customerId !== "ALL"
      ? customerId
      : undefined;

  // 2. Active Subscription Count (SQL COUNT aggregate)
  const subWhere: any = {};
  if (subscriptionStatus && subscriptionStatus !== "ALL") {
    subWhere.status = subscriptionStatus as SubscriptionStatus;
  } else {
    subWhere.status = SubscriptionStatus.ACTIVE;
  }
  if (effectiveCustomerId) {
    subWhere.customerId = effectiveCustomerId;
  }

  const activeSubscriptionsCount = await prisma.subscription.count({
    where: subWhere,
  });

  // 3. Revenue Collected (SQL SUM of payments within date range)
  const payWhere: any = {};
  if (startDate || endDate) {
    payWhere.paymentDate = {};
    if (startDate) payWhere.paymentDate.gte = new Date(startDate);
    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      payWhere.paymentDate.lte = end;
    }
  }
  if (effectiveCustomerId) {
    payWhere.invoice = { customerId: effectiveCustomerId };
  }

  const [revenueAgg, paymentCount] = await Promise.all([
    prisma.payment.aggregate({
      where: payWhere,
      _sum: { amount: true },
    }),
    prisma.payment.count({ where: payWhere }),
  ]);

  const revenueCollected = Number((revenueAgg._sum.amount || 0).toFixed(2));

  // 4. Total Outstanding (Unpaid invoices: totalAmount - partial payments)
  const unpaidInvWhere: any = {
    status: { notIn: [InvoiceStatus.PAID, InvoiceStatus.CANCELLED] },
  };
  if (startDate || endDate) {
    unpaidInvWhere.invoiceDate = {};
    if (startDate) unpaidInvWhere.invoiceDate.gte = new Date(startDate);
    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      unpaidInvWhere.invoiceDate.lte = end;
    }
  }
  if (effectiveCustomerId) {
    unpaidInvWhere.customerId = effectiveCustomerId;
  }

  const [unpaidInvoicesAgg, partialPaymentsAgg] = await Promise.all([
    prisma.invoice.aggregate({
      where: unpaidInvWhere,
      _sum: { totalAmount: true },
      _count: { id: true },
    }),
    prisma.payment.aggregate({
      where: { invoice: unpaidInvWhere },
      _sum: { amount: true },
    }),
  ]);

  const rawUnpaidTotal = unpaidInvoicesAgg._sum.totalAmount || 0;
  const partialPaidOnUnpaid = partialPaymentsAgg._sum.amount || 0;
  const totalOutstanding = Math.max(0, Number((rawUnpaidTotal - partialPaidOnUnpaid).toFixed(2)));
  const unpaidInvoicesCount = unpaidInvoicesAgg._count.id || 0;

  // 5. Overdue Count & Overdue Balance (SQL COUNT & SUM)
  const overdueWhere: any = {
    dueDate: { lt: now },
    status: { notIn: [InvoiceStatus.PAID, InvoiceStatus.CANCELLED] },
  };
  if (effectiveCustomerId) {
    overdueWhere.customerId = effectiveCustomerId;
  }

  const [overdueCount, overdueAgg, overduePaymentsAgg] = await Promise.all([
    prisma.invoice.count({ where: overdueWhere }),
    prisma.invoice.aggregate({
      where: overdueWhere,
      _sum: { totalAmount: true },
    }),
    prisma.payment.aggregate({
      where: { invoice: overdueWhere },
      _sum: { amount: true },
    }),
  ]);

  const overdueTotalDebt = Math.max(
    0,
    Number(((overdueAgg._sum.totalAmount || 0) - (overduePaymentsAgg._sum.amount || 0)).toFixed(2))
  );

  // 6. MRR (Monthly Recurring Revenue from Active Subscriptions)
  const mrrAgg = await prisma.subscriptionLine.aggregate({
    where: {
      subscription: {
        status: SubscriptionStatus.ACTIVE,
        ...(effectiveCustomerId ? { customerId: effectiveCustomerId } : {}),
      },
    },
    _sum: { amount: true },
  });
  const mrr = Number((mrrAgg._sum.amount || 0).toFixed(2));

  return {
    active_subscriptions_count: activeSubscriptionsCount,
    activeSubscriptionsCount,
    revenue_collected: revenueCollected,
    revenueCollected,
    total_outstanding: totalOutstanding,
    totalOutstanding,
    overdue_count: overdueCount,
    overdueCount,
    overdue_amount: overdueTotalDebt,
    overdueAmount: overdueTotalDebt,
    unpaid_invoices_count: unpaidInvoicesCount,
    unpaidInvoicesCount,
    total_payments_count: paymentCount,
    totalPaymentsCount: paymentCount,
    mrr,
    filters_applied: {
      startDate: startDate || null,
      endDate: endDate || null,
      customerId: effectiveCustomerId || null,
      subscriptionStatus: subscriptionStatus || null,
    },
    generated_at: now.toISOString(),
  };
}
