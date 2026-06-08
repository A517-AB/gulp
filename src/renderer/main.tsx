import { createRoot } from 'react-dom/client'
import App from '@renderer/App'
import '@renderer/index.css'
const root = document.getElementById('root')
if (!root) throw new Error('[main] Root element #root not found in DOM')

createRoot(root).render(<App />)