import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import productDetailFixture from "../../fixtures/product-detail.json";
import productsFixture from "../../fixtures/products.json";
import { CACHE_TTL_MS, createProductsCache } from "@/services/storage/cache.js";
import { createProductRepository } from "@/services/storage/productRepository.js";
import {
  createTestDatabase,
  disposeTestDatabase,
} from "../../helpers/createTestDatabase.js";

describe("GET response cache", () => {
  let database;
  let repository;
  let currentTime;
  let fetchProducts;
  let fetchProductById;
  let cache;

  beforeEach(async () => {
    database = await createTestDatabase();
    repository = createProductRepository(database);
    currentTime = 1_000_000;
    fetchProducts = vi.fn().mockResolvedValue(productsFixture);
    fetchProductById = vi.fn().mockResolvedValue(productDetailFixture);
    cache = createProductsCache({
      database,
      repository,
      fetchProducts,
      fetchProductById,
      now: () => currentTime,
    });
  });

  afterEach(async () => {
    await disposeTestDatabase(database);
  });

  it("fetches a missing product list and saves it with a one-hour TTL", async () => {
    const result = await cache.getProducts();

    expect(fetchProducts).toHaveBeenCalledTimes(1);
    expect(result).toMatchObject({ isStale: false });
    expect(result.products.map(({ id }) => id)).toEqual(
      productsFixture.map(({ id }) => id),
    );
    await expect(database.apiCache.get("/product")).resolves.toMatchObject({
      key: "/product",
      response: productsFixture,
      savedAt: currentTime,
      expiresAt: currentTime + CACHE_TTL_MS,
    });
    await expect(database.products.count()).resolves.toBe(productsFixture.length);
  });

  it("reads a fresh product list locally without calling the API again", async () => {
    await cache.getProducts();
    fetchProducts.mockClear();
    currentTime += CACHE_TTL_MS - 1;

    const result = await cache.getProducts();

    expect(fetchProducts).not.toHaveBeenCalled();
    expect(result.isStale).toBe(false);
    expect(result.products.map(({ id }) => id)).toEqual(
      productsFixture.map(({ id }) => id),
    );
  });

  it("revalidates expired products atomically and removes expired cache entries", async () => {
    await cache.getProducts();
    const replacementProducts = [productsFixture[1]];
    fetchProducts.mockResolvedValue(replacementProducts);
    await database.apiCache.put({
      key: "/product/old",
      response: {},
      savedAt: currentTime - 2 * CACHE_TTL_MS,
      expiresAt: currentTime - 1,
    });
    currentTime += CACHE_TTL_MS;

    const result = await cache.getProducts();

    expect(fetchProducts).toHaveBeenCalledTimes(2);
    expect(result.products.map(({ id }) => id)).toEqual([
      replacementProducts[0].id,
    ]);
    await expect(database.apiCache.get("/product/old")).resolves.toBeUndefined();
    await expect(database.apiCache.get("/product")).resolves.toMatchObject({
      response: replacementProducts,
      savedAt: currentTime,
      expiresAt: currentTime + CACHE_TTL_MS,
    });
    await expect(database.products.count()).resolves.toBe(1);
  });

  it("keeps the previous products and cache entry if revalidation cannot commit", async () => {
    await cache.getProducts();
    currentTime += CACHE_TTL_MS;
    fetchProducts.mockResolvedValue([productsFixture[1]]);
    vi.spyOn(database.apiCache, "put").mockRejectedValueOnce(
      new Error("Storage unavailable"),
    );

    const result = await cache.getProducts();

    expect(result.isStale).toBe(true);
    expect(result.products.map(({ id }) => id)).toEqual(
      productsFixture.map(({ id }) => id),
    );
    await expect(database.apiCache.get("/product")).resolves.toMatchObject({
      response: productsFixture,
    });
    await expect(database.products.count()).resolves.toBe(productsFixture.length);
  });

  it("returns expired local products as stale data when revalidation fails", async () => {
    await cache.getProducts();
    currentTime += CACHE_TTL_MS;
    fetchProducts.mockRejectedValue(new TypeError("Network unavailable"));

    const result = await cache.getProducts();

    expect(result.isStale).toBe(true);
    expect(result.products.map(({ id }) => id)).toEqual(
      productsFixture.map(({ id }) => id),
    );
  });

  it("propagates API errors when no cached product list is available", async () => {
    const networkError = new TypeError("Network unavailable");
    fetchProducts.mockRejectedValue(networkError);

    await expect(cache.getProducts()).rejects.toBe(networkError);
    await expect(database.apiCache.count()).resolves.toBe(0);
  });

  it("does not cache invalid product API responses", async () => {
    fetchProducts.mockResolvedValue([{ id: "", brand: "Acer" }]);

    await expect(cache.getProducts()).rejects.toThrow(
      "Product API response must be an array of products",
    );
    await expect(database.apiCache.count()).resolves.toBe(0);
    await expect(database.products.count()).resolves.toBe(0);
  });

  it("caches product details by ID and reuses a fresh local detail", async () => {
    const first = await cache.getProductDetail(productDetailFixture.id);
    fetchProductById.mockClear();
    const second = await cache.getProductDetail(productDetailFixture.id);

    expect(first).toMatchObject({ product: productDetailFixture, isStale: false });
    expect(second).toMatchObject({ product: productDetailFixture, isStale: false });
    expect(fetchProductById).not.toHaveBeenCalled();
    await expect(
      database.apiCache.get(`/product/${productDetailFixture.id}`),
    ).resolves.toMatchObject({ response: productDetailFixture });
    await expect(
      database.productDetails.get(productDetailFixture.id),
    ).resolves.toEqual(productDetailFixture);
  });

  it("returns an expired product detail as stale data when the API is unavailable", async () => {
    await cache.getProductDetail(productDetailFixture.id);
    currentTime += CACHE_TTL_MS;
    fetchProductById.mockRejectedValue(new TypeError("Network unavailable"));

    const result = await cache.getProductDetail(productDetailFixture.id);

    expect(result).toMatchObject({
      product: productDetailFixture,
      isStale: true,
    });
  });
});
