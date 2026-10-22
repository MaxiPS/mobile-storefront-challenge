import { getProductById, getProducts } from "@/services/api/productsApi.js";
import { db } from "@/services/storage/dexieDatabase.js";
import {
  createProductRepository,
  prepareProductsForStorage,
} from "@/services/storage/productRepository.js";

export const CACHE_TTL_MS = 60 * 60 * 1000;
export const PRODUCT_LIST_CACHE_KEY = "/product";

function isValidProduct(product) {
  return Boolean(
    product && typeof product.id === "string" && product.id.trim(),
  );
}

function isValidProductList(products) {
  return (
    Array.isArray(products) &&
    products.every((product) => isValidProduct(product))
  );
}

async function deleteExpiredEntries(database, timestamp) {
  await database.apiCache.where("expiresAt").belowOrEqual(timestamp).delete();
}

export function createProductsCache({
  database = db,
  repository = createProductRepository(database),
  fetchProducts = getProducts,
  fetchProductById = getProductById,
  now = () => Date.now(),
  ttlMs = CACHE_TTL_MS,
} = {}) {
  async function getProductsWithCache() {
    const checkedAt = now();
    const cachedEntry = await database.apiCache.get(PRODUCT_LIST_CACHE_KEY);

    if (cachedEntry && cachedEntry.expiresAt > checkedAt) {
      let products = await repository.getProductsLocal();

      if (products.length !== cachedEntry.response.length) {
        products = await repository.replaceProducts(cachedEntry.response);
      }

      return { products, isStale: false };
    }

    try {
      const products = await fetchProducts();
      if (!isValidProductList(products)) {
        throw new TypeError("Product API response must be an array of products");
      }

      const savedAt = now();
      const productRecords = prepareProductsForStorage(products);
      await database.transaction(
        "rw",
        database.apiCache,
        database.products,
        async () => {
          await database.products.clear();
          if (productRecords.length > 0) {
            await database.products.bulkPut(productRecords);
          }
          await deleteExpiredEntries(database, savedAt);
          await database.apiCache.put({
            key: PRODUCT_LIST_CACHE_KEY,
            response: products,
            savedAt,
            expiresAt: savedAt + ttlMs,
          });
        },
      );

      return {
        products: await repository.getProductsLocal(),
        isStale: false,
      };
    } catch (error) {
      if (cachedEntry && cachedEntry.expiresAt <= checkedAt) {
        let products = await repository.getProductsLocal();
        if (products.length !== cachedEntry.response.length) {
          products = await repository.replaceProducts(cachedEntry.response);
        }
        return { products, isStale: true };
      }

      throw error;
    }
  }

  async function getProductDetailWithCache(id) {
    const cacheKey = `/product/${id}`;
    const checkedAt = now();
    const cachedEntry = await database.apiCache.get(cacheKey);

    if (cachedEntry && cachedEntry.expiresAt > checkedAt) {
      let product = await repository.getProductDetailLocal(id);

      if (!product) {
        product = cachedEntry.response;
        await repository.saveProductDetail(product);
      }

      return { product, isStale: false };
    }

    try {
      const product = await fetchProductById(id);
      if (!isValidProduct(product) || product.id !== id) {
        throw new TypeError("Product detail API response has an invalid ID");
      }

      const savedAt = now();
      await database.transaction(
        "rw",
        database.apiCache,
        database.productDetails,
        async () => {
          await database.productDetails.put(product);
          await deleteExpiredEntries(database, savedAt);
          await database.apiCache.put({
            key: cacheKey,
            response: product,
            savedAt,
            expiresAt: savedAt + ttlMs,
          });
        },
      );

      return { product, isStale: false };
    } catch (error) {
      if (cachedEntry && cachedEntry.expiresAt <= checkedAt) {
        const product = await repository.getProductDetailLocal(id);
        if (product) {
          return { product, isStale: true };
        }
      }

      throw error;
    }
  }

  return {
    getProducts: getProductsWithCache,
    getProductDetail: getProductDetailWithCache,
  };
}

export const productsCache = createProductsCache();

export const getProductsWithCache = productsCache.getProducts;
export const getProductDetailWithCache = productsCache.getProductDetail;
