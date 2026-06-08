import {
  createContext,
  useContext,
  useState,
  useEffect,
  type ReactNode,
} from "react";
import { JulesClient } from "./client";
import { useStore } from "@/store/app";

interface JulesContextType {
  client: JulesClient | null;
  apiKey: string | null;
  setApiKey: (key: string) => void;
  clearApiKey: () => void;
}

const JulesContext = createContext<JulesContextType | undefined>(undefined);

export function JulesProvider({ children }: { children: ReactNode }) {
  const [apiKey, setApiKeyState] = useState<string | null>(null);
  const [client, setClient] = useState<JulesClient | null>(null);
  const startPolling = useStore(s => s.startPolling);

  useEffect(() => {
    async function init() {
      let resolved: JulesClient | null = null;
      if (window.electron?.env?.getApiKey) {
        const envKey = await window.electron.env.getApiKey();
        if (envKey) {
          setApiKeyState(envKey);
          resolved = new JulesClient(envKey);
          setClient(resolved);
        }
      }
      return startPolling(resolved);
    }
    const cleanup = init();
    return () => { void cleanup.then(stop => stop()); };
  }, [startPolling]);

  const setApiKey = () => {};
  const clearApiKey = () => {};

  return (
    <JulesContext.Provider
      value={{ client, apiKey, setApiKey, clearApiKey }}
    >
      {children}
    </JulesContext.Provider>
  );
}

export function useJules() {
  const context = useContext(JulesContext);
  if (context === undefined) {
    throw new Error("useJules must be used within a JulesProvider");
  }
  return context;
}
