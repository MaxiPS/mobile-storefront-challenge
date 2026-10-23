import { useSyncExternalStore } from "react";
import { cartStore } from "@/store/cartStore.js";

export function useCartStore(store = cartStore) {
  return useSyncExternalStore(store.subscribe, store.getSnapshot);
}
