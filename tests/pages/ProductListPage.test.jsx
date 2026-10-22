import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { StrictMode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import App from "@/app/App.jsx";
import { getProducts } from "@/services/api/productsApi.js";
import { PRODUCT_LIST_CACHE_KEY } from "@/services/storage/cache.js";
import { db } from "@/services/storage/dexieDatabase.js";
import { productRepository } from "@/services/storage/productRepository.js";
import { appStore } from "@/store/appStore.js";
import productsFixture from "../fixtures/products.json";

vi.mock("@/services/api/productsApi.js", () => ({
  addProductToCart: vi.fn(),
  getProductById: vi.fn(),
  getProducts: vi.fn(),
}));

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

async function clearDatabase() {
  await db.transaction(
    "rw",
    db.apiCache,
    db.products,
    db.productDetails,
    db.appState,
    async () => {
      await Promise.all([
        db.apiCache.clear(),
        db.products.clear(),
        db.productDetails.clear(),
        db.appState.clear(),
      ]);
    },
  );
}

async function seedProductCache(products, expiresAt) {
  await productRepository.replaceProducts(products);
  await db.apiCache.put({
    key: PRODUCT_LIST_CACHE_KEY,
    response: products,
    savedAt: expiresAt - 60_000,
    expiresAt,
  });
}

beforeEach(async () => {
  vi.clearAllMocks();
  await clearDatabase();
  await appStore.setCartCount(0);
  getProducts.mockResolvedValue(productsFixture);
});

describe("product list page", () => {
  it("loads and caches products, then searches Dexie without another API request", async () => {
    const user = userEvent.setup();
    const searchSpy = vi.spyOn(productRepository, "searchProductsLocal");

    render(<App />);

    expect(await screen.findByText("Iconia Talk S")).toBeInTheDocument();
    expect(
      screen.getByRole("img", { name: "Acer Iconia Talk S" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Price unavailable")).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Mobile Storefront home" }),
    ).toHaveAttribute("href", "/");
    expect(
      screen.getByRole("navigation", { name: "breadcrumb" }),
    ).toBeInTheDocument();
    expect(getProducts).toHaveBeenCalledTimes(1);
    expect(await db.products.count()).toBe(productsFixture.length);

    await user.type(screen.getByRole("searchbox", { name: "Search products" }), "jAdE");

    expect(await screen.findByText("Liquid Jade 2")).toBeInTheDocument();
    expect(screen.queryByText("Iconia Talk S")).not.toBeInTheDocument();
    expect(searchSpy).toHaveBeenCalledWith("jAdE");
    expect(getProducts).toHaveBeenCalledTimes(1);
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
    expect(getProducts).toHaveBeenCalledTimes(1);
  });

  it("does not duplicate the list request when React Strict Mode replays effects", async () => {
    render(
      <StrictMode>
        <App />
      </StrictMode>,
    );

    expect(await screen.findByText("Iconia Talk S")).toBeInTheDocument();
    expect(getProducts).toHaveBeenCalledTimes(1);
  });

  it("reads a valid cached list from Dexie without calling the API", async () => {
    await seedProductCache(productsFixture, Date.now() + 60_000);

    render(<App />);

    expect(await screen.findByText("Iconia Talk S")).toBeInTheDocument();
    expect(getProducts).not.toHaveBeenCalled();
  });

  it("refreshes an expired cache when the list is opened", async () => {
    const previousProducts = [
      { ...productsFixture[0], model: "Old cached model" },
    ];
    await seedProductCache(previousProducts, Date.now() - 1_000);

    render(<App />);

    expect(await screen.findByText("Iconia Talk S")).toBeInTheDocument();
    expect(screen.queryByText("Old cached model")).not.toBeInTheDocument();
    expect(getProducts).toHaveBeenCalledTimes(1);
    await waitFor(async () => {
      expect(await db.apiCache.count()).toBe(1);
    });
  });

  it("shows a loading state while the list request is pending", async () => {
    let resolveProducts;
    getProducts.mockReturnValue(
      new Promise((resolve) => {
        resolveProducts = resolve;
      }),
    );

    render(<App />);

    expect(screen.getByRole("status")).toHaveTextContent("Loading products");
    resolveProducts(productsFixture);
    expect(await screen.findByText("Iconia Talk S")).toBeInTheDocument();
  });

  it("shows an empty state when the API returns no products", async () => {
    getProducts.mockResolvedValue([]);

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
    expect(getProducts).toHaveBeenCalledTimes(1);
  });

  it("lets the user retry after a list request fails", async () => {
    const user = userEvent.setup();
    getProducts
      .mockRejectedValueOnce(new Error("Network unavailable"))
      .mockResolvedValueOnce(productsFixture);

    render(<App />);

    expect(await screen.findByText("We couldn't load products")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Try again" }));

    expect(await screen.findByText("Iconia Talk S")).toBeInTheDocument();
    expect(getProducts).toHaveBeenCalledTimes(2);
  });

  it("shows the hydrated cart count in the shared header", async () => {
    await appStore.setCartCount(3);

    render(<App />);

    expect(
      await screen.findByRole("group", { name: "Cart items: 3" }),
    ).toBeInTheDocument();
  });
});
