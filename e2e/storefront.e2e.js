import { expect, test } from "@playwright/test";
import productDetail from "../tests/fixtures/product-detail.json" with { type: "json" };
import products from "../tests/fixtures/products.json" with { type: "json" };

const API_URL = "https://itx-frontend-test.onrender.com/api";
const API_HOST = "https://itx-frontend-test.onrender.com";

async function mockAssessmentApi(page) {
  let cartCount = 0;
  const corsHeaders = {
    "access-control-allow-origin": "*",
    "access-control-allow-methods": "GET, POST, OPTIONS",
    "access-control-allow-headers": "content-type",
  };

  await page.route(`${API_URL}/**`, async (route) => {
    const request = route.request();
    const url = new URL(request.url());

    if (request.method() === "OPTIONS") {
      await route.fulfill({ status: 204, headers: corsHeaders });
      return;
    }

    if (request.method() === "GET" && url.pathname === `${new URL(API_URL).pathname}/product`) {
      await route.fulfill({ status: 200, headers: corsHeaders, json: products });
      return;
    }

    if (
      request.method() === "GET" &&
      url.pathname === `${new URL(API_URL).pathname}/product/${productDetail.id}`
    ) {
      await route.fulfill({ status: 200, headers: corsHeaders, json: productDetail });
      return;
    }

    if (request.method() === "POST" && url.pathname === `${new URL(API_URL).pathname}/cart`) {
      cartCount += 1;
      await route.fulfill({ status: 200, headers: corsHeaders, json: { count: cartCount } });
      return;
    }

    await route.fulfill({ status: 404, headers: corsHeaders, json: {} });
  });

  await page.route(`${API_HOST}/images/**`, (route) =>
    route.fulfill({
      status: 200,
      contentType: "image/svg+xml",
      body: "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 1 1\"><rect width=\"1\" height=\"1\" fill=\"#eef1f5\"/></svg>",
    }),
  );
}

test("supports keyboard shopping and restores the cart after reload", async ({ page }) => {
  await mockAssessmentApi(page);
  await page.goto("/");

  await expect(page.getByRole("heading", { name: "Products" })).toBeVisible();
  await expect(
    page.getByRole("navigation", { name: "breadcrumb" }).getByText("Products"),
  ).toHaveAttribute("aria-current", "page");

  await page.keyboard.press("Tab");
  await expect(page.getByRole("link", { name: "ITX Store home" })).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(page.getByRole("searchbox", { name: "Search products" })).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(
    page.getByRole("link", { name: "View Acer Iconia Talk S details" }),
  ).toBeFocused();
  await page.keyboard.press("Enter");

  await expect(page.getByRole("heading", { name: productDetail.model })).toBeVisible();
  await expect(page.locator("#main-content")).toBeFocused();
  await expect.poll(() =>
    page.locator("#main-content").evaluate((element) =>
      getComputedStyle(element).outlineStyle,
    ),
  ).toBe("solid");

  const storageOption = page.getByRole("radio", { name: "32 GB" });
  await storageOption.focus();
  await page.keyboard.press("Space");
  await expect(storageOption).toBeChecked();

  const addButton = page.getByRole("button", { name: "Add to cart" });
  await addButton.focus();
  await page.keyboard.press("Enter");
  await expect(page.getByText("Added to cart")).toBeVisible();
  await expect(page.getByRole("group", { name: "Cart items: 1" })).toBeVisible();

  await page.reload();
  await expect(page.getByRole("heading", { name: productDetail.model })).toBeVisible();
  await expect(page.getByRole("group", { name: "Cart items: 1" })).toBeVisible();

  await page.getByRole("link", { name: "Products" }).click();
  await expect(page.getByRole("heading", { name: "Products" })).toBeVisible();
  await expect(page.locator("#main-content")).toBeFocused();
  await expect(page.getByRole("group", { name: "Cart items: 1" })).toBeVisible();
});

test("does not show the keyboard focus ring after pointer navigation", async ({ page }) => {
  await mockAssessmentApi(page);
  await page.goto("/");

  await page.getByRole("link", { name: "View Acer Iconia Talk S details" }).click();
  await expect(page.getByRole("heading", { name: productDetail.model })).toBeVisible();
  await expect(page.locator("#main-content")).toBeFocused();
  await expect.poll(() =>
    page.locator("#main-content").evaluate((element) =>
      getComputedStyle(element).outlineStyle,
    ),
  ).toBe("none");
});

test("keeps the product grid responsive without horizontal overflow", async ({ page }) => {
  await mockAssessmentApi(page);
  await page.goto("/");
  await expect(page.getByText("Iconia Talk S")).toBeVisible();

  const grid = page.locator(".product-grid__row-items").first();
  for (const [width, expectedColumns] of [[390, 1], [600, 2], [1000, 4]]) {
    await page.setViewportSize({ width, height: 844 });
    await expect.poll(async () =>
      grid.evaluate((element) =>
        getComputedStyle(element).gridTemplateColumns.trim().split(/\s+/).length,
      ),
    ).toBe(expectedColumns);

    const documentWidth = await page.evaluate(
      () => document.documentElement.scrollWidth,
    );
    expect(documentWidth).toBeLessThanOrEqual(width);
  }
});
