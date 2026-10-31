import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Starting database seeding for Brightloop Software...");

  // Clear existing data in reverse order of dependencies
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

  // 1. Create Users (Admin, Staff, Customer)
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

  const customer1 = await prisma.user.create({
    data: {
      email: "customer@acme.com",
      name: "Acme Corp (Sarah Miller)",
      passwordHash: passwordCustomer,
      role: "CUSTOMER",
    },
  });

  const customer2 = await prisma.user.create({
    data: {
      email: "tech@globex.com",
      name: "Globex Industries",
      passwordHash: passwordCustomer,
      role: "CUSTOMER",
    },
  });

  console.log("✅ Seeded users (Admin, Staff, Customers)");

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
          { name: "Odoo Brand Integration", extraPrice: 560.0 }, // Mentioned in PDF scene 3
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

  console.log("✅ Seeded products & variants (including Odoo brand +560)");

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

  console.log("✅ Seeded billing plans (Daily, Monthly, Yearly)");

  // 4. Create Tax Rules & Discounts
  await prisma.taxRule.createMany({
    data: [
      { name: "Standard VAT (10%)", ratePercentage: 10.0, isDefault: true },
      { name: "State Sales Tax (5%)", ratePercentage: 5.0, isDefault: false },
      { name: "Zero Tax (0%)", ratePercentage: 0.0, isDefault: false },
    ],
  });

  await prisma.discountRule.create({
    data: {
      code: "VOLUME15",
      name: "Volume Seats Discount (15% Off)",
      type: "PERCENTAGE",
      value: 15.0,
      minQuantity: 5,
      usageLimit: 50,
      timesUsed: 1,
      targetType: "WHOLE_SUBSCRIPTION",
    },
  });

  await prisma.discountRule.create({
    data: {
      code: "WELCOME50",
      name: "New Business Flat Discount ($50 Off)",
      type: "FIXED",
      value: 50.0,
      minPurchaseAmount: 200.0,
      usageLimit: 100,
      timesUsed: 2,
      targetType: "WHOLE_SUBSCRIPTION",
    },
  });

  console.log("✅ Seeded taxes and discount rules");

  // 5. Create Quotation Template
  const odooVariant = prodSoftware.variants.find((v) => v.name?.includes("Odoo"));
  await prisma.quotationTemplate.create({
    data: {
      name: "Enterprise Software + Odoo Brand Template",
      validityDays: 14,
      planId: planMonthly.id,
      lines: {
        create: [
          {
            productId: prodSoftware.id,
            quantity: 1,
            unitPrice: prodSoftware.salesPrice + (odooVariant?.extraPrice ?? 0),
          },
          {
            productId: prodAddon.id,
            quantity: 5,
            unitPrice: 45.0,
          },
        ],
      },
    },
  });

  // 6. Create Active Subscriptions
  const sub1 = await prisma.subscription.create({
    data: {
      subscriptionNumber: "SUB-1001",
      customerId: customer1.id,
      planId: planMonthly.id,
      status: "ACTIVE",
      startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
      nextBillingDate: new Date(), // Due today!
      paymentTerms: "Net 15",
      lines: {
        create: [
          {
            productId: prodSoftware.id,
            variantId: odooVariant?.id,
            quantity: 1,
            unitPrice: 960.0, // 400 + 560
            taxRate: 10.0,
            amount: 960.0,
          },
          {
            productId: prodAddon.id,
            quantity: 3,
            unitPrice: 45.0,
            taxRate: 10.0,
            amount: 135.0,
          },
        ],
      },
    },
  });

  const sub2 = await prisma.subscription.create({
    data: {
      subscriptionNumber: "SUB-1002",
      customerId: customer2.id,
      planId: planYearly.id,
      status: "ACTIVE",
      startDate: new Date(),
      nextBillingDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
      paymentTerms: "Immediate",
      lines: {
        create: [
          {
            productId: prodSoftware.id,
            quantity: 1,
            unitPrice: 4200.0,
            taxRate: 10.0,
            amount: 4200.0,
          },
        ],
      },
    },
  });

  // 7. Create Invoices & Payments for Demonstration
  const inv1 = await prisma.invoice.create({
    data: {
      invoiceNumber: "INV-1001",
      customerId: customer1.id,
      subscriptionId: sub1.id,
      status: "CONFIRMED",
      invoiceDate: new Date(),
      dueDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000),
      subtotal: 1095.0,
      taxAmount: 109.5,
      discountAmount: 0.0,
      totalAmount: 1204.5,
      notes: "First monthly recurring billing invoice",
      lines: {
        create: [
          {
            productId: prodSoftware.id,
            description: "Brightloop Business Cloud (Odoo Brand)",
            quantity: 1,
            unitPrice: 960.0,
            taxRate: 10.0,
            amount: 960.0,
          },
          {
            productId: prodAddon.id,
            description: "Extra User Seat (Qty 3)",
            quantity: 3,
            unitPrice: 45.0,
            taxRate: 10.0,
            amount: 135.0,
          },
        ],
      },
    },
  });

  const inv2 = await prisma.invoice.create({
    data: {
      invoiceNumber: "INV-1002",
      customerId: customer2.id,
      subscriptionId: sub2.id,
      status: "PAID",
      invoiceDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
      dueDate: new Date(),
      subtotal: 4200.0,
      taxAmount: 420.0,
      discountAmount: 50.0,
      totalAmount: 4570.0,
      notes: "Annual prepayment with WELCOME50 applied",
      lines: {
        create: [
          {
            productId: prodSoftware.id,
            description: "Brightloop Business Cloud - Yearly Enterprise",
            quantity: 1,
            unitPrice: 4200.0,
            taxRate: 10.0,
            amount: 4200.0,
          },
        ],
      },
      payments: {
        create: [
          {
            method: "BANK_TRANSFER",
            amount: 4570.0,
            paymentDate: new Date(),
            note: "Wire transfer ref #TX-998124",
          },
        ],
      },
    },
  });

  console.log("✅ Seeded historical invoices and payments");
  console.log("\n🎉 Database successfully populated with all Brightloop story data!");
}

main()
  .catch((e) => {
    console.error("Error seeding database:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
