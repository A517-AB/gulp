"use client";

import { useState, useEffect, type ReactNode } from "react";
import { env } from "@/shared/bridge";
import { JulesClient } from "./client";
import { JulesContext } from "./context";

function readStoredKey(): string | null {
  return typeof window !== "undefined"
    ? localStorage.getItem("jules-api-key")
    : null;
}

export function JulesProvider({ children }: { children: ReactNode }) {
  const [apiKey, setApiKeyState] = useState<string | null>(readStoredKey);
  const [client, setClient] = useState<JulesClient | null>(() => {
    const stored = readStoredKey();
    return stored ? new JulesClient(stored) : null;
  });
  // In the Electron app the key comes from the JULES_API_KEY env var via IPC,
  // not localStorage — so when there's no stored key we still have to fetch it
  // asynchronously. isLoading stays true until that round-trip settles.
  const [isLoading, setIsLoading] = useState(
    () => !readStoredKey() && !!env?.getApiKey,
  );

  useEffect(() => {
    if (apiKey || !env?.getApiKey) return;
    let cancelled = false;
    env.getApiKey()
      .then((envKey) => {
        if (cancelled) return;
        if (envKey) {
          setApiKeyState(envKey);
          setClient(new JulesClient(envKey));
        }
        setIsLoading(false);
      })
      .catch((err: unknown) => {
        // An IPC failure here must not leave the UI stuck in a loading state.
        console.error("[JulesProvider] failed to read API key from env:", err);
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [apiKey]);

  const setApiKey = (key: string) => {
    localStorage.setItem("jules-api-key", key);
    setApiKeyState(key);
    setClient(new JulesClient(key));
  };

  const clearApiKey = () => {
    localStorage.removeItem("jules-api-key");
    setApiKeyState(null);
    setClient(null);
  };

  return (
    <JulesContext.Provider
      value={{ client, apiKey, isLoading, setApiKey, clearApiKey }}
    >
      {children}
    </JulesContext.Provider>
  );
}
