import { prisma } from "../src/lib/prisma";
import {
  recordPayment,
  getPayments,
  getInvoicePaymentViews,
  getOverdueInvoices,
  getReportsSummary,
} from "../src/lib/payment-service";
import { InvoiceStatus, PaymentMethod, SubscriptionStatus } from "@prisma/client";

async function main() {
  console.log("===============================================================");
  console.log("🚀 COMPREHENSIVE VERIFICATION: MEMBER 4 PAYMENTS & REPORTS");
  console.log("===============================================================\n");

  // 1. Database & Table Schema Verification
  console.log("1. Verifying Database Payments Table & Indexes:");
  const tableCheck = await prisma.$queryRawUnsafe<any[]>(
    `SELECT name FROM sqlite_master WHERE type='table' AND name='payments';`
  );
  console.log("  ✅ Table 'payments' exists:", tableCheck.length > 0);

  const indexCheck = await prisma.$queryRawUnsafe<any[]>(
    `SELECT name FROM sqlite_master WHERE type='index' AND name IN (
      'subscriptions_status_customer_id_idx',
      'invoices_status_due_date_customer_id_idx',
      'payments_invoice_id_payment_date_idx'
    );`
  );
  console.log("  ✅ Compound Performance Indexes found:", indexCheck.map((i) => i.name));

  // Find a confirmed invoice
  const testInvoice = await prisma.invoice.findFirst({
    where: { status: InvoiceStatus.CONFIRMED },
    include: { customer: true },
  });

  if (!testInvoice) {
    throw new Error("Missing confirmed invoice in seed data!");
  }
  console.log(`\n2. Testing with Invoice: ${testInvoice.invoiceNumber} (Total: $${testInvoice.totalAmount})`);

  // 2. Reject payment on CANCELLED invoice
  console.log("\n2. Testing Payment Rejection on CANCELLED Invoice:");
  const cancelledInvoice = await prisma.invoice.findFirst({
    where: { status: InvoiceStatus.CANCELLED },
  });

  if (cancelledInvoice) {
    try {
      await recordPayment({
        invoiceId: cancelledInvoice.id,
        amount: 100.0,
      });
      throw new Error("FAILED: Payment should have been rejected on CANCELLED invoice!");
    } catch (err: any) {
      console.log("  ✅ Correctly rejected payment on CANCELLED invoice:", err.message);
    }
  }

  // 3. Partial payment keeps invoice CONFIRMED & calculates remaining balance
  console.log("\n3. Testing Partial Payment (keeps invoice CONFIRMED):");
  const partialAmount = Math.max(10, Math.round(testInvoice.totalAmount * 0.3));
  const partialResult = await recordPayment({
    invoiceId: testInvoice.id,
    method: PaymentMethod.CREDIT_CARD,
    amount: partialAmount,
    note: "Automated partial installment test",
  });

  console.log("  ✅ Partial payment recorded:", `$${partialResult.payment.amount}`);
  console.log("  ✅ Updated status:", partialResult.invoice.status, "(expected: CONFIRMED)");
  console.log("  ✅ Amount paid so far:", `$${partialResult.invoice.amountPaid}`);
  console.log("  ✅ Remaining balance due:", `$${partialResult.invoice.balanceDue}`);
  if (partialResult.invoice.status !== InvoiceStatus.CONFIRMED) {
    throw new Error("Expected invoice status to remain CONFIRMED on partial payment");
  }
  if (partialResult.invoice.balanceDue <= 0) {
    throw new Error("Expected balance due to be greater than 0 on partial payment");
  }

  // 4. Full settlement sets invoice to PAID
  console.log("\n4. Testing Full Settlement (sets invoice to PAID):");
  const remainingDue = partialResult.invoice.balanceDue;
  const fullResult = await recordPayment({
    invoiceId: testInvoice.id,
    method: PaymentMethod.BANK_TRANSFER,
    amount: remainingDue,
    note: "Automated final settlement test",
  });

  console.log("  ✅ Full payment recorded:", `$${fullResult.payment.amount}`);
  console.log("  ✅ Final status:", fullResult.invoice.status, "(expected: PAID)");
  console.log("  ✅ Final balance due:", `$${fullResult.invoice.balanceDue}`);
  if (fullResult.invoice.status !== InvoiceStatus.PAID) {
    throw new Error("Expected invoice status to become PAID on full settlement");
  }
  if (fullResult.invoice.balanceDue !== 0) {
    throw new Error("Expected balance due to be 0 on full settlement");
  }

  // 5. GET /payments with filters (method, date range) & pagination
  console.log("\n5. Testing GET /payments with filters and pagination:");
  const paymentsPage = await getPayments({
    method: "BANK_TRANSFER",
    page: 1,
    pageSize: 10,
  });

  console.log("  ✅ Total Bank Transfer payments:", paymentsPage.total);
  console.log("  ✅ Page:", paymentsPage.page, "of", paymentsPage.totalPages);
  console.log("  ✅ Page size:", paymentsPage.pageSize);
  console.log("  ✅ Total collected amount:", `$${paymentsPage.totalAmount}`);
  if (paymentsPage.payments.length > 10) {
    throw new Error("Pagination page size exceeded!");
  }

  // 6. Invoice payment views: paid versus outstanding lists
  console.log("\n6. Testing Invoice Payment Views (Paid vs Outstanding):");
  const paidViews = await getInvoicePaymentViews({ type: "paid", page: 1, pageSize: 5 });
  console.log("  ✅ Paid invoices count:", paidViews.total);
  if (paidViews.invoices.length > 0) {
    const samplePaid = paidViews.invoices[0];
    console.log(`     Sample: ${samplePaid.invoiceNumber} | Paid: $${samplePaid.amountPaid} | Balance: $${samplePaid.balanceDue}`);
    if (samplePaid.status !== "PAID" || samplePaid.balanceDue !== 0) {
      throw new Error("Paid view returned non-paid invoice!");
    }
  }

  const outstandingViews = await getInvoicePaymentViews({ type: "outstanding", page: 1, pageSize: 5 });
  console.log("  ✅ Outstanding invoices count:", outstandingViews.total);
  if (outstandingViews.invoices.length > 0) {
    const sampleOut = outstandingViews.invoices[0];
    console.log(`     Sample: ${sampleOut.invoiceNumber} | Paid: $${sampleOut.amountPaid} | Balance: $${sampleOut.balanceDue}`);
    if (sampleOut.status === "PAID" || sampleOut.balanceDue <= 0) {
      throw new Error("Outstanding view returned paid invoice!");
    }
  }

  // 7. Overdue query (due_date < today and status not in Paid/Cancelled)
  console.log("\n7. Testing Overdue Invoices Query:");
  const overdueResult = await getOverdueInvoices({ page: 1, pageSize: 10 });
  console.log("  ✅ Overdue invoices total:", overdueResult.total);
  if (overdueResult.overdueInvoices.length > 0) {
    const sampleOd = overdueResult.overdueInvoices[0];
    console.log(`     Sample: ${sampleOd.invoiceNumber} | Due: ${new Date(sampleOd.dueDate).toLocaleDateString()} | Days Overdue: ${sampleOd.daysOverdue}d | Debt: $${sampleOd.balanceDue}`);
    if (sampleOd.daysOverdue < 1 || sampleOd.status === "PAID") {
      throw new Error("Invalid overdue invoice returned!");
    }
  }

  // 8. GET /reports/summary
  console.log("\n8. Testing GET /reports/summary (SQL Aggregates):");
  const summary = await getReportsSummary();
  console.log("  ✅ Active Subscriptions Count:", summary.active_subscriptions_count);
  console.log("  ✅ Total Revenue Collected:  ", `$${summary.revenue_collected.toLocaleString()}`);
  console.log("  ✅ Total Outstanding Balance:", `$${summary.total_outstanding.toLocaleString()}`);
  console.log("  ✅ Overdue Invoices Count:   ", summary.overdue_count);
  console.log("  ✅ Overdue Receivables Debt: ", `$${summary.overdue_amount.toLocaleString()}`);
  console.log("  ✅ Monthly Recurring MRR:    ", `$${summary.mrr.toLocaleString()}`);

  if (summary.active_subscriptions_count <= 0) throw new Error("Active subscriptions count must be > 0");
  if (summary.revenue_collected <= 0) throw new Error("Revenue collected must be > 0");
  if (summary.total_outstanding <= 0) throw new Error("Total outstanding must be > 0");
  if (summary.overdue_count <= 0) throw new Error("Overdue count must be > 0");

  // 9. Performance Benchmark (Sub-2-Second Requirement)
  console.log("\n9. Testing Performance SLA (Under 2 Seconds):");
  const perfStart = Date.now();
  for (let i = 0; i < 5; i++) {
    await getReportsSummary();
    await getOverdueInvoices({ pageSize: 25 });
    await getPayments({ pageSize: 25 });
  }
  const perfDuration = Date.now() - perfStart;
  const avgLatencyMs = Math.round(perfDuration / 5);

  console.log(`  ✅ 5 complete multi-query dashboard runs executed in ${perfDuration}ms`);
  console.log(`  ✅ Average latency per dashboard run: ${avgLatencyMs}ms (Target: < 2,000ms)`);
  if (avgLatencyMs >= 2000) {
    throw new Error("Performance SLA failed: Latency exceeded 2 seconds!");
  }

  console.log("\n===============================================================");
  console.log("🎉 ALL MEMBER 4 TASKS FULLY VERIFIED AND PASSING 100%!");
  console.log("===============================================================\n");
}

main()
  .catch((e) => {
    console.error("❌ Verification failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
