import { createStore } from "@/store/createStore.js";

export function createCartStore() {
  const store = createStore({ cartCount: 0 });

  function setCartCount(count) {
    if (!Number.isInteger(count) || count < 0) {
      throw new TypeError("Cart count must be a non-negative integer");
    }
    return store.publish({ cartCount: count });
  }

  return { subscribe: store.subscribe, getSnapshot: store.getSnapshot, setCartCount };
}

export const cartStore = createCartStore();
