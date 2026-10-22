import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { StrictMode } from "react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import AppRoutes from "@/app/routes.jsx";
import {
  addProductToCart,
  getProductById,
  getProducts,
} from "@/services/api/productsApi.js";
import { db } from "@/services/storage/dexieDatabase.js";
import { appStore } from "@/store/appStore.js";
import productDetailFixture from "../fixtures/product-detail.json";
import productsFixture from "../fixtures/products.json";

vi.mock("@/services/api/productsApi.js", () => ({
  addProductToCart: vi.fn(),
  getProductById: vi.fn(),
  getProducts: vi.fn(),
}));

afterEach(cleanup);

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

function renderApplication({ strict = false } = {}) {
  const application = (
    <MemoryRouter initialEntries={[`/products/${productDetailFixture.id}`]}>
      <AppRoutes />
    </MemoryRouter>
  );

  return render(strict ? <StrictMode>{application}</StrictMode> : application);
}

beforeEach(async () => {
  vi.clearAllMocks();
  await clearDatabase();
  await appStore.setCartCount(0);
  getProducts.mockResolvedValue(productsFixture);
  getProductById.mockResolvedValue(productDetailFixture);
  addProductToCart.mockResolvedValue({ count: 4 });
});

describe("product details page", () => {
  it("loads and shows the available product specifications", async () => {
    renderApplication();

    expect(
      await screen.findByRole("heading", { name: "Iconia Talk S" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Acer")).toBeInTheDocument();
    expect(screen.getByText("170 \u20ac")).toBeInTheDocument();
    expect(screen.getByText("Quad-core 1.3 GHz Cortex-A53")).toBeInTheDocument();
    expect(screen.getByText("2 GB RAM")).toBeInTheDocument();
    expect(screen.getByText("Android 6.0 (Marshmallow)")).toBeInTheDocument();
    expect(screen.getByText("720 x 1280 pixels (~210 ppi pixel density)")).toBeInTheDocument();
    expect(
      screen.getByText("Non-removable Li-Ion 3400 mAh battery (12.92 Wh)"),
    ).toBeInTheDocument();
    expect(screen.getByText("13 MP, autofocus")).toBeInTheDocument();
    expect(screen.getByText("2 MP, 720p")).toBeInTheDocument();
    expect(
      screen.getByText("191.7 x 101 x 9.4 mm (7.55 x 3.98 x 0.37 in)"),
    ).toBeInTheDocument();
    expect(screen.getByText("260 g")).toBeInTheDocument();
    expect(getProductById).toHaveBeenCalledWith(productDetailFixture.id);
  });

  it("shows color and storage selectors with their first options selected", async () => {
    renderApplication();

    await screen.findByRole("heading", { name: "Iconia Talk S" });

    expect(screen.getByRole("combobox", { name: "Color" })).toHaveTextContent(
      "Black",
    );
    expect(screen.getByRole("combobox", { name: "Storage" })).toHaveTextContent(
      "16 GB",
    );
  });

  it("returns to the product listing from the detail page", async () => {
    const user = userEvent.setup();
    renderApplication();

    await screen.findByRole("heading", { name: "Iconia Talk S" });
    await user.click(screen.getByRole("link", { name: "Back to products" }));

    expect(await screen.findByRole("heading", { name: "Products" })).toBeInTheDocument();
    expect(await screen.findByText("Iconia Talk S")).toBeInTheDocument();
  });

  it("posts the selected variant codes and persists the updated cart count", async () => {
    const user = userEvent.setup();
    renderApplication();

    await screen.findByRole("heading", { name: "Iconia Talk S" });
    const storageSelect = screen.getByRole("combobox", { name: "Storage" });
    storageSelect.focus();
    await user.keyboard("{Enter}{ArrowDown}{Enter}");
    await user.click(screen.getByRole("button", { name: "Add to cart" }));

    await waitFor(() => {
      expect(addProductToCart).toHaveBeenCalledWith({
        id: productDetailFixture.id,
        colorCode: 1000,
        storageCode: 2001,
      });
    });
    expect(await screen.findByText("Added to cart")).toBeInTheDocument();
    expect(
      await screen.findByRole("group", { name: "Cart items: 4" }),
    ).toBeInTheDocument();
    expect(await db.appState.get("cartCount")).toMatchObject({ value: 4 });
  });

  it("disables the add button while the cart request is pending", async () => {
    const user = userEvent.setup();
    let resolveCartRequest;
    addProductToCart.mockReturnValue(
      new Promise((resolve) => {
        resolveCartRequest = resolve;
      }),
    );
    renderApplication();

    await screen.findByRole("heading", { name: "Iconia Talk S" });
    const addButton = screen.getByRole("button", { name: "Add to cart" });
    await user.click(addButton);

    expect(addButton).toBeDisabled();
    expect(addButton).toHaveTextContent("Adding");
    resolveCartRequest({ count: 4 });
    expect(await screen.findByText("Added to cart")).toBeInTheDocument();
  });

  it("shows an error when adding the product to the cart fails", async () => {
    const user = userEvent.setup();
    addProductToCart.mockRejectedValueOnce(new Error("Cart unavailable"));
    renderApplication();

    await screen.findByRole("heading", { name: "Iconia Talk S" });
    await user.click(screen.getByRole("button", { name: "Add to cart" }));

    expect(
      await screen.findByRole("alert", { name: "Cart update failed" }),
    ).toHaveTextContent("We couldn't add this product. Please try again.");
  });

  it("shows a loading state while the product detail request is pending", async () => {
    let resolveProduct;
    getProductById.mockReturnValue(
      new Promise((resolve) => {
        resolveProduct = resolve;
      }),
    );
    renderApplication();

    expect(screen.getByRole("status")).toHaveTextContent("Loading product");
    resolveProduct(productDetailFixture);
    expect(
      await screen.findByRole("heading", { name: "Iconia Talk S" }),
    ).toBeInTheDocument();
  });

  it("retries when loading the product detail fails", async () => {
    const user = userEvent.setup();
    getProductById
      .mockRejectedValueOnce(new Error("Network unavailable"))
      .mockResolvedValueOnce(productDetailFixture);
    renderApplication();

    expect(
      await screen.findByText("We couldn't load this product"),
    ).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Try again" }));

    expect(
      await screen.findByRole("heading", { name: "Iconia Talk S" }),
    ).toBeInTheDocument();
    expect(getProductById).toHaveBeenCalledTimes(2);
  });

  it("shows a not-found state when the API returns a 404", async () => {
    getProductById.mockRejectedValueOnce(
      Object.assign(new Error("API request failed with status 404"), {
        status: 404,
      }),
    );
    renderApplication();

    expect(
      await screen.findByRole("heading", { name: "Product not found" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Back to products" })).toHaveAttribute(
      "href",
      "/",
    );
  });

  it("uses a valid cached detail without calling the API again", async () => {
    const now = Date.now();
    await db.transaction("rw", db.apiCache, db.productDetails, async () => {
      await db.productDetails.put(productDetailFixture);
      await db.apiCache.put({
        key: `/product/${productDetailFixture.id}`,
        response: productDetailFixture,
        savedAt: now,
        expiresAt: now + 60_000,
      });
    });

    renderApplication();

    expect(
      await screen.findByRole("heading", { name: "Iconia Talk S" }),
    ).toBeInTheDocument();
    expect(getProductById).not.toHaveBeenCalled();
  });

  it("shows the saved detail with a stale notice when refresh fails", async () => {
    const now = Date.now();
    await db.transaction("rw", db.apiCache, db.productDetails, async () => {
      await db.productDetails.put(productDetailFixture);
      await db.apiCache.put({
        key: `/product/${productDetailFixture.id}`,
        response: productDetailFixture,
        savedAt: now - 120_000,
        expiresAt: now - 60_000,
      });
    });
    getProductById.mockRejectedValueOnce(new Error("Network unavailable"));

    renderApplication();

    expect(
      await screen.findByRole("heading", { name: "Iconia Talk S" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent(
      "Showing saved product details",
    );
    expect(getProductById).toHaveBeenCalledWith(productDetailFixture.id);
  });

  it("does not duplicate a detail request when React Strict Mode replays effects", async () => {
    renderApplication({ strict: true });

    expect(
      await screen.findByRole("heading", { name: "Iconia Talk S" }),
    ).toBeInTheDocument();
    expect(getProductById).toHaveBeenCalledTimes(1);
  });
});
