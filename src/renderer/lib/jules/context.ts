import { createContext, useContext } from "react";
import type { JulesClient } from "./client";

export interface JulesContextType {
  client: JulesClient | null;
  apiKey: string | null;
  isLoading: boolean;
  setApiKey: (key: string) => void;
  clearApiKey: () => void;
}

export const JulesContext = createContext<JulesContextType | undefined>(
  undefined,
);

export function useJules(): JulesContextType {
  const context = useContext(JulesContext);
  if (context === undefined) {
    throw new Error("useJules must be used within a JulesProvider");
  }
  return context;
}
