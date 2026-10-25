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

  it("persists a selected variant before publishing the updated count", async () => {
    const selection = { id: "phone-1", colorCode: 1000, storageCode: 2000 };
    const repository = { addItem: vi.fn().mockResolvedValue(2) };
    const store = createCartStore({ repository });
    const listener = vi.fn();
    store.subscribe(listener);

    await store.addItem(selection, 1);

    expect(repository.addItem).toHaveBeenCalledWith(selection, 1);
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
