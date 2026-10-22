import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { useAppStore } from "@/hooks/useAppStore.js";
import { createAppStore } from "@/store/appStore.js";
import {
  createTestDatabase,
  disposeTestDatabase,
} from "../helpers/createTestDatabase.js";

describe("useAppStore", () => {
  let database;
  let store;

  beforeEach(async () => {
    database = await createTestDatabase();
    store = createAppStore({ database });
  });

  afterEach(async () => {
    cleanup();
    await disposeTestDatabase(database);
  });

  it("subscribes React to immutable store snapshot changes", async () => {
    const { result } = renderHook(() => useAppStore(store));
    const initialSnapshot = result.current;

    await act(async () => {
      await store.setCartCount(2);
    });

    expect(initialSnapshot).toMatchObject({ cartCount: null, isHydrated: false });
    expect(result.current).toMatchObject({ cartCount: 2, isHydrated: true });
    expect(result.current).not.toBe(initialSnapshot);
  });
});
