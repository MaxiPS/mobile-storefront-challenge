import { useSyncExternalStore } from "react";
import { appStore } from "@/store/appStore.js";

export function useAppStore(store = appStore) {
  return useSyncExternalStore(store.subscribe, store.getSnapshot);
}
