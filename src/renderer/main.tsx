import { createRoot } from 'react-dom/client'
import App from '@renderer/App'
import '@renderer/lib/monaco'
import '@renderer/index.css'
window.addEventListener('contextmenu', e => { e.preventDefault() }, true)

const root = document.getElementById('root')
if (!root) throw new Error('[main] Root element #root not found in DOM')

console.info(`[main] DOM parsed. Mounting React application to #${root.id}...`)

createRoot(root).render(
  <App />
)