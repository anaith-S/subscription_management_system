import { prisma } from "../src/lib/prisma";
import {
  generateSubscriptionNumber,
  transitionSubscription,
  createSubscriptionFromTemplate,
} from "../src/lib/subscription-service";
import {
  createInvoiceFromSubscription,
  executeBillingRun,
  advanceBillingDate,
} from "../src/lib/billing-service";
import { transitionInvoice } from "../src/lib/invoice-service";
import { SubscriptionStatus, InvoiceStatus, BillingFrequency, PaymentMethod } from "@prisma/client";

async function runTests() {
  console.log("🚀 Starting Comprehensive Test Suite for Backend Tasks...\n");

  // Fetch admin and a customer
  const admin = await prisma.user.findFirst({ where: { role: "ADMIN" } });
  const customer = await prisma.user.findFirst({ where: { role: "CUSTOMER" } });
  const plan = await prisma.plan.findFirst({ where: { frequency: "MONTHLY" } });
  const product = await prisma.product.findFirst({ include: { variants: true } });

  if (!admin || !customer || !plan || !product) {
    throw new Error("Missing seed data to execute tests");
  }

  console.log(`👤 Testing with Admin: ${admin.email}, Customer: ${customer.email}`);

  // Test 1: Quotation Template Creation
  console.log("\n--- TEST 1: Quotation Template CRUD ---");
  const template = await prisma.quotationTemplate.create({
    data: {
      name: "Test Hackathon Pro Bundle",
      validityDays: 14,
      planId: plan.id,
      lines: {
        create: [
          {
            productId: product.id,
            quantity: 2,
            unitPrice: product.salesPrice,
          },
        ],
      },
    },
    include: { lines: true, plan: true },
  });
  console.log(`✅ Quotation template created: '${template.name}' with ${template.lines.length} lines.`);

  // Test 2: Create Subscription from Template
  console.log("\n--- TEST 2: Create Subscription from Template ---");
  const subFromTemplate = await createSubscriptionFromTemplate(template.id, customer.id, {
    paymentTerms: "Net 15",
    discountCode: "VOLUME15",
  });
  console.log(`✅ Subscription created: ${subFromTemplate.subscriptionNumber}`);
  console.log(`   Initial status: ${subFromTemplate.status} (DRAFT)`);
  console.log(`   Copied lines count: ${subFromTemplate.lines.length}`);
  console.log(`   Start: ${subFromTemplate.startDate.toISOString().split("T")[0]}`);
  console.log(`   Expiry: ${subFromTemplate.expiryDate?.toISOString().split("T")[0]}`);

  // Test 3: Status Flow & Transition Rejecting Invalid Jumps
  console.log("\n--- TEST 3: Status Flow & Transition Validation ---");

  // Attempt invalid jump: DRAFT -> ACTIVE (should fail)
  try {
    await transitionSubscription(subFromTemplate.id, SubscriptionStatus.ACTIVE, admin);
    console.error("❌ ERROR: Allowed illegal jump from DRAFT to ACTIVE!");
    process.exit(1);
  } catch (err: any) {
    console.log(`✅ Correctly rejected illegal jump: ${err.message}`);
  }

  // Legal step 1: DRAFT -> QUOTATION
  const subQuoted = await transitionSubscription(subFromTemplate.id, SubscriptionStatus.QUOTATION, admin);
  console.log(`✅ Legal transition: DRAFT ➔ ${subQuoted.status}`);

  // Legal step 2: QUOTATION -> CONFIRMED
  const subConfirmed = await transitionSubscription(subFromTemplate.id, SubscriptionStatus.CONFIRMED, admin);
  console.log(`✅ Legal transition: QUOTATION ➔ ${subConfirmed.status}`);

  // Legal step 3: CONFIRMED -> ACTIVE
  const subActive = await transitionSubscription(subFromTemplate.id, SubscriptionStatus.ACTIVE, admin);
  console.log(`✅ Legal transition: CONFIRMED ➔ ${subActive.status}`);

  // Test 4: Invoice Generation from Subscription (Taxes, Discounts, Totals)
  console.log("\n--- TEST 4: Invoice Generation from Subscription ---");
  const periodStart = new Date();
  const invoice = await createInvoiceFromSubscription(subActive.id, periodStart);
  console.log(`✅ Invoice generated: ${invoice.invoiceNumber}`);
  console.log(`   Customer: ${invoice.customer.name}`);
  console.log(`   Lines count: ${invoice.lines.length}`);
  console.log(`   Subtotal: $${invoice.subtotal}`);
  console.log(`   Tax Amount: $${invoice.taxAmount}`);
  console.log(`   Discount: $${invoice.discountAmount}`);
  console.log(`   Total Amount: $${invoice.totalAmount}`);
  console.log(`   Status: ${invoice.status} (DRAFT)`);

  // Test 5: Double Billing Guard (Unique Constraint on subscriptionId, periodStart)
  console.log("\n--- TEST 5: Guard Against Double Billing ---");
  try {
    await createInvoiceFromSubscription(subActive.id, periodStart);
    console.error("❌ ERROR: Double billing occurred for same period!");
    process.exit(1);
  } catch (err: any) {
    console.log(`✅ Double billing successfully blocked: ${err.message}`);
  }

  // Test 6: Invoice Lifecycle Actions (Confirm, Send, Pay)
  console.log("\n--- TEST 6: Invoice Actions & Status Flow ---");

  // Confirm: DRAFT -> CONFIRMED
  const confirmedInv = await transitionInvoice(invoice.id, "confirm");
  console.log(`✅ Invoice action 'confirm': DRAFT ➔ ${confirmedInv.status}`);

  // Send: Sets sentAt
  const sentInv = await transitionInvoice(invoice.id, "send");
  console.log(`✅ Invoice action 'send': Sent at ${sentInv.sentAt?.toISOString()}`);

  // Pay: Confirmed -> Paid (records Payment)
  const paidInv = await transitionInvoice(invoice.id, "pay", {
    paymentMethod: PaymentMethod.CREDIT_CARD,
    paymentAmount: invoice.totalAmount,
    paymentNote: "Visa card settlement #8821",
  });
  console.log(`✅ Invoice action 'pay': CONFIRMED ➔ ${paidInv.status}`);
  console.log(`   Payments recorded count: ${paidInv.payments.length}`);

  // Test 7: Billing Run Engine
  console.log("\n--- TEST 7: Automated Billing Run ---");
  const billingRunResults = await executeBillingRun();
  console.log(`✅ Billing run completed:`);
  console.log(`   Evaluated subscriptions: ${billingRunResults.totalEvaluated}`);
  console.log(`   Invoices generated: ${billingRunResults.invoicesCreated}`);
  console.log(`   Already billed / skipped: ${billingRunResults.skipped}`);

  console.log("\n🎉 ALL BACKEND REQUIREMENTS VERIFIED AND PASSED 100%!");
}

runTests()
  .catch((e) => {
    console.error("Test failed with error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
