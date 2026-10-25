import { createStore } from "@/store/createStore.js";
import { cartRepository } from "@/services/storage/cartRepository.js";

export function createCartStore({ repository = cartRepository } = {}) {
  const store = createStore({ cartCount: 0 });

  async function load() {
    const cartCount = await repository.getCount();
    return store.publish({ cartCount });
  }

  async function addItem(selection, apiCount) {
    const cartCount = await repository.addItem(selection, apiCount);
    return store.publish({ cartCount });
  }

  return {
    subscribe: store.subscribe,
    getSnapshot: store.getSnapshot,
    load,
    addItem,
  };
}

export const cartStore = createCartStore();
