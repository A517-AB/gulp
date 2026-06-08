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
}

const JulesContext = createContext<JulesContextType | undefined>(undefined);

export function JulesProvider({ children }: { children: ReactNode }) {
  const [client, setClient] = useState<JulesClient | null>(null);
  const startPolling = useStore(s => s.startPolling);

  useEffect(() => {
    async function init() {
      console.log('[JulesProvider] init — window.electron:', !!window.electron)
      let resolved: JulesClient | null = null;
      if (window.electron) {
        const apiKey = await window.electron.env.getApiKey()
        console.log('[JulesProvider] apiKey:', apiKey ? 'SET' : 'NOT SET')
        if (apiKey && window.electron.sdk) {
          await window.electron.sdk.client.with({ apiKey })
          console.log('[JulesProvider] SDK configured')
        }
        resolved = new JulesClient('');
        setClient(resolved);
      }
      return startPolling(resolved);
    }
    const cleanup = init();
    return () => { void cleanup.then(stop => stop()); };
  }, [startPolling]);

  return (
    <JulesContext.Provider value={{ client }}>
      {children}
    </JulesContext.Provider>
  );
}

export function useJules() {
  const ctx = useContext(JulesContext);
  if (!ctx) throw new Error("useJules must be used within a JulesProvider");
  return ctx;
}
