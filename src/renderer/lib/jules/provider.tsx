import {type ReactNode, useEffect} from "react";
import {useStore} from "@/store/app";
import {sdkIpc} from "@shared/bridge";

export function JulesProvider({ children }: { children: ReactNode }) {
  const startPolling = useStore(s => s.startPolling);

  useEffect(() => {
    async function init() {
      if (window.electron) {
          const apiKey = await window.electron.env.getApiKey();
          if (apiKey && sdkIpc) await sdkIpc.client.with({apiKey});
      }
        return startPolling();
    }
    const cleanup = init();
    return () => { void cleanup.then(stop => stop()); };
  }, [startPolling]);

    return <>{children}</>;
}
