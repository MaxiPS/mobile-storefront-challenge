import { getProductById, getProducts } from "@/services/api/productsApi.js";
import { db } from "@/services/storage/dexieDatabase.js";

export const CACHE_TTL_MS = 60 * 60 * 1000;
export const PRODUCT_LIST_CACHE_KEY = "/product";

function isValidProduct(product) {
  return Boolean(product && typeof product.id === "string" && product.id.trim());
}

function isValidProductList(products) {
  return Array.isArray(products) && products.every(isValidProduct);
}

export function createProductsCache({
  database = db,
  fetchProducts = getProducts,
  fetchProductById = getProductById,
  now = () => Date.now(),
  ttlMs = CACHE_TTL_MS,
} = {}) {
  let productsRequest;
  const productDetailRequests = new Map();

  async function readCachedEntry(key) {
    try {
      return await database.apiCache.get(key);
    } catch {
      return undefined;
    }
  }

  async function removeCachedEntry(key) {
    try {
      await database.apiCache.delete(key);
    } catch {
      // A storage failure must not hide the API's not-found response.
    }
  }

  async function saveCachedEntry(key, response) {
    const savedAt = now();
    try {
      await database.apiCache.put({ key, response, savedAt, expiresAt: savedAt + ttlMs });
    } catch {
      // The fresh API response remains usable when IndexedDB is unavailable.
    }
  }

  async function load(key, fetchResponse, validate) {
    const cachedEntry = await readCachedEntry(key);
    const hasValidCachedResponse = Boolean(
      cachedEntry && validate(cachedEntry.response),
    );

    if (cachedEntry && !hasValidCachedResponse) {
      await removeCachedEntry(key);
    }

    if (
      hasValidCachedResponse &&
      cachedEntry.expiresAt > now()
    ) {
      return { response: cachedEntry.response, isStale: false };
    }

    try {
      const response = await fetchResponse();
      if (!validate(response)) throw new TypeError("Product API response is invalid");
      await saveCachedEntry(key, response);
      return { response, isStale: false };
    } catch (error) {
      if (error?.status === 404) {
        await removeCachedEntry(key);
        throw error;
      }
      if (hasValidCachedResponse) {
        return { response: cachedEntry.response, isStale: true };
      }
      throw error;
    }
  }

  function getProductsWithCache() {
    if (!productsRequest) {
      productsRequest = load(PRODUCT_LIST_CACHE_KEY, fetchProducts, isValidProductList)
        .then(({ response, isStale }) => ({ products: response, isStale }))
        .finally(() => { productsRequest = undefined; });
    }
    return productsRequest;
  }

  function getProductDetailWithCache(id) {
    if (!productDetailRequests.has(id)) {
      const request = load(
        `/product/${id}`,
        () => fetchProductById(id),
        (product) => isValidProduct(product) && product.id === id,
      )
        .then(({ response, isStale }) => ({ product: response, isStale }))
        .finally(() => productDetailRequests.delete(id));
      productDetailRequests.set(id, request);
    }
    return productDetailRequests.get(id);
  }

  return { getProducts: getProductsWithCache, getProductDetail: getProductDetailWithCache };
}

export const productsCache = createProductsCache();
export const getProductsWithCache = productsCache.getProducts;
export const getProductDetailWithCache = productsCache.getProductDetail;
