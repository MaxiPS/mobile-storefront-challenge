import { db } from "@/services/storage/dexieDatabase.js";

export function normalizeSearchValue(value) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

export function prepareProductsForStorage(products) {
  if (!Array.isArray(products)) {
    throw new TypeError("Products must be an array");
  }

  return products.map((product, sortOrder) => {
    if (!product || typeof product.id !== "string" || !product.id.trim()) {
      throw new TypeError("Every product must have a non-empty string ID");
    }

    return {
      ...product,
      brandSearch: normalizeSearchValue(product.brand),
      modelSearch: normalizeSearchValue(product.model),
      sortOrder,
    };
  });
}

export function createProductRepository(database = db) {
  async function replaceProducts(products) {
    const records = prepareProductsForStorage(products);

    await database.transaction("rw", database.products, async () => {
      await database.products.clear();
      if (records.length > 0) {
        await database.products.bulkPut(records);
      }
    });

    return getProductsLocal();
  }

  async function getProductsLocal() {
    const products = await database.products.toArray();
    return products.sort((left, right) => left.sortOrder - right.sortOrder);
  }

  async function searchProductsLocal(term) {
    const normalizedTerm = normalizeSearchValue(term);
    const products = await getProductsLocal();

    if (!normalizedTerm) {
      return products;
    }

    return products.filter(
      ({ brandSearch, modelSearch }) =>
        brandSearch.includes(normalizedTerm) ||
        modelSearch.includes(normalizedTerm),
    );
  }

  async function saveProductDetail(product) {
    if (!product || typeof product.id !== "string" || !product.id.trim()) {
      throw new TypeError("A product detail must have a non-empty string ID");
    }

    await database.productDetails.put(product);
    return product;
  }

  async function getProductDetailLocal(id) {
    return database.productDetails.get(id);
  }

  return {
    replaceProducts,
    getProductsLocal,
    searchProductsLocal,
    saveProductDetail,
    getProductDetailLocal,
  };
}

export const productRepository = createProductRepository();

export const {
  replaceProducts,
  getProductsLocal,
  searchProductsLocal,
  saveProductDetail,
  getProductDetailLocal,
} = productRepository;
