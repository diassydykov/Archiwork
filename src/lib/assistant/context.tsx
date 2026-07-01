"use client";

import { createContext, useCallback, useContext, useState } from "react";
import type { BuildingType } from "@/types";

interface AssistantContextValue {
  buildingType: BuildingType | null;
  setBuildingType: (type: BuildingType | null) => void;
  insertDescription: (text: string) => void;
  registerInsertHandler: (handler: (text: string) => void) => () => void;
}

const AssistantContext = createContext<AssistantContextValue | null>(null);

export function AssistantProvider({ children }: { children: React.ReactNode }) {
  const [buildingType, setBuildingType] = useState<BuildingType | null>(null);
  const [insertHandler, setInsertHandler] = useState<
    ((text: string) => void) | null
  >(null);

  const registerInsertHandler = useCallback((handler: (text: string) => void) => {
    setInsertHandler(() => handler);
    return () => setInsertHandler(null);
  }, []);

  const insertDescription = useCallback(
    (text: string) => {
      insertHandler?.(text);
    },
    [insertHandler]
  );

  return (
    <AssistantContext.Provider
      value={{
        buildingType,
        setBuildingType,
        insertDescription,
        registerInsertHandler,
      }}
    >
      {children}
    </AssistantContext.Provider>
  );
}

export function useAssistant() {
  const ctx = useContext(AssistantContext);
  if (!ctx) throw new Error("useAssistant must be used within AssistantProvider");
  return ctx;
}
