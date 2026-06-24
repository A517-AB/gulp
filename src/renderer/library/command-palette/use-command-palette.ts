import { useKBar } from "kbar";

export function useCommandPalette() {
    const { query } = useKBar();
    return { open: () => { query.toggle(); } };
}
