import { db } from "@/services/storage/dexieDatabase.js";

export function normalizeSearchValue(value) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

export function createProductRepository(database = db) {
  async function searchProductsLocal(term) {
    const entry = await database.apiCache.get("/product");
    const products = Array.isArray(entry?.response) ? entry.response : [];
    const normalizedTerm = normalizeSearchValue(term);
    if (!normalizedTerm) return products;

    return products.filter(
      ({ brand, model }) =>
        normalizeSearchValue(brand).includes(normalizedTerm) ||
        normalizeSearchValue(model).includes(normalizedTerm),
    );
  }

  return { searchProductsLocal };
}

export const productRepository = createProductRepository();
