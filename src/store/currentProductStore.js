import { productsCache } from "@/services/storage/cache.js";
import { createStore } from "@/store/createStore.js";

export function createCurrentProductStore({ cache = productsCache } = {}) {
  const store = createStore({
    id: null,
    product: null,
    status: "loading",
    isStale: false,
  });
  let loadVersion = 0;

  async function load(id) {
    const version = ++loadVersion;
    store.publish({ id, product: null, status: "loading", isStale: false });
    try {
      const { product, isStale } = await cache.getProductDetail(id);
      if (version === loadVersion) {
        store.publish({ id, product, status: "ready", isStale });
      }
    } catch (error) {
      if (version === loadVersion) {
        store.publish({
          id,
          product: null,
          status: error?.status === 404 ? "not-found" : "error",
          isStale: false,
        });
      }
    }
  }

  return { subscribe: store.subscribe, getSnapshot: store.getSnapshot, load };
}

export const currentProductStore = createCurrentProductStore();
