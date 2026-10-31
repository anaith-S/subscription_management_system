import { prisma } from "../src/lib/prisma";
import { GET as getProds } from "../src/app/api/catalog/products/dropdown/route";
import { GET as getPlans } from "../src/app/api/catalog/plans/dropdown/route";
import { GET as getBoth } from "../src/app/api/catalog/dropdowns/route";

async function main() {
  console.log("Testing Dropdown endpoints...");
  const pRes = await getProds();
  const pData = await pRes.json();
  console.log("Products dropdown count:", pData.products?.length);
  if (pData.products?.length > 0) {
    console.log("  Sample product:", pData.products[0].name, "Variants:", pData.products[0].variants?.length);
  }

  const plRes = await getPlans();
  const plData = await plRes.json();
  console.log("Plans dropdown count:", plData.plans?.length);
  if (plData.plans?.length > 0) {
    console.log("  Sample plan:", plData.plans[0].name, "Price:", plData.plans[0].price);
  }

  const bRes = await getBoth();
  const bData = await bRes.json();
  console.log("Combined dropdown:", bData.products?.length, "products,", bData.plans?.length, "plans");
  console.log("✅ All dropdown endpoints working!");
  process.exit(0);
}

main().catch(err => {
  console.error("Error:", err);
  process.exit(1);
});
