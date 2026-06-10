import {type ReactNode, useEffect} from "react";
import {useStore} from "@/store/app";

export function JulesProvider({ children }: { children: ReactNode }) {
  const startPolling = useStore(s => s.startPolling);

  useEffect(() => {
    const stop = startPolling();
    return stop;
  }, [startPolling]);

    return <>{children}</>;
}
