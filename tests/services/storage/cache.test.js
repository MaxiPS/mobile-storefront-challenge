import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import detail from "../../fixtures/product-detail.json";
import products from "../../fixtures/products.json";
import { ApiError } from "@/services/api/productsApi.js";
import { CACHE_TTL_MS, createProductsCache } from "@/services/storage/cache.js";
import { createTestDatabase, disposeTestDatabase } from "../../helpers/createTestDatabase.js";

describe("IndexedDB response cache", () => {
  let database;
  let fetchProducts;
  let fetchProductById;
  let cache;
  let time;
  beforeEach(async () => {
    database = await createTestDatabase();
    fetchProducts = vi.fn().mockResolvedValue(products);
    fetchProductById = vi.fn().mockResolvedValue(detail);
    time = 1000;
    cache = createProductsCache({ database, fetchProducts, fetchProductById, now: () => time });
  });
  afterEach(async () => disposeTestDatabase(database));

  it("stores a fetched product list in IndexedDB", async () => {
    await cache.getProducts();
    expect(fetchProducts).toHaveBeenCalledTimes(1);
    expect(await database.apiCache.count()).toBe(1);
    expect((await database.apiCache.get("/product")).response).toEqual(products);
  });

  it("serves a fresh product list from IndexedDB", async () => {
    await cache.getProducts();
    fetchProducts.mockClear();
    expect(await cache.getProducts()).toEqual({ products, isStale: false });
    expect(fetchProducts).not.toHaveBeenCalled();
  });

  it("uses a stale list when refresh fails", async () => {
    await cache.getProducts();
    time += CACHE_TTL_MS;
    fetchProducts.mockRejectedValueOnce(new Error("offline"));
    expect(await cache.getProducts()).toEqual({ products, isStale: true });
  });

  it("serves a fresh cached product detail", async () => {
    const expectedResult = { product: detail, isStale: false };

    // Given the detail was fetched and cached
    await expect(cache.getProductDetail(detail.id)).resolves.toEqual(expectedResult);
    fetchProductById.mockClear();

    // When the same fresh detail is requested again
    await expect(cache.getProductDetail(detail.id)).resolves.toEqual(expectedResult);

    // Then the cached response is returned without another API call
    expect(fetchProductById).not.toHaveBeenCalled();
    expect(await database.apiCache.count()).toBe(1);
  });

  it("uses a stale detail when refresh fails", async () => {
    await cache.getProductDetail(detail.id);
    time += CACHE_TTL_MS;
    fetchProductById.mockRejectedValueOnce(new Error("offline"));
    expect(await cache.getProductDetail(detail.id)).toEqual({ product: detail, isStale: true });
  });

  it("does not serve a stale product after the API confirms it was deleted", async () => {
    await cache.getProductDetail(detail.id);
    time += CACHE_TTL_MS;
    fetchProductById.mockRejectedValueOnce(new ApiError(404));

    await expect(cache.getProductDetail(detail.id)).rejects.toMatchObject({ status: 404 });
    expect(await database.apiCache.get(`/product/${detail.id}`)).toBeUndefined();
  });

  it("fetches fresh data when reading the cache fails", async () => {
    const apiCache = {
      get: vi.fn().mockRejectedValue(new Error("IndexedDB read failed")),
      put: vi.fn().mockResolvedValue(undefined),
    };
    const fallbackCache = createProductsCache({
      database: { apiCache },
      fetchProducts,
      now: () => time,
    });

    await expect(fallbackCache.getProducts()).resolves.toEqual({
      products,
      isStale: false,
    });
    expect(fetchProducts).toHaveBeenCalledOnce();
  });

  it("returns fresh data when writing to the cache fails", async () => {
    const staleProducts = [{ ...products[0], model: "Saved model" }];
    const apiCache = {
      get: vi.fn().mockResolvedValue({
        key: "/product",
        response: staleProducts,
        savedAt: time - CACHE_TTL_MS,
        expiresAt: time - 1,
      }),
      put: vi.fn().mockRejectedValue(new Error("IndexedDB write failed")),
    };
    const fallbackCache = createProductsCache({
      database: { apiCache },
      fetchProducts,
      now: () => time,
    });

    await expect(fallbackCache.getProducts()).resolves.toEqual({
      products,
      isStale: false,
    });
  });

  it("preserves a 404 when deleting the invalidated cache entry fails", async () => {
    const apiCache = {
      get: vi.fn().mockResolvedValue({
        key: `/product/${detail.id}`,
        response: detail,
        savedAt: time - CACHE_TTL_MS,
        expiresAt: time - 1,
      }),
      delete: vi.fn().mockRejectedValue(new Error("IndexedDB delete failed")),
      put: vi.fn(),
    };
    const cacheWithDeleteFailure = createProductsCache({
      database: { apiCache },
      fetchProductById: vi.fn().mockRejectedValue(new ApiError(404)),
      now: () => time,
    });

    await expect(cacheWithDeleteFailure.getProductDetail(detail.id)).rejects.toMatchObject({
      status: 404,
    });
    expect(apiCache.delete).toHaveBeenCalledWith(`/product/${detail.id}`);
  });

  it("rejects invalid responses without writing them", async () => {
    fetchProducts.mockResolvedValueOnce([{ id: "" }]);
    await expect(cache.getProducts()).rejects.toThrow("Product API response is invalid");
    expect(await database.apiCache.count()).toBe(0);
  });

  it("rejects an invalid product detail without caching it", async () => {
    fetchProductById.mockResolvedValueOnce({ ...detail, id: "different-id" });

    await expect(cache.getProductDetail(detail.id)).rejects.toThrow(
      "Product API response is invalid",
    );
    expect(await database.apiCache.count()).toBe(0);
  });

  it("shares concurrent product list requests for the same cache key", async () => {
    // Given the API response is held pending
    let resolveProducts;
    fetchProducts.mockImplementationOnce(
      () => new Promise((resolve) => { resolveProducts = resolve; }),
    );

    // When the same product list is requested twice at the same time
    const firstRequest = cache.getProducts();
    const secondRequest = cache.getProducts();

    // Then both callers share one API request and receive its result
    await vi.waitFor(() => expect(fetchProducts).toHaveBeenCalledOnce());
    resolveProducts(products);

    await expect(Promise.all([firstRequest, secondRequest])).resolves.toEqual([
      { products, isStale: false },
      { products, isStale: false },
    ]);
  });

  it("shares concurrent product detail requests for the same product", async () => {
    // Given the product detail API response is held pending
    let resolveProduct;
    fetchProductById.mockImplementationOnce(
      () => new Promise((resolve) => { resolveProduct = resolve; }),
    );

    // When the same product detail is requested twice at the same time
    const firstRequest = cache.getProductDetail(detail.id);
    const secondRequest = cache.getProductDetail(detail.id);

    // Then both callers share one API request and receive its result
    await vi.waitFor(() => expect(fetchProductById).toHaveBeenCalledOnce());
    resolveProduct(detail);

    await expect(Promise.all([firstRequest, secondRequest])).resolves.toEqual([
      { product: detail, isStale: false },
      { product: detail, isStale: false },
    ]);
  });
});
