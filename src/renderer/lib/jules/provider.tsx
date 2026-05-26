import {
  createContext,
  useContext,
  useState,
  useEffect,
  type ReactNode,
} from "react";
import { JulesClient } from "./client";

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

  useEffect(() => {
    async function init() {
      let stored = localStorage.getItem("jules-api-key");
      console.log("[JulesProvider] stored api key:", stored ? "found" : "not found");

      // Check Vite environment variables (injected by vite.config.ts)
      if (!stored && import.meta.env.VITE_JULES_API_KEY) {
        const envKey = import.meta.env.VITE_JULES_API_KEY;
        console.log("[JulesProvider] env api key:", envKey ? "found" : "not found");
        if (envKey) {
          stored = envKey;
        }
      }

      // Fallback to electron environment variable
      if (!stored && window.electron?.env?.getApiKey) {
        const envKey = await window.electron.env.getApiKey();
        console.log("[JulesProvider] electron api key:", envKey ? "found" : "not found");
        if (envKey) {
          stored = envKey;
        }
      }

      if (stored) {
        setApiKeyState(stored);
        setClient(new JulesClient(stored));
      }
    }
    void init();
  }, []);

  const setApiKey = (key: string) => {
    console.log("[JulesProvider] setting api key");
    localStorage.setItem("jules-api-key", key);
    setApiKeyState(key);
    setClient(new JulesClient(key));
  };

  const clearApiKey = () => {
    console.log("[JulesProvider] clearing api key");
    localStorage.removeItem("jules-api-key");
    setApiKeyState(null);
    setClient(null);
  };

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
