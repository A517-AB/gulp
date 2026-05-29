import {
  useState,
  useEffect,
  type ReactNode,
} from "react";
import { env } from "@shared/bridge";
import { JulesClient } from "./client";
import { JulesContext } from "./context";

export function JulesProvider({ children }: { children: ReactNode }) {
  const [apiKey, setApiKeyState] = useState<string | null>(null);
  const [client, setClient] = useState<JulesClient | null>(null);

  useEffect(() => {
    async function init() {
      let stored = localStorage.getItem("jules-api-key");

      if (!stored && env?.getApiKey) {
        const envKey = await env.getApiKey();
        if (envKey) stored = envKey;
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
