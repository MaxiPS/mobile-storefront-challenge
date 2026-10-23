import { useSyncExternalStore } from "react";
import { productListStore } from "@/store/productListStore.js";

export function useProductListStore(store = productListStore) {
  return useSyncExternalStore(store.subscribe, store.getSnapshot);
}
