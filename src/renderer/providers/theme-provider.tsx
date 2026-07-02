import {type ReactNode} from 'react'

// Theme state lives in the zustand store (./theme) and is applied to the DOM
// via a module-level subscription there — this provider only marks the tree.
export function ThemeProvider({children}: { children: ReactNode }) {
    return <>{children}</>
}
