import { describe, expect, it, vi } from "vitest";
import { createCartStore } from "@/store/cartStore.js";

describe("cartStore", () => {
  it("loads the persisted cart count into an immutable in-memory snapshot", async () => {
    const repository = { getCount: vi.fn().mockResolvedValue(3) };
    const store = createCartStore({ repository });

    await store.load();

    expect(repository.getCount).toHaveBeenCalledOnce();
    expect(store.getSnapshot()).toEqual({ cartCount: 3 });
    expect(Object.isFrozen(store.getSnapshot())).toBe(true);
  });

  it("publishes the cart count after the selected variant is persisted", async () => {
    // Given the repository has not finished persisting the selected variant
    const selection = { id: "phone-1", colorCode: 1000, storageCode: 2000 };
    let finishPersistence;
    const repository = {
      addItem: vi.fn(() => new Promise((resolve) => { finishPersistence = resolve; })),
    };
    const store = createCartStore({ repository });
    const listener = vi.fn();
    store.subscribe(listener);

    // When adding the selected variant
    const addingItem = store.addItem(selection, 1);

    expect(repository.addItem).toHaveBeenCalledWith(selection, 1);

    // Then keep the current count while persistence is still pending
    expect(store.getSnapshot()).toEqual({ cartCount: 0 });
    expect(listener).not.toHaveBeenCalled();

    // When the repository confirms persistence
    finishPersistence(2);
    await addingItem;

    // Then publish the persisted count
    expect(store.getSnapshot()).toEqual({ cartCount: 2 });
    expect(listener).toHaveBeenCalledOnce();
  });

  it("does not notify listeners when loading an unchanged count", async () => {
    const repository = { getCount: vi.fn().mockResolvedValue(0) };
    const store = createCartStore({ repository });
    const listener = vi.fn();
    store.subscribe(listener);

    await store.load();

    expect(store.getSnapshot()).toEqual({ cartCount: 0 });
    expect(listener).not.toHaveBeenCalled();
  });
});
