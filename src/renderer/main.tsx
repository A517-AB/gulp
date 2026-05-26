import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@renderer/lib/monaco' // local Monaco workers — must run before any Editor mounts
import App from '@renderer/App'
import '@renderer/index.css'

const root = document.getElementById('root')
if (!root) throw new Error('[main] Root element #root not found in DOM')

console.info(`[main] DOM parsed. Mounting React application to #${root.id}...`)

createRoot(root).render(
    <StrictMode>
        <App />
    </StrictMode>,
)