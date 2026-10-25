import { describe, expect, it, vi } from "vitest";
import { createCurrentProductStore } from "@/store/currentProductStore.js";
import { createProductListStore } from "@/store/productListStore.js";

describe("product stores", () => {
  it("ignores outdated local search results", async () => {
    // Given two local searches are still pending
    const pending = [];
    const cache = { getProducts: vi.fn().mockResolvedValue({ products: [{ id: "1" }], isStale: false }) };
    const repository = {
      searchProductsLocal: vi.fn().mockImplementation((term) => new Promise((resolve) => pending.push({ term, resolve }))),
    };
    const store = createProductListStore({ cache, repository });
    await store.load();

    // When the newer search resolves before the older search
    const first = store.setSearchTerm("a");
    const second = store.setSearchTerm("ab");
    pending[1].resolve([{ id: "2" }]);
    await second;
    pending[0].resolve([{ id: "1" }]);
    await first;

    // Then the store keeps the results and term from the latest search
    expect(store.getSnapshot().visibleProducts).toEqual([{ id: "2" }]);
    expect(store.getSnapshot().searchTerm).toBe("ab");
  });

  it("ignores an older product detail after route changes", async () => {
    // Given two product detail requests are pending for successive routes
    const pending = [];
    const cache = {
      getProductDetail: vi.fn().mockImplementation((id) => new Promise((resolve) => pending.push({ id, resolve }))),
    };
    const store = createCurrentProductStore({ cache });

    // When the newer route resolves before the previous route
    const first = store.load("first");
    const second = store.load("second");
    pending[1].resolve({ product: { id: "second" }, isStale: false });
    await second;
    pending[0].resolve({ product: { id: "first" }, isStale: false });
    await first;

    // Then the store keeps the product for the current route
    expect(store.getSnapshot().product.id).toBe("second");
  });
});
