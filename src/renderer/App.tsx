import type { ReactNode } from 'react';
import { RouterProvider } from 'react-router';
import { JulesProvider } from '@renderer/lib/jules/provider'
import { router } from '@renderer/router';

export default function App(): ReactNode {
  return (
    <JulesProvider>
      <RouterProvider router={router} />
    </JulesProvider>
  )
}
