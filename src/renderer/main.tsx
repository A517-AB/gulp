import { createRoot } from 'react-dom/client'
import App from '@renderer/App'
import '@renderer/lib/monaco'

const root = document.getElementById('root')
if (!root) throw new Error('[main] Root element #root not found in DOM')

console.log(`[renderer] mount → #${root.id}`)
createRoot(root).render(
  <App />
)
