import type { ReactNode } from 'react';
import { RouterProvider } from 'react-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { JulesProvider } from '@renderer/provider'
import { router } from '@renderer/router';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
    },
  },
})

export default function App(): ReactNode {
  return (
    <QueryClientProvider client={queryClient}>
      <JulesProvider>
        <RouterProvider router={router} />
      </JulesProvider>
    </QueryClientProvider>
  )
}
