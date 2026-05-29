import { type ReactNode, Suspense } from 'react';
import { RouterProvider } from 'react-router';
import { JulesProvider } from '@/lib/jules/provider'
import { router } from '@/renderer/router';
import '@fontsource/inter/latin-400.css'
import '@fontsource/inter/latin-500.css'
import '@fontsource/inter/latin-600.css'
import '@fontsource/inter/latin-700.css'
import '@/renderer/index.css'


export default function App(): ReactNode {
  return (
    <JulesProvider>
      <Suspense fallback={null}>
        <RouterProvider router={router} />
      </Suspense>
    </JulesProvider>
  )
}
