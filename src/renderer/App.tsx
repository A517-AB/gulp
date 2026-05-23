import type { ReactNode } from 'react';
import { RouterProvider } from 'react-router';
import { router } from '@renderer/router.tsx';
import { ThemeProvider } from '@renderer/providers/theme';

export default function App(): ReactNode {
  return (
    <ThemeProvider>
      <RouterProvider router={router} />
    </ThemeProvider>
  );
}
