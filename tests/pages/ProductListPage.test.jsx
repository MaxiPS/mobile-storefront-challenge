import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { StrictMode } from "react";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import App from "@/app/App.jsx";
import { PRODUCT_LIST_CACHE_KEY } from "@/services/storage/cache.js";
import { db } from "@/services/storage/dexieDatabase.js";
import { productRepository } from "@/services/storage/productRepository.js";
import { cartStore } from "@/store/cartStore.js";
import { productListStore } from "@/store/productListStore.js";
import productsFixture from "../fixtures/products.json";

const PRODUCTS_URL = "https://itx-frontend-test.onrender.com/api/product";
const INITIAL_VIEWPORT = { width: window.innerWidth, height: window.innerHeight };
const server = setupServer(
  http.get(PRODUCTS_URL, () => HttpResponse.json(productsFixture)),
);
let requests = [];

beforeAll(() => {
  server.events.on("request:start", ({ request }) => {
    requests.push({ method: request.method, url: request.url });
  });
  server.listen({ onUnhandledFrame: "error" });
});

afterAll(() => server.close());

afterEach(() => {
  cleanup();
  server.resetHandlers();
  vi.restoreAllMocks();
  Object.defineProperty(window, "innerWidth", { configurable: true, value: INITIAL_VIEWPORT.width });
  Object.defineProperty(window, "innerHeight", { configurable: true, value: INITIAL_VIEWPORT.height });
});

function expectProductRequests(count) {
  expect(requests).toEqual(
    Array.from({ length: count }, () => ({ method: "GET", url: PRODUCTS_URL })),
  );
}

async function clearDatabase() {
  await db.apiCache.clear();
}

async function seedProductCache(products, expiresAt) {
  await db.apiCache.put({
    key: PRODUCT_LIST_CACHE_KEY,
    response: products,
    savedAt: expiresAt - 60_000,
    expiresAt,
  });
}

function createProductCatalog(count) {
  return Array.from({ length: count }, (_, index) => ({
    id: `test-product-${index + 1}`,
    brand: "Test Brand",
    model: `Product ${index + 1}`,
    price: "100",
    imgUrl: "",
  }));
}

function setViewportSize(width, height) {
  Object.defineProperty(window, "innerWidth", { configurable: true, value: width });
  Object.defineProperty(window, "innerHeight", { configurable: true, value: height });
}

function mockProductRowMeasurements(rowHeight) {
  vi.spyOn(HTMLElement.prototype, "offsetHeight", "get").mockImplementation(function () {
    return this.classList.contains("product-grid__row") ? rowHeight : 0;
  });
}

beforeEach(async () => {
  requests = [];
  await clearDatabase();
  cartStore.setCartCount(0);
  await productListStore.setSearchTerm("");
});

describe("product list page", () => {
  it("loads the product list from the API when the cache is empty", async () => {
    render(<App />);

    expect(await screen.findByText("Iconia Talk S")).toBeInTheDocument();
    expectProductRequests(1);
  });

  it("loads a previously cached product list without calling the API", async () => {
    await seedProductCache(productsFixture, Date.now() + 60_000);

    render(<App />);

    expect(await screen.findByText("Iconia Talk S")).toBeInTheDocument();
    expectProductRequests(0);
  });

  it("renders product cards", async () => {
    render(<App />);

    expect(await screen.findByText("Iconia Talk S")).toBeInTheDocument();
    expect(
      screen.getByRole("img", { name: "Acer Iconia Talk S" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Price unavailable")).toBeInTheDocument();
    expect(screen.getByText("170 \u20ac")).toBeInTheDocument();
  });

  it("renders the store header without a breadcrumb on the listing page", async () => {
    render(<App />);

    await screen.findByText("Iconia Talk S");
    expect(
      screen.getByRole("link", { name: "ITX Store home" }),
    ).toHaveAttribute("href", "/");
    expect(
      screen.queryByRole("navigation", { name: "breadcrumb" }),
    ).not.toBeInTheDocument();
  });

  it("filters by model in Dexie without another API request", async () => {
    const user = userEvent.setup();
    const searchSpy = vi.spyOn(productRepository, "searchProductsLocal");
    render(<App />);

    await screen.findByText("Iconia Talk S");
    expectProductRequests(1);

    await user.type(screen.getByRole("searchbox", { name: "Search products" }), "jAdE");

    expect(await screen.findByText("Liquid Jade 2")).toBeInTheDocument();
    expect(screen.queryByText("Iconia Talk S")).not.toBeInTheDocument();
    expect(searchSpy).toHaveBeenCalledWith("jAdE");
    expectProductRequests(1);
  });

  it("searches product brands case-insensitively in Dexie", async () => {
    const user = userEvent.setup();
    const searchSpy = vi.spyOn(productRepository, "searchProductsLocal");
    render(<App />);

    await screen.findByText("Iconia Talk S");
    await user.type(
      screen.getByRole("searchbox", { name: "Search products" }),
      "aCeR",
    );

    expect(await screen.findByText("Liquid Jade 2")).toBeInTheDocument();
    expect(screen.getByText("Iconia Talk S")).toBeInTheDocument();
    expect(searchSpy).toHaveBeenCalledWith("aCeR");
    expectProductRequests(1);
  });

  it("fuzzy searches misspelled model names locally without another API request", async () => {
    const user = userEvent.setup();
    render(<App />);

    await screen.findByText("Iconia Talk S");
    await user.type(
      screen.getByRole("searchbox", { name: "Search products" }),
      "jdae",
    );

    expect(await screen.findByText("Liquid Jade 2")).toBeInTheDocument();
    expect(screen.queryByText("Iconia Talk S")).not.toBeInTheDocument();
    expectProductRequests(1);
  });

  it("paginates the product catalog in groups of twelve", async () => {
    const user = userEvent.setup();
    const products = createProductCatalog(25);
    setViewportSize(1440, 1300);
    server.use(http.get(PRODUCTS_URL, () => HttpResponse.json(products)));

    render(<App />);

    expect(await screen.findByText("Product 1")).toBeInTheDocument();
    expect(screen.getByText("Page 1 of 3")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Page 1" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(screen.getByText("Product 12")).toBeInTheDocument();
    expect(screen.queryByText("Product 13")).not.toBeInTheDocument();
    expect(screen.getAllByRole("list", { name: /Product row/ })).toHaveLength(3);

    await user.click(screen.getByRole("button", { name: "Next page" }));

    expect(await screen.findByText("Product 13")).toBeInTheDocument();
    expect(screen.queryByText("Product 1")).not.toBeInTheDocument();
    expect(screen.getByText("Page 2 of 3")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Page 2" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    expectProductRequests(1);
  });

  it("keeps four product columns at the reference desktop width", async () => {
    const products = createProductCatalog(12);
    setViewportSize(1000, 1300);
    mockProductRowMeasurements(280);
    server.use(http.get(PRODUCTS_URL, () => HttpResponse.json(products)));

    render(<App />);

    expect(await screen.findByText("Product 12")).toBeInTheDocument();
    expect(screen.getAllByRole("list", { name: /Product row/ })).toHaveLength(3);
  });

  it("virtualizes offscreen product rows within each page", async () => {
    const products = createProductCatalog(100);
    setViewportSize(390, 768);
    mockProductRowMeasurements(420);
    server.use(http.get(PRODUCTS_URL, () => HttpResponse.json(products)));

    render(<App />);

    expect(await screen.findByText("Product 1")).toBeInTheDocument();
    expect(screen.getByText("Page 1 of 9")).toBeInTheDocument();
    expect(screen.getAllByRole("list", { name: /Product row/ }).length).toBeLessThan(12);
    const visibleProductLinks =
      screen
        .getAllByRole("link")
        .filter((link) => link.getAttribute("href")?.startsWith("/products/"));
    expect(visibleProductLinks.length).toBeGreaterThan(0);
    expect(visibleProductLinks.length).toBeLessThan(12);
  });

  it("does not duplicate the list request when React Strict Mode replays effects", async () => {
    render(
      <StrictMode>
        <App />
      </StrictMode>,
    );

    expect(await screen.findByText("Iconia Talk S")).toBeInTheDocument();
    expectProductRequests(1);
  });

  it("refreshes an expired cache when the list is opened", async () => {
    const previousProducts = [
      { ...productsFixture[0], model: "Old cached model" },
    ];
    await seedProductCache(previousProducts, Date.now() - 1_000);

    render(<App />);

    expect(await screen.findByText("Iconia Talk S")).toBeInTheDocument();
    expect(screen.queryByText("Old cached model")).not.toBeInTheDocument();
    expectProductRequests(1);
    await waitFor(async () => {
      expect(await db.apiCache.count()).toBe(1);
    });
  });

  it("shows a loading state while the list request is pending", async () => {
    let resolveProducts;
    server.use(http.get(PRODUCTS_URL, () =>
      new Promise((resolve) => {
        resolveProducts = resolve;
      }),
    ));

    render(<App />);

    expect(screen.getByRole("status")).toHaveTextContent("Loading products");
    await waitFor(() => expect(resolveProducts).toBeTypeOf("function"));
    resolveProducts(HttpResponse.json(productsFixture));
    expect(await screen.findByText("Iconia Talk S")).toBeInTheDocument();
  });

  it("shows an empty state when the API returns no products", async () => {
    server.use(http.get(PRODUCTS_URL, () => HttpResponse.json([])));

    render(<App />);

    expect(await screen.findByText("No products available")).toBeInTheDocument();
  });

  it("shows a no-results state for an unmatched local search", async () => {
    const user = userEvent.setup();
    render(<App />);

    await screen.findByText("Iconia Talk S");
    await user.type(
      screen.getByRole("searchbox", { name: "Search products" }),
      "not-a-phone",
    );

    expect(await screen.findByText("No products found")).toBeInTheDocument();
    expectProductRequests(1);
  });

  it("lets the user retry after a list request fails", async () => {
    const user = userEvent.setup();
    let attempt = 0;
    server.use(http.get(PRODUCTS_URL, () => {
      attempt += 1;
      return attempt === 1
        ? HttpResponse.error()
        : HttpResponse.json(productsFixture);
    }));

    render(<App />);

    expect(await screen.findByText("We couldn't load products")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Try again" }));

    expect(await screen.findByText("Iconia Talk S")).toBeInTheDocument();
    expectProductRequests(2);
  });

  it("shows the cart count in the shared header", async () => {
    cartStore.setCartCount(3);

    render(<App />);

    expect(
      await screen.findByRole("group", { name: "Cart items: 3" }),
    ).toBeInTheDocument();
  });
});
