import {createRoot} from 'react-dom/client'
import App from '@renderer/App'

const root = document.getElementById('root')
if (!root) throw new Error('[main] Root element #root not found in DOM')

console.info(`[main] DOM parsed. Mounting React application to #${root.id}...`)

createRoot(root).render(<App/>)

// load monaco after react is up, non-blocking
requestIdleCallback(() => {
    import('@renderer/lib/monaco').then(() => {
        console.log('[main] Monaco loaded')
    })
})
