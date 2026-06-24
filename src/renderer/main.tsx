import { createRoot } from 'react-dom/client'
import App from '@renderer/App'

const t0 = performance.now()
console.log('[renderer] evaluating main.tsx')

const root = document.getElementById('root')
if (!root) throw new Error('[main] Root element #root not found in DOM')

console.log(`[renderer] mount → #${root.id} (+${(performance.now() - t0).toFixed(1)}ms since eval)`)
createRoot(root).render(
  <App />
)
