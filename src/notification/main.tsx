import './notification.css'
import { createRoot } from 'react-dom/client'
import { NotificationWindow } from './NotificationWindow'

const root = document.getElementById('root')
if (!root) throw new Error('No #root element')

createRoot(root).render(<NotificationWindow />)
