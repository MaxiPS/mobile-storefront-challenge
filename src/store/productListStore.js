import { productsCache } from "@/services/storage/cache.js";
import { productRepository } from "@/services/storage/productRepository.js";
import { createStore } from "@/store/createStore.js";

export function createProductListStore({
  cache = productsCache,
  repository = productRepository,
} = {}) {
  const store = createStore({
    products: [],
    visibleProducts: [],
    searchTerm: "",
    isSearchPending: false,
    status: "loading",
    isStale: false,
  });
  let loadVersion = 0;
  let searchVersion = 0;

  async function setSearchTerm(term) {
    const version = ++searchVersion;
    const { products, status } = store.getSnapshot();
    if (!term.trim()) {
      store.publish({ searchTerm: term, visibleProducts: products, isSearchPending: false });
      return;
    }
    store.publish({ searchTerm: term, visibleProducts: [], isSearchPending: status === "ready" });
    if (status !== "ready") return;
    try {
      const visibleProducts = await repository.searchProductsLocal(term);
      if (version === searchVersion) {
        store.publish({ visibleProducts, isSearchPending: false });
      }
    } catch {
      if (version === searchVersion) store.publish({ status: "error", isSearchPending: false });
    }
  }

  async function load() {
    const version = ++loadVersion;
    store.publish({ status: "loading", isSearchPending: false });
    try {
      const { products, isStale } = await cache.getProducts();
      if (version !== loadVersion) return;
      const searchTerm = store.getSnapshot().searchTerm;
      store.publish({ products, visibleProducts: searchTerm.trim() ? [] : products, status: "ready", isStale });
      if (searchTerm.trim()) await setSearchTerm(searchTerm);
    } catch {
      if (version === loadVersion) store.publish({ status: "error" });
    }
  }

  return {
    subscribe: store.subscribe,
    getSnapshot: store.getSnapshot,
    load,
    setSearchTerm,
  };
}

export const productListStore = createProductListStore();
