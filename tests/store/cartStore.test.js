import { describe, expect, it, vi } from "vitest";
import { createCartStore } from "@/store/cartStore.js";

describe("cartStore", () => {
  it("publishes an immutable in-memory snapshot", () => {
    const store = createCartStore();
    const initial = store.getSnapshot();
    expect(initial).toEqual({ cartCount: 0 });
    expect(Object.isFrozen(initial)).toBe(true);
    store.setCartCount(4);
    expect(store.getSnapshot()).toEqual({ cartCount: 4 });
    expect(createCartStore().getSnapshot().cartCount).toBe(0);
  });

  it("does not notify listeners when the count is unchanged", () => {
    const store = createCartStore();
    const listener = vi.fn();
    store.subscribe(listener);
    store.setCartCount(4);
    const snapshot = store.getSnapshot();
    store.setCartCount(4);
    expect(store.getSnapshot()).toBe(snapshot);
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it("stops notifying a listener after it unsubscribes", () => {
    const store = createCartStore();
    const listener = vi.fn();
    const unsubscribe = store.subscribe(listener);
    unsubscribe();
    store.setCartCount(5);
    expect(listener).not.toHaveBeenCalled();
  });

  it("rejects invalid counts", () => {
    const store = createCartStore();
    expect(() => store.setCartCount(-1)).toThrow(TypeError);
  });
});
