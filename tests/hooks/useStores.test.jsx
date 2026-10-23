import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { useCartStore } from "@/hooks/useCartStore.js";
import { useCurrentProductStore } from "@/hooks/useCurrentProductStore.js";
import { useProductListStore } from "@/hooks/useProductListStore.js";
import { createCartStore } from "@/store/cartStore.js";
import { createCurrentProductStore } from "@/store/currentProductStore.js";
import { createProductListStore } from "@/store/productListStore.js";

afterEach(cleanup);

describe("external store hooks", () => {
  it("subscribes to cart snapshots", () => {
    const cart = createCartStore();
    const { result } = renderHook(() => useCartStore(cart));

    act(() => cart.setCartCount(2));

    expect(result.current.cartCount).toBe(2);
  });

  it("subscribes to product list snapshots", async () => {
    const list = createProductListStore({
      cache: { getProducts: async () => ({ products: [{ id: "1", brand: "Acer" }], isStale: false }) },
    });
    const { result } = renderHook(() => useProductListStore(list));

    await act(async () => { await list.load(); });

    expect(result.current.products).toHaveLength(1);
  });

  it("subscribes to current product snapshots", async () => {
    const current = createCurrentProductStore({
      cache: { getProductDetail: async () => ({ product: { id: "1" }, isStale: false }) },
    });
    const { result } = renderHook(() => useCurrentProductStore(current));

    await act(async () => { await current.load("1"); });

    expect(result.current.product.id).toBe("1");
  });
});
