import { createRoot } from 'react-dom/client'
import App from '@renderer/App'
import '@renderer/lib/monaco'

const root = document.getElementById('root')
if (!root) throw new Error('[main] Root element #root not found in DOM')

console.info(`[main] DOM parsed. Mounting React application to #${root.id}...`)
console.log('is up and running!')
createRoot(root).render(
  <App />
)
