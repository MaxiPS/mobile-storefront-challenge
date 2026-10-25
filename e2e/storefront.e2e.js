import { expect, test } from "@playwright/test";
import productDetail from "../tests/fixtures/product-detail.json" with { type: "json" };
import products from "../tests/fixtures/products.json" with { type: "json" };

const firstProduct = products[0];
const firstProductLinkName = `View ${firstProduct.brand} ${firstProduct.model} details`;
const API_URL = "https://itx-frontend-test.onrender.com/api";
const API_HOST = "https://itx-frontend-test.onrender.com";

async function mockAssessmentApi(page, productCatalog = products) {
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
      await route.fulfill({ status: 200, headers: corsHeaders, json: productCatalog });
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

function createVirtualizedProductCatalog(size) {
  return Array.from({ length: size }, (_, index) => ({
    ...products[0],
    id: `virtual-product-${index + 1}`,
    model: `Virtual Product ${index + 1}`,
    imgUrl: "",
  }));
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
    page.getByRole("link", { name: firstProductLinkName }),
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

  await page.getByRole("link", { name: firstProductLinkName }).click();
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
  await expect(page.getByText(firstProduct.model)).toBeVisible();

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

test("virtualizes product cards while scrolling to the end of the catalog", async ({ page }) => {
  // Given the API provides a large catalog and product requests are counted
  const productCatalog = createVirtualizedProductCatalog(100);
  const productListUrl = `${API_URL}/product`;
  const productLinks = page.locator('a[href^="/products/"]');
  const firstProductLink = page.getByRole("link", {
    name: `View ${productCatalog[0].brand} ${productCatalog[0].model} details`,
  });
  const lastProduct = page.getByRole("link", {
    name: `View ${productCatalog.at(-1).brand} ${productCatalog.at(-1).model} details`,
  });
  let productListRequests = 0;

  await mockAssessmentApi(page, productCatalog);
  page.on("request", (request) => {
    if (request.method() === "GET" && request.url() === productListUrl) {
      productListRequests += 1;
    }
  });

  // When the user opens the catalog
  await page.goto("/");

  // Then only a window of the catalog is rendered initially
  await expect(firstProductLink).toBeVisible();
  await expect(lastProduct).toHaveCount(0);
  expect(await productLinks.count()).toBeLessThan(productCatalog.length);

  // When the user scrolls to the end of the catalog
  await page.mouse.wheel(0, 50_000);

  // Then the final products are reachable without rendering the entire catalog or refetching it
  await expect(lastProduct).toBeVisible();
  await expect(firstProductLink).toHaveCount(0);
  expect(await productLinks.count()).toBeLessThan(productCatalog.length);
  expect(productListRequests).toBe(1);
});
