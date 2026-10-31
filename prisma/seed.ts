import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Starting High-Performance Database Seeding (2,000+ Records)...");

  const startTime = Date.now();

  // Clear existing data in reverse order of foreign keys
  await prisma.payment.deleteMany();
  await prisma.invoiceLine.deleteMany();
  await prisma.invoice.deleteMany();
  await prisma.subscriptionLine.deleteMany();
  await prisma.subscription.deleteMany();
  await prisma.quotationTemplateLine.deleteMany();
  await prisma.quotationTemplate.deleteMany();
  await prisma.productVariant.deleteMany();
  await prisma.discountRule.deleteMany();
  await prisma.taxRule.deleteMany();
  await prisma.product.deleteMany();
  await prisma.plan.deleteMany();
  await prisma.user.deleteMany();

  // 1. Create Core Role Accounts
  const passwordAdmin = await bcrypt.hash("Admin123!@#", 10);
  const passwordStaff = await bcrypt.hash("Staff123!@#", 10);
  const passwordCustomer = await bcrypt.hash("Customer123!@#", 10);

  const admin = await prisma.user.create({
    data: {
      email: "admin@brightloop.com",
      name: "Alice Vance (Admin)",
      passwordHash: passwordAdmin,
      role: "ADMIN",
    },
  });

  const staff = await prisma.user.create({
    data: {
      email: "staff@brightloop.com",
      name: "Bob Stone (Sales & Billing Staff)",
      passwordHash: passwordStaff,
      role: "STAFF",
    },
  });

  const demoCustomer1 = await prisma.user.create({
    data: {
      email: "customer@acme.com",
      name: "Acme Corp (Sarah Miller)",
      passwordHash: passwordCustomer,
      role: "CUSTOMER",
    },
  });

  const demoCustomer2 = await prisma.user.create({
    data: {
      email: "tech@globex.com",
      name: "Globex Industries",
      passwordHash: passwordCustomer,
      role: "CUSTOMER",
    },
  });

  // 2. Create Products & Variants
  const prodSoftware = await prisma.product.create({
    data: {
      name: "Brightloop Business Cloud",
      type: "Software",
      salesPrice: 400.0,
      costPrice: 150.0,
      notes: "Core SaaS subscription offering for business operations.",
      variants: {
        create: [
          { name: "Standard Edition", extraPrice: 0.0 },
          { name: "Odoo Brand Integration", extraPrice: 560.0 },
        ],
      },
    },
    include: { variants: true },
  });

  const prodAddon = await prisma.product.create({
    data: {
      name: "Extra User Seat",
      type: "Add-on",
      salesPrice: 45.0,
      costPrice: 10.0,
      notes: "Additional team seat with full platform access.",
    },
  });

  const prodStorage = await prisma.product.create({
    data: {
      name: "100GB Dedicated Storage",
      type: "Add-on",
      salesPrice: 25.0,
      costPrice: 5.0,
      notes: "Encrypted enterprise cloud backup storage.",
    },
  });

  // 3. Create Plans
  const planMonthly = await prisma.plan.create({
    data: {
      name: "Monthly Pro Plan",
      cost: 400.0,
      frequency: "MONTHLY",
      minQuantity: 1,
      autoClose: false,
      canCloseEarly: true,
      canPause: true,
      canRenew: true,
    },
  });

  const planYearly = await prisma.plan.create({
    data: {
      name: "Yearly Enterprise Contract",
      cost: 4200.0,
      frequency: "YEARLY",
      minQuantity: 1,
      autoClose: true,
      canCloseEarly: true,
      canPause: false,
      canRenew: true,
    },
  });

  const planDaily = await prisma.plan.create({
    data: {
      name: "Daily Developer Pass",
      cost: 20.0,
      frequency: "DAILY",
      minQuantity: 1,
      autoClose: true,
      canCloseEarly: true,
      canPause: true,
      canRenew: false,
    },
  });

  // 4. Create Taxes & Discounts
  await prisma.taxRule.createMany({
    data: [
      { name: "Standard VAT (10%)", ratePercentage: 10.0, isDefault: true },
      { name: "State Sales Tax (5%)", ratePercentage: 5.0, isDefault: false },
      { name: "Zero Tax (0%)", ratePercentage: 0.0, isDefault: false },
    ],
  });

  await prisma.discountRule.createMany({
    data: [
      {
        code: "VOLUME15",
        name: "Volume Seats Discount (15% Off)",
        type: "PERCENTAGE",
        value: 15.0,
        minQuantity: 5,
        usageLimit: 500,
        timesUsed: 12,
        targetType: "WHOLE_SUBSCRIPTION",
      },
      {
        code: "WELCOME50",
        name: "New Business Flat Discount ($50 Off)",
        type: "FIXED",
        value: 50.0,
        minPurchaseAmount: 200.0,
        usageLimit: 1000,
        timesUsed: 45,
        targetType: "WHOLE_SUBSCRIPTION",
      },
    ],
  });

  console.log("✅ Seeded core reference catalog and admin/staff users.");

  // 5. Batch Seed 2,000+ Customers
  console.log("🚀 Generating 2,000+ customers...");
  const TOTAL_CUSTOMERS = 2100;
  const customerData: any[] = [];
  const companyPrefixes = [
    "Nexus", "Apex", "Horizon", "Quantum", "Vertex", "Pulse", "Stratosphere",
    "Omni", "Solaris", "Velocity", "Aegis", "Synergy", "Beacon", "Pinnacle"
  ];
  const companySuffixes = ["Labs", "Technologies", "Solutions", "Ventures", "Digital", "Consulting", "Group"];

  for (let i = 1; i <= TOTAL_CUSTOMERS; i++) {
    const prefix = companyPrefixes[i % companyPrefixes.length];
    const suffix = companySuffixes[i % companySuffixes.length];
    customerData.push({
      email: `client.${i}@${prefix.toLowerCase()}${suffix.toLowerCase()}.io`,
      name: `${prefix} ${suffix} #${i}`,
      passwordHash: passwordCustomer,
      role: "CUSTOMER",
    });
  }

  // Insert in batches of 500 for optimal SQLite transaction throughput
  for (let i = 0; i < customerData.length; i += 500) {
    const chunk = customerData.slice(i, i + 500);
    await prisma.user.createMany({ data: chunk });
  }

  const seededCustomers = await prisma.user.findMany({
    where: { role: "CUSTOMER" },
    select: { id: true, email: true, name: true },
    take: TOTAL_CUSTOMERS,
  });

  console.log(`✅ Successfully seeded ${seededCustomers.length} customer accounts.`);

  // 6. Generate 2,100 Subscriptions
  console.log("🚀 Generating 2,100 subscriptions across statuses...");
  const subData: any[] = [];
  const statuses = ["ACTIVE", "ACTIVE", "ACTIVE", "CONFIRMED", "QUOTATION", "PAUSED", "CLOSED", "DRAFT"];
  const plans = [planMonthly.id, planYearly.id, planDaily.id];

  const now = new Date();

  for (let i = 0; i < seededCustomers.length; i++) {
    const cust = seededCustomers[i];
    const status = statuses[i % statuses.length];
    const planId = plans[i % plans.length];
    const startDate = new Date(now.getTime() - (i % 60) * 24 * 60 * 60 * 1000);
    const nextBilling = new Date(now.getTime() + (i % 30 - 10) * 24 * 60 * 60 * 1000);

    subData.push({
      subscriptionNumber: `SUB-${2000 + i}`,
      customerId: cust.id,
      planId: planId,
      status: status,
      startDate: startDate,
      nextBillingDate: nextBilling,
      paymentTerms: i % 2 === 0 ? "Net 15" : "Immediate",
    });
  }

  for (let i = 0; i < subData.length; i += 500) {
    const chunk = subData.slice(i, i + 500);
    await prisma.subscription.createMany({ data: chunk });
  }

  const seededSubs = await prisma.subscription.findMany({
    select: { id: true, customerId: true, status: true, subscriptionNumber: true },
    take: 2200,
  });

  // Seed subscription lines
  const subLinesData: any[] = [];
  for (let i = 0; i < seededSubs.length; i++) {
    const sub = seededSubs[i];
    const qty = 1 + (i % 5);
    const price = i % 2 === 0 ? 400.0 : 45.0;
    subLinesData.push({
      subscriptionId: sub.id,
      productId: i % 2 === 0 ? prodSoftware.id : prodAddon.id,
      quantity: qty,
      unitPrice: price,
      taxRate: 10.0,
      amount: qty * price,
    });
  }

  for (let i = 0; i < subLinesData.length; i += 500) {
    await prisma.subscriptionLine.createMany({ data: subLinesData.slice(i, i + 500) });
  }

  console.log(`✅ Seeded ${seededSubs.length} subscriptions and subscription line items.`);

  // 7. Generate 2,200 Invoices (including Overdue past due dates)
  console.log("🚀 Generating 2,200 invoices (including overdue debt)...");
  const invoiceData: any[] = [];
  const invStatuses = ["PAID", "PAID", "CONFIRMED", "CONFIRMED", "DRAFT", "CANCELLED"];

  for (let i = 0; i < seededSubs.length; i++) {
    const sub = seededSubs[i];
    const status = invStatuses[i % invStatuses.length];

    // For overdue scenarios: make dueDate in the past (1 to 45 days ago)
    const isOverdueTarget = (i % 4 === 0 && status !== "PAID" && status !== "CANCELLED");
    const daysPast = isOverdueTarget ? (i % 40) + 1 : -(i % 25 + 5);
    const dueDate = new Date(now.getTime() - daysPast * 24 * 60 * 60 * 1000);
    const invoiceDate = new Date(dueDate.getTime() - 15 * 24 * 60 * 60 * 1000);

    const subtotal = 400.0 + (i % 3) * 45.0;
    const tax = Number((subtotal * 0.1).toFixed(2));
    const total = Number((subtotal + tax).toFixed(2));

    invoiceData.push({
      invoiceNumber: `INV-${3000 + i}`,
      customerId: sub.customerId,
      subscriptionId: sub.id,
      status: status,
      invoiceDate: invoiceDate,
      dueDate: dueDate,
      subtotal: subtotal,
      taxAmount: tax,
      discountAmount: 0.0,
      totalAmount: total,
      notes: isOverdueTarget ? "Past due - follow up required" : "Regular recurring invoice",
    });
  }

  for (let i = 0; i < invoiceData.length; i += 500) {
    await prisma.invoice.createMany({ data: invoiceData.slice(i, i + 500) });
  }

  const seededInvoices = await prisma.invoice.findMany({
    select: { id: true, invoiceNumber: true, status: true, totalAmount: true },
    take: 2500,
  });

  // 8. Generate 2,000+ Payments (Bank Transfers, Cards, Cash)
  console.log("🚀 Generating 2,000+ payments (full settlements and partial payments)...");
  const paymentData: any[] = [];
  const paymentMethods = ["BANK_TRANSFER", "CREDIT_CARD", "CASH", "OTHER"];

  for (let i = 0; i < seededInvoices.length; i++) {
    const inv = seededInvoices[i];

    if (inv.status === "PAID") {
      // Full payment settlement
      paymentData.push({
        invoiceId: inv.id,
        method: paymentMethods[i % paymentMethods.length],
        amount: inv.totalAmount,
        paymentDate: new Date(now.getTime() - (i % 30) * 24 * 60 * 60 * 1000),
        note: `Wire transfer confirmation #TX-${90000 + i}`,
        createdBy: staff.id,
      });
    } else if (inv.status === "CONFIRMED" && i % 3 === 0) {
      // Partial payment
      const partial = Number((inv.totalAmount * 0.5).toFixed(2));
      paymentData.push({
        invoiceId: inv.id,
        method: paymentMethods[i % paymentMethods.length],
        amount: partial,
        paymentDate: new Date(now.getTime() - (i % 15) * 24 * 60 * 60 * 1000),
        note: `50% deposit received #DEP-${80000 + i}`,
        createdBy: staff.id,
      });
    }
  }

  // Ensure at least 2,000+ payments
  while (paymentData.length < 2050) {
    const idx = paymentData.length % seededInvoices.length;
    const inv = seededInvoices[idx];
    paymentData.push({
      invoiceId: inv.id,
      method: paymentMethods[paymentData.length % paymentMethods.length],
      amount: 45.0,
      paymentDate: new Date(now.getTime() - (paymentData.length % 60) * 24 * 60 * 60 * 1000),
      note: `Seat adjustment settlement #${paymentData.length}`,
      createdBy: admin.id,
    });
  }

  for (let i = 0; i < paymentData.length; i += 500) {
    await prisma.payment.createMany({ data: paymentData.slice(i, i + 500) });
  }

  const paymentCount = await prisma.payment.count();
  const invoiceCount = await prisma.invoice.count();
  const subCount = await prisma.subscription.count();
  const userCount = await prisma.user.count();

  const totalDuration = ((Date.now() - startTime) / 1000).toFixed(2);

  console.log("\n========================================================");
  console.log("🎉 DATABASE SEEDING COMPLETED SUCCESSFULLY!");
  console.log("========================================================");
  console.log(`👤 Users / Customers:    ${userCount.toLocaleString()}`);
  console.log(`📋 Subscriptions:       ${subCount.toLocaleString()}`);
  console.log(`🧾 Invoices:            ${invoiceCount.toLocaleString()}`);
  console.log(`💳 Payments Processed:   ${paymentCount.toLocaleString()}`);
  console.log(`⏱️ Total Seeding Time:    ${totalDuration} seconds`);
  console.log("========================================================\n");
}

main()
  .catch((e) => {
    console.error("Error during database seed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
