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
