import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import productDetailFixture from "../../fixtures/product-detail.json";
import productsFixture from "../../fixtures/products.json";
import {
  addProductToCart,
  getProductById,
  getProducts,
} from "@/services/api/productsApi.js";

const API_BASE_URL = "https://itx-frontend-test.onrender.com/api";

function createJsonResponse(data, { ok = true, status = 200 } = {}) {
  return {
    ok,
    status,
    json: vi.fn().mockResolvedValue(data),
  };
}

describe("productsApi", () => {
  let fetchMock;

  beforeEach(() => {
    fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("fetches and returns the product list without changing API values", async () => {
    fetchMock.mockResolvedValue(createJsonResponse(productsFixture));

    await expect(getProducts()).resolves.toEqual(productsFixture);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][0]).toBe(`${API_BASE_URL}/product`);
    expect(productsFixture[0].price).toBe("170");
    expect(productsFixture[1].price).toBe("");
  });

  it("fetches a product detail by its identifier", async () => {
    fetchMock.mockResolvedValue(createJsonResponse(productDetailFixture));

    await expect(getProductById(productDetailFixture.id)).resolves.toEqual(
      productDetailFixture,
    );

    expect(fetchMock.mock.calls[0][0]).toBe(
      `${API_BASE_URL}/product/${productDetailFixture.id}`,
    );
  });

  it("posts the selected product variants to the cart", async () => {
    const cartResponse = { count: 3 };
    const selection = {
      id: productDetailFixture.id,
      colorCode: 1000,
      storageCode: 2001,
    };
    fetchMock.mockResolvedValue(createJsonResponse(cartResponse));

    await expect(addProductToCart(selection)).resolves.toEqual(cartResponse);

    expect(fetchMock).toHaveBeenCalledWith(`${API_BASE_URL}/cart`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(selection),
    });
  });

  it("rejects HTTP errors with the response status", async () => {
    fetchMock.mockResolvedValue(
      createJsonResponse({}, { ok: false, status: 503 }),
    );

    await expect(getProducts()).rejects.toThrow(
      "API request failed with status 503",
    );
  });

  it("exposes a not-found HTTP status for missing product details", async () => {
    fetchMock.mockResolvedValue(
      createJsonResponse({}, { ok: false, status: 404 }),
    );

    const error = await getProductById("missing-product").catch((requestError) =>
      requestError,
    );

    expect(error).toMatchObject({
      message: "API request failed with status 404",
      status: 404,
    });
  });

  it("preserves network errors from fetch", async () => {
    const networkError = new TypeError("Network unavailable");
    fetchMock.mockRejectedValue(networkError);

    await expect(getProducts()).rejects.toBe(networkError);
  });
});
