import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from '@renderer/App'
import { ErrorBoundary } from '@renderer/core'

const root = document.getElementById('root')
if (!root) throw new Error('[main] Root element #root not found in DOM')

console.info(`[main] DOM parsed. Mounting React application to #${root.id}...`)

createRoot(root).render(
    <StrictMode>
        {/* Top-level boundary: route errors are caught by the router's
            errorElement, but a throw above the router (providers, App) would
            otherwise escape into a blank/transparent window with no trace. */}
        <ErrorBoundary>
            <App />
        </ErrorBoundary>
    </StrictMode>,
)