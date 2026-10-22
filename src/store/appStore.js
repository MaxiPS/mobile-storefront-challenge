import { db } from "@/services/storage/dexieDatabase.js";

const CART_COUNT_KEY = "cartCount";

function isValidCartCount(count) {
  return Number.isInteger(count) && count >= 0;
}

export function createAppStore({ database = db } = {}) {
  let snapshot = Object.freeze({
    cartCount: null,
    isHydrated: false,
    hydrationError: null,
  });
  let initializationPromise;
  const listeners = new Set();

  function subscribe(listener) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  }

  function getSnapshot() {
    return snapshot;
  }

  function publish(patch) {
    const nextSnapshot = { ...snapshot, ...patch };
    const hasChanged = Object.keys(nextSnapshot).some(
      (key) => !Object.is(snapshot[key], nextSnapshot[key]),
    );

    if (!hasChanged) {
      return snapshot;
    }

    snapshot = Object.freeze(nextSnapshot);
    listeners.forEach((listener) => listener());
    return snapshot;
  }

  async function initialize() {
    if (!initializationPromise) {
      initializationPromise = (async () => {
        try {
          const savedState = await database.appState.get(CART_COUNT_KEY);
          const cartCount = isValidCartCount(savedState?.value)
            ? savedState.value
            : 0;
          publish({ cartCount, isHydrated: true, hydrationError: null });
        } catch (hydrationError) {
          publish({ cartCount: 0, isHydrated: true, hydrationError });
        }

        return snapshot;
      })();
    }

    return initializationPromise;
  }

  async function setCartCount(count) {
    if (!isValidCartCount(count)) {
      throw new TypeError("Cart count must be a non-negative integer");
    }

    await database.appState.put({
      key: CART_COUNT_KEY,
      value: count,
      updatedAt: Date.now(),
    });
    return publish({ cartCount: count, isHydrated: true, hydrationError: null });
  }

  return Object.freeze({ subscribe, getSnapshot, initialize, setCartCount });
}

export const appStore = createAppStore();
