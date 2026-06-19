import { createRoot } from 'react-dom/client'
import App from '@renderer/App'
import '@renderer/lib/monaco'
import 'D:/synco/JavaScript - EJ2/32.1.19/Web (Essential JS 2)/JavaScript/ej2-base/styles/tailwind3.css'
import 'D:/synco/JavaScript - EJ2/32.1.19/Web (Essential JS 2)/JavaScript/ej2-icons/styles/tailwind3.css'
import 'D:/synco/JavaScript - EJ2/32.1.19/Web (Essential JS 2)/JavaScript/ej2-buttons/styles/tailwind3.css'
import 'D:/synco/JavaScript - EJ2/32.1.19/Web (Essential JS 2)/JavaScript/ej2-calendars/styles/tailwind3.css'
import 'D:/synco/JavaScript - EJ2/32.1.19/Web (Essential JS 2)/JavaScript/ej2-dropdowns/styles/tailwind3.css'
import 'D:/synco/JavaScript - EJ2/32.1.19/Web (Essential JS 2)/JavaScript/ej2-inputs/styles/tailwind3.css'
import 'D:/synco/JavaScript - EJ2/32.1.19/Web (Essential JS 2)/JavaScript/ej2-lists/styles/tailwind3.css'
import 'D:/synco/JavaScript - EJ2/32.1.19/Web (Essential JS 2)/JavaScript/ej2-layouts/styles/tailwind3.css'
import 'D:/synco/JavaScript - EJ2/32.1.19/Web (Essential JS 2)/JavaScript/ej2-navigations/styles/tailwind3.css'
import 'D:/synco/JavaScript - EJ2/32.1.19/Web (Essential JS 2)/JavaScript/ej2-popups/styles/tailwind3.css'
import 'D:/synco/JavaScript - EJ2/32.1.19/Web (Essential JS 2)/JavaScript/ej2-grids/styles/tailwind3.css'
import 'D:/synco/JavaScript - EJ2/32.1.19/Web (Essential JS 2)/JavaScript/ej2-treegrid/styles/tailwind3.css'
import 'D:/synco/JavaScript - EJ2/32.1.19/Web (Essential JS 2)/JavaScript/ej2-gantt/styles/tailwind3.css'
import 'D:/synco/JavaScript - EJ2/32.1.19/Web (Essential JS 2)/JavaScript/ej2-gantt/styles/gantt/tailwind3.css'
import 'D:/synco/JavaScript - EJ2/32.1.19/Web (Essential JS 2)/JavaScript/ej2-pdfviewer/styles/tailwind3.css'
import 'D:/synco/JavaScript - EJ2/32.1.19/Web (Essential JS 2)/JavaScript/ej2-pdfviewer/styles/pdfviewer/tailwind3.css'



const root = document.getElementById('root')
if (!root) throw new Error('[main] Root element #root not found in DOM')

console.info(`[main] DOM parsed. Mounting React application to #${root.id}...`)
console.log('is up and running!')
createRoot(root).render(
  <App />
)
