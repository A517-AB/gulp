import {
  useState,
  useEffect,
  type ReactNode,
} from "react";
import { env } from "@shared/bridge";
import { JulesClient } from "./client";
import { JulesContext } from "./context";

function makeClient(key: string | null) {
  return key ? new JulesClient(key) : null;
}

export function JulesProvider({ children }: { children: ReactNode }) {
  const [apiKey, setApiKeyState] = useState<string | null>(
    () => localStorage.getItem("jules-api-key")
  );
  const [client, setClient] = useState<JulesClient | null>(
    () => makeClient(localStorage.getItem("jules-api-key"))
  );

  // Only needed for the Electron env path where the key comes from an async IPC call
  useEffect(() => {
    if (apiKey || !env?.getApiKey) return;
    void env.getApiKey().then((envKey) => {
      if (envKey) {
        setApiKeyState(envKey);
        setClient(new JulesClient(envKey));
      }
    });
  }, [apiKey]);

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
