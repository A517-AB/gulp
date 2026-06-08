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
      if (window.electron?.env?.getApiKey) {
        const envKey = await window.electron.env.getApiKey();
        if (envKey) {
          setApiKeyState(envKey);
          setClient(new JulesClient(envKey));
        }
      }
    }
    void init();
  }, []);

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
