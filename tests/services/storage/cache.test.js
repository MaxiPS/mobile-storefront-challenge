import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import detail from "../../fixtures/product-detail.json";
import products from "../../fixtures/products.json";
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
    await cache.getProductDetail(detail.id);
    fetchProductById.mockClear();
    await cache.getProductDetail(detail.id);
    expect(fetchProductById).not.toHaveBeenCalled();
    expect(await database.apiCache.count()).toBe(1);
  });

  it("uses a stale detail when refresh fails", async () => {
    await cache.getProductDetail(detail.id);
    time += CACHE_TTL_MS;
    fetchProductById.mockRejectedValueOnce(new Error("offline"));
    expect(await cache.getProductDetail(detail.id)).toEqual({ product: detail, isStale: true });
  });

  it("rejects invalid responses without writing them", async () => {
    fetchProducts.mockResolvedValueOnce([{ id: "" }]);
    await expect(cache.getProducts()).rejects.toThrow("Product API response is invalid");
    expect(await database.apiCache.count()).toBe(0);
  });
});
