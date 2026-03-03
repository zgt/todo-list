"use client";

import type { ReactNode } from "react";
import { createContext, useContext, useState } from "react";

type ViewMode = "list" | "calendar";

interface ViewToggleContextType {
  viewMode: ViewMode;
  setViewMode: (mode: ViewMode) => void;
}

const ViewToggleContext = createContext<ViewToggleContextType | undefined>(
  undefined,
);

export function ViewToggleProvider({ children }: { children: ReactNode }) {
  const [viewMode, setViewMode] = useState<ViewMode>("list");

  return (
    <ViewToggleContext.Provider value={{ viewMode, setViewMode }}>
      {children}
    </ViewToggleContext.Provider>
  );
}

export function useViewToggle() {
  const context = useContext(ViewToggleContext);
  if (!context) {
    throw new Error("useViewToggle must be used within ViewToggleProvider");
  }
  return context;
}
