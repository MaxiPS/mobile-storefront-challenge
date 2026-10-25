import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { StrictMode } from "react";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import App from "@/app/App.jsx";
import { PRODUCT_LIST_CACHE_KEY } from "@/services/storage/cache.js";
import { db } from "@/services/storage/dexieDatabase.js";
import { cartStore } from "@/store/cartStore.js";
import { productListStore } from "@/store/productListStore.js";
import searchProductsFixture from "../fixtures/search-products.json";
import productsFixture from "../fixtures/products.json";

const firstProduct = productsFixture[0];
const modelSearchTarget = productsFixture.find(
  (product) =>
    product.id !== firstProduct.id &&
    Boolean(product.model?.trim()) &&
    product.model.toLowerCase() !== firstProduct.model.toLowerCase(),
);

function getProductName(product) {
  return [product.brand, product.model].filter(Boolean).join(" ");
}

function getProductLinkName(product) {
  return `View ${getProductName(product)} details`;
}

function transposeFirstTwoCharacters(value) {
  const [first, second, ...remaining] = value.toLowerCase();
  return `${second}${first}${remaining.join("")}`;
}

const PRODUCTS_URL = "https://itx-frontend-test.onrender.com/api/product";
const INITIAL_VIEWPORT = { width: window.innerWidth, height: window.innerHeight };
const INITIAL_SCROLL_Y = window.scrollY;
const server = setupServer(
  http.get(PRODUCTS_URL, () => HttpResponse.json(productsFixture)),
);
let requests = [];

beforeAll(() => {
  server.events.on("request:start", ({ request }) => {
    requests.push({ method: request.method, url: request.url });
  });
  server.listen({ onUnhandledRequest: "error" });
});

afterAll(() => server.close());

afterEach(() => {
  cleanup();
  server.resetHandlers();
  vi.restoreAllMocks();
  Object.defineProperty(window, "innerWidth", { configurable: true, value: INITIAL_VIEWPORT.width });
  Object.defineProperty(window, "innerHeight", { configurable: true, value: INITIAL_VIEWPORT.height });
  Object.defineProperty(window, "scrollY", { configurable: true, value: INITIAL_SCROLL_Y });
});

function expectProductRequests(count) {
  expect(requests).toEqual(
    Array.from({ length: count }, () => ({ method: "GET", url: PRODUCTS_URL })),
  );
}

async function clearDatabase() {
  await db.apiCache.clear();
  await db.cartItems.clear();
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

function scrollWindowTo(offset) {
  Object.defineProperty(window, "scrollY", { configurable: true, value: offset });
  fireEvent.scroll(window);
}

function mockProductRowMeasurements(rowHeight) {
  vi.spyOn(HTMLElement.prototype, "offsetHeight", "get").mockImplementation(function () {
    return this.classList.contains("product-grid__row") ? rowHeight : 0;
  });
}

beforeEach(async () => {
  requests = [];
  await clearDatabase();
  await cartStore.load();
  await productListStore.setSearchTerm("");
});

describe("product list page", () => {
  it("loads the product list from the API when the cache is empty", async () => {
    render(<App />);

    expect(await screen.findByText(firstProduct.model)).toBeInTheDocument();
    expectProductRequests(1);
  });

  it("loads a previously cached product list without calling the API", async () => {
    await seedProductCache(productsFixture, Date.now() + 60_000);

    render(<App />);

    expect(await screen.findByText(firstProduct.model)).toBeInTheDocument();
    expectProductRequests(0);
  });

  it("renders product cards", async () => {
    render(<App />);

    expect(await screen.findByText(firstProduct.model)).toBeInTheDocument();
    const productCardLink = screen.getByRole("link", {
      name: getProductLinkName(firstProduct),
    });
    expect(productCardLink).toHaveAttribute("href", `/products/${firstProduct.id}`);
    expect(productCardLink).toContainElement(
      screen.getByRole("heading", { name: firstProduct.model }),
    );
    expect(screen.queryByText("View details", { exact: true })).not.toBeInTheDocument();
    expect(
      screen.getByRole("img", { name: getProductName(firstProduct) }),
    ).toBeInTheDocument();
    const firstProductPrice = String(firstProduct.price ?? "").trim();
    expect(productCardLink).toHaveTextContent(
      firstProductPrice ? `${firstProductPrice} \u20ac` : "Price unavailable",
    );
  });

  it("shows the current products page in the breadcrumb", async () => {
    render(<App />);

    await screen.findByText(firstProduct.model);
    expect(
      screen.getByRole("link", { name: "ITX Store home" }),
    ).toHaveAttribute("href", "/");
    const breadcrumb = screen.getByRole("navigation", { name: "breadcrumb" });
    expect(within(breadcrumb).getByText("Products")).toHaveAttribute(
      "aria-current",
      "page",
    );
  });

  it("filters by model in Dexie without another API request", async () => {
    const user = userEvent.setup();

    // Given the catalog has been loaded once
    render(<App />);
    await screen.findByText(firstProduct.model);
    expectProductRequests(1);

    // When the user searches for a model
    const searchTerm = modelSearchTarget.model.toUpperCase();
    await user.type(screen.getByRole("searchbox", { name: "Search products" }), searchTerm);

    // Then matching local data is shown without another API request
    expect(await screen.findByText(modelSearchTarget.model)).toBeInTheDocument();
    expect(screen.queryByText(firstProduct.model)).not.toBeInTheDocument();
    expectProductRequests(1);
  });

  it("searches product brands case-insensitively in Dexie", async () => {
    const user = userEvent.setup();
    server.use(http.get(PRODUCTS_URL, () => HttpResponse.json(searchProductsFixture)));
    render(<App />);

    await screen.findByText(searchProductsFixture[0].model);
    const searchTerm = searchProductsFixture[0].brand.toUpperCase();
    await user.type(
      screen.getByRole("searchbox", { name: "Search products" }),
      searchTerm,
    );

    expect(await screen.findByText(searchProductsFixture[0].model)).toBeInTheDocument();
    expect(screen.getByText(searchProductsFixture[1].model)).toBeInTheDocument();
    expect(screen.queryByText(searchProductsFixture[2].model)).not.toBeInTheDocument();
    expectProductRequests(1);
  });

  it("fuzzy searches misspelled model names locally without another API request", async () => {
    const user = userEvent.setup();
    render(<App />);

    await screen.findByText(firstProduct.model);
    const searchTerm = transposeFirstTwoCharacters(modelSearchTarget.model);
    await user.type(
      screen.getByRole("searchbox", { name: "Search products" }),
      searchTerm,
    );

    expect(await screen.findByText(modelSearchTarget.model)).toBeInTheDocument();
    expect(screen.queryByText(firstProduct.model)).not.toBeInTheDocument();
    expectProductRequests(1);
  });

  it("keeps four product columns at the reference desktop width", async () => {
    const products = createProductCatalog(12);
    setViewportSize(1000, 1300);
    mockProductRowMeasurements(280);
    server.use(http.get(PRODUCTS_URL, () => HttpResponse.json(products)));

    render(<App />);

    expect(await screen.findByText("Product 12")).toBeInTheDocument();
    const productRows = screen.getAllByRole("list", { name: /Product row/ });
    expect(productRows).toHaveLength(3);
    expect(
      productRows.map((row) => within(row).getAllByRole("listitem").length),
    ).toEqual([4, 4, 4]);
  });

  it("scrolls through all products while virtualizing offscreen rows", async () => {
    const products = createProductCatalog(100);
    setViewportSize(390, 768);
    mockProductRowMeasurements(420);
    server.use(http.get(PRODUCTS_URL, () => HttpResponse.json(products)));

    render(<App />);

    expect(await screen.findByText("Product 1")).toBeInTheDocument();
    expect(
      screen.queryByRole("navigation", { name: "Product pagination" }),
    ).not.toBeInTheDocument();
    expect(screen.queryByText("Product 100")).not.toBeInTheDocument();

    scrollWindowTo(420 * 12);
    expect(await screen.findByText("Product 13")).toBeInTheDocument();
    expect(screen.queryByText("Product 1")).not.toBeInTheDocument();

    scrollWindowTo(420 * 90);
    expect(await screen.findByText("Product 91")).toBeInTheDocument();

    expectProductRequests(1);
    expect(screen.getAllByRole("list", { name: /Product row/ }).length).toBeLessThan(100);
    const visibleProductLinks =
      screen
        .getAllByRole("link")
        .filter((link) => link.getAttribute("href")?.startsWith("/products/"));
    expect(visibleProductLinks.length).toBeGreaterThan(0);
    expect(visibleProductLinks.length).toBeLessThan(100);
  });

  it("does not duplicate the list request when React Strict Mode replays effects", async () => {
    render(
      <StrictMode>
        <App />
      </StrictMode>,
    );

    expect(await screen.findByText(firstProduct.model)).toBeInTheDocument();
    expectProductRequests(1);
  });

  it("refreshes an expired cache when the list is opened", async () => {
    const previousProducts = [
      { ...productsFixture[0], model: "Old cached model" },
    ];
    await seedProductCache(previousProducts, Date.now() - 1_000);

    render(<App />);

    expect(await screen.findByText(firstProduct.model)).toBeInTheDocument();
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
    expect(await screen.findByText(firstProduct.model)).toBeInTheDocument();
  });

  it("shows an empty state when the API returns no products", async () => {
    server.use(http.get(PRODUCTS_URL, () => HttpResponse.json([])));

    render(<App />);

    expect(await screen.findByText("No products available")).toBeInTheDocument();
  });

  it("shows a no-results state for an unmatched local search", async () => {
    const user = userEvent.setup();
    render(<App />);

    await screen.findByText(firstProduct.model);
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

    expect(await screen.findByText(firstProduct.model)).toBeInTheDocument();
    expectProductRequests(2);
  });

  it("shows the cart count in the shared header", async () => {
    await cartStore.addItem(
      { id: "test-product", colorCode: 1000, storageCode: 2000 },
      3,
    );

    render(<App />);

    expect(
      await screen.findByRole("group", { name: "Cart items: 3" }),
    ).toBeInTheDocument();
  });
});
