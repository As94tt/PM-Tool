"use client";

import { createContext, useContext, useState, type ReactNode } from "react";
import { useStore } from "zustand";
import { createAppStore, type AppStore, type AppState } from "./app-store";

const AppStoreContext = createContext<AppStore | null>(null);

export function AppStoreProvider({ children }: { children: ReactNode }) {
  const [store] = useState(() => createAppStore());
  return <AppStoreContext.Provider value={store}>{children}</AppStoreContext.Provider>;
}

export function useAppStore<T>(selector: (state: AppState) => T): T {
  const store = useContext(AppStoreContext);
  if (!store) throw new Error("useAppStore must be used within AppStoreProvider");
  return useStore(store, selector);
}

/** The raw store instance — for the rare action that needs the persist
 * middleware's own API (e.g. clearStorage()) rather than reading/writing
 * state through the selector hook above. */
export function useAppStoreApi(): AppStore {
  const store = useContext(AppStoreContext);
  if (!store) throw new Error("useAppStoreApi must be used within AppStoreProvider");
  return store;
}
