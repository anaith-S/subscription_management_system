import { NextRequest } from "next/server";
import { signToken } from "../src/lib/auth";
import { prisma } from "../src/lib/prisma";

import * as ProductsRoute from "../src/app/api/catalog/products/route";
import * as ProductDetailRoute from "../src/app/api/catalog/products/[id]/route";
import * as ProductVariantsRoute from "../src/app/api/catalog/products/[id]/variants/route";
import * as PlansRoute from "../src/app/api/catalog/plans/route";
import * as PlanDetailRoute from "../src/app/api/catalog/plans/[id]/route";
import * as PlanCloseRoute from "../src/app/api/catalog/plans/[id]/close/route";
import * as PlanPauseRoute from "../src/app/api/catalog/plans/[id]/pause/route";
import * as PlanRenewRoute from "../src/app/api/catalog/plans/[id]/renew/route";
import * as TaxesRoute from "../src/app/api/catalog/taxes/route";
import * as DiscountsRoute from "../src/app/api/catalog/discounts/route";
import * as ApplicableDiscountsRoute from "../src/app/api/catalog/discounts/applicable/route";

async function main() {
  console.log("===============================================================");
  console.log("🌐 VERIFYING NEXT.JS API ROUTE HANDLERS (/catalog/...)");
  console.log("===============================================================\n");

  const admin = await prisma.user.findUnique({ where: { email: "admin@brightloop.com" } });
  const staff = await prisma.user.findUnique({ where: { email: "staff@brightloop.com" } });
  const customer = await prisma.user.findUnique({ where: { email: "customer@acme.com" } });

  if (!admin || !staff || !customer) throw new Error("Seed users missing!");

  const adminToken = signToken({ id: admin.id, email: admin.email, role: admin.role, name: admin.name });
  const staffToken = signToken({ id: staff.id, email: staff.email, role: staff.role, name: staff.name });
  const customerToken = signToken({ id: customer.id, email: customer.email, role: customer.role, name: customer.name });

  // 1. Products API
  console.log("1. Testing Products API (admin write only):");
  // Customer attempt should fail (403)
  const forbiddenReq = new NextRequest("http://localhost:3000/api/catalog/products", {
    method: "POST",
    headers: { Authorization: `Bearer ${customerToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({ name: "Hacked Product", sales_price: 100 }),
  });
  const forbiddenRes = await ProductsRoute.POST(forbiddenReq);
  console.log("  ✅ Customer POST rejected:", forbiddenRes.status, "(expected 403)");
  if (forbiddenRes.status !== 403) throw new Error("Expected 403 Forbidden for non-admin");

  // Admin attempt should succeed (201)
  const adminProdReq = new NextRequest("http://localhost:3000/api/catalog/products", {
    method: "POST",
    headers: { Authorization: `Bearer ${adminToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      name: "API Test SaaS",
      type: "Software",
      sales_price: 350.0,
      cost_price: 100.0,
      notes: "Created via Route Handler",
    }),
  });
  const adminProdRes = await ProductsRoute.POST(adminProdReq);
  console.log("  ✅ Admin POST product:", adminProdRes.status, "(expected 201)");
  if (adminProdRes.status !== 201) throw new Error("Expected 201 Created");
  const prodJson = await adminProdRes.json();
  const createdProductId = prodJson.product.id;

  // Add Variant via POST /catalog/products/{id}/variants
  console.log("\n2. Testing Product Variant Creation (attribute, value, extra_price):");
  const varReq = new NextRequest(`http://localhost:3000/api/catalog/products/${createdProductId}/variants`, {
    method: "POST",
    headers: { Authorization: `Bearer ${adminToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      attribute: "brand",
      value: "Odoo",
      extra_price: 560.0,
    }),
  });
  const varRes = await ProductVariantsRoute.POST(varReq, { params: Promise.resolve({ id: createdProductId }) });
  console.log("  ✅ Variant POST response:", varRes.status, "(expected 201)");
  if (varRes.status !== 201) throw new Error("Expected 201 Created for variant");
  const varJson = await varRes.json();
  console.log("  ✅ Created Variant:", varJson.variant.name, "Extra Price: +$" + varJson.variant.extra_price);

  // 3. Plans API & Actions
  console.log("\n3. Testing Plans API and Actions (/close, /pause, /renew):");
  // Create Plan with closable: false, pausable: true, renewable: true
  const planReq = new NextRequest("http://localhost:3000/api/catalog/plans", {
    method: "POST",
    headers: { Authorization: `Bearer ${adminToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      name: "Business Monthly Non-Closable",
      price: 199.0,
      billing_period: "monthly",
      min_quantity: 1,
      auto_close: false,
      closable: false, // Disallowed
      pausable: true,  // Allowed
      renewable: true, // Allowed
    }),
  });
  const planRes = await PlansRoute.POST(planReq);
  console.log("  ✅ Admin POST plan response:", planRes.status, "(expected 201)");
  const planJson = await planRes.json();
  const planId = planJson.plan.id;

  // Test POST /catalog/plans/{id}/close (should be 400 because closable is false)
  const closeReq = new NextRequest(`http://localhost:3000/api/catalog/plans/${planId}/close`, { method: "POST" });
  const closeRes = await PlanCloseRoute.POST(closeReq, { params: Promise.resolve({ id: planId }) });
  console.log("  ✅ Plan Close (closable=false): Status", closeRes.status, "(expected 400 Bad Request)");
  if (closeRes.status !== 400) throw new Error("Expected 400 Bad Request when closing unclosable plan");

  // Test POST /catalog/plans/{id}/pause (should be 200 because pausable is true)
  const pauseReq = new NextRequest(`http://localhost:3000/api/catalog/plans/${planId}/pause`, { method: "POST" });
  const pauseRes = await PlanPauseRoute.POST(pauseReq, { params: Promise.resolve({ id: planId }) });
  console.log("  ✅ Plan Pause (pausable=true): Status", pauseRes.status, "(expected 200 OK)");
  if (pauseRes.status !== 200) throw new Error("Expected 200 OK when pausing pausable plan");
  const pauseJson = await pauseRes.json();
  console.log("  ✅ Plan status after pause:", pauseJson.plan.status);

  // Test POST /catalog/plans/{id}/renew (should be 200 because renewable is true)
  const renewReq = new NextRequest(`http://localhost:3000/api/catalog/plans/${planId}/renew`, { method: "POST" });
  const renewRes = await PlanRenewRoute.POST(renewReq, { params: Promise.resolve({ id: planId }) });
  console.log("  ✅ Plan Renew (renewable=true): Status", renewRes.status, "(expected 200 OK)");
  if (renewRes.status !== 200) throw new Error("Expected 200 OK when renewing renewable plan");
  const renewJson = await renewRes.json();
  console.log("  ✅ Plan status after renew:", renewJson.plan.status);

  // 4. Taxes API
  console.log("\n4. Testing Taxes API (admin only):");
  const taxReq = new NextRequest("http://localhost:3000/api/catalog/taxes", {
    method: "POST",
    headers: { Authorization: `Bearer ${adminToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({ name: "Export Software VAT", percentage: 12.5 }),
  });
  const taxRes = await TaxesRoute.POST(taxReq);
  console.log("  ✅ Tax POST response:", taxRes.status, "(expected 201)");
  const taxJson = await taxRes.json();
  const taxId = taxJson.tax.id;

  // 5. Discounts API & Applicable Endpoint
  console.log("\n5. Testing Discounts API & Applicable Endpoint:");
  const discReq = new NextRequest("http://localhost:3000/api/catalog/discounts", {
    method: "POST",
    headers: { Authorization: `Bearer ${adminToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      code: "ROUTE25",
      name: "Route Test 25% Off",
      type: "percentage",
      value: 25.0,
      min_quantity: 3,
      applies_to: "whole_subscription",
      usage_limit: 50,
      used_count: 0,
    }),
  });
  const discRes = await DiscountsRoute.POST(discReq);
  console.log("  ✅ Discount POST response:", discRes.status, "(expected 201)");
  const discJson = await discRes.json();
  const discId = discJson.discount.id;

  // Test POST /catalog/discounts/applicable
  const appDiscReq = new NextRequest("http://localhost:3000/api/catalog/discounts/applicable", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      subscription: { discountCode: "ROUTE25", subtotal: 1500 },
      lines: [{ productId: createdProductId, quantity: 3, unitPrice: 500, amount: 1500 }],
      today: new Date().toISOString(),
    }),
  });
  const appDiscRes = await ApplicableDiscountsRoute.POST(appDiscReq);
  console.log("  ✅ Applicable Discounts POST:", appDiscRes.status, "(expected 200)");
  const appDiscJson = await appDiscRes.json();
  console.log("  ✅ Applicable discounts found:", appDiscJson.count);
  console.log("  ✅ Calculated discount amount:", "$" + appDiscJson.valid_discounts[0]?.calculated_discount_amount);
  if (appDiscJson.count !== 1 || appDiscJson.valid_discounts[0]?.calculated_discount_amount !== 375) {
    throw new Error("Applicable discount calculation failed!");
  }

  // Clean up
  await prisma.discountRule.delete({ where: { id: discId } });
  await prisma.taxRule.delete({ where: { id: taxId } });
  await prisma.plan.delete({ where: { id: planId } });
  await prisma.product.delete({ where: { id: createdProductId } });

  console.log("\n===============================================================");
  console.log("🎉 ALL API ROUTE HANDLERS VERIFIED SUCCESSFULLY!");
  console.log("===============================================================\n");
}

main()
  .catch((e) => {
    console.error("❌ API verification failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
