import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createAppStore } from "@/store/appStore.js";
import {
  createTestDatabase,
  disposeTestDatabase,
} from "../helpers/createTestDatabase.js";

describe("appStore", () => {
  let database;
  let store;

  beforeEach(async () => {
    database = await createTestDatabase();
    store = createAppStore({ database });
  });

  afterEach(async () => {
    await disposeTestDatabase(database);
  });

  it("starts with a stable, synchronous, unhydrated snapshot", () => {
    const initialSnapshot = store.getSnapshot();

    expect(initialSnapshot).toMatchObject({ cartCount: null, isHydrated: false });
    expect(initialSnapshot).toBe(store.getSnapshot());
    expect(Object.isFrozen(initialSnapshot)).toBe(true);
  });

  it("hydrates the cart count from Dexie and reuses the hydrated snapshot", async () => {
    await database.appState.put({ key: "cartCount", value: 6 });
    const initialSnapshot = store.getSnapshot();

    await store.initialize();

    const hydratedSnapshot = store.getSnapshot();
    expect(hydratedSnapshot).toMatchObject({ cartCount: 6, isHydrated: true });
    expect(hydratedSnapshot).not.toBe(initialSnapshot);
    expect(await store.initialize()).toBe(hydratedSnapshot);
    expect(store.getSnapshot()).toBe(hydratedSnapshot);
  });

  it("uses zero as the hydrated count when no persisted value exists", async () => {
    await store.initialize();

    expect(store.getSnapshot()).toMatchObject({ cartCount: 0, isHydrated: true });
  });

  it("notifies subscribers and persists updated cart counts", async () => {
    const subscriber = vi.fn();
    const unsubscribe = store.subscribe(subscriber);

    await store.setCartCount(4);

    expect(subscriber).toHaveBeenCalledTimes(1);
    expect(store.getSnapshot()).toMatchObject({ cartCount: 4, isHydrated: true });
    expect(await database.appState.get("cartCount")).toMatchObject({
      key: "cartCount",
      value: 4,
    });

    unsubscribe();
    await store.setCartCount(5);
    expect(subscriber).toHaveBeenCalledTimes(1);
  });

  it("does not publish a new snapshot when the state is unchanged", async () => {
    const subscriber = vi.fn();
    store.subscribe(subscriber);

    await store.setCartCount(3);
    const snapshot = store.getSnapshot();
    await store.setCartCount(3);

    expect(store.getSnapshot()).toBe(snapshot);
    expect(subscriber).toHaveBeenCalledTimes(1);
  });

  it("publishes a safe hydrated state and exposes a database read error", async () => {
    const databaseError = new Error("Storage unavailable");
    vi.spyOn(database.appState, "get").mockRejectedValue(databaseError);

    await store.initialize();

    expect(store.getSnapshot()).toMatchObject({
      cartCount: 0,
      isHydrated: true,
      hydrationError: databaseError,
    });
  });
});
