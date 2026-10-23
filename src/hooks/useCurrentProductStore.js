import { useSyncExternalStore } from "react";
import { currentProductStore } from "@/store/currentProductStore.js";

export function useCurrentProductStore(store = currentProductStore) {
  return useSyncExternalStore(store.subscribe, store.getSnapshot);
}
