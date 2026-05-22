import type { RouteObject } from 'react-router';
import { createHashRouter } from 'react-router';
import { isElectron, isWeb } from '@shared';
import { RootLayout } from '@renderer/layouts';
import { ErrorBoundary } from '@renderer/components';
import { HomePage, ProjectsPage, SettingsPage } from '@renderer/pages';

/** Available on both electron and web. */
const sharedRoutes: readonly RouteObject[] = [
  {
    index: true,
    element: <HomePage />,
    errorElement: <ErrorBoundary />,
  },
  {
    path: 'settings',
    element: <SettingsPage />,
    errorElement: <ErrorBoundary />,
  },
];

/** Only available inside the electron shell. */
const electronRoutes: readonly RouteObject[] = [
  {
    path: 'projects',
    element: <ProjectsPage />,
    errorElement: <ErrorBoundary />,
  },
];

/** Only available in a plain browser. */
const webRoutes: readonly RouteObject[] = [];

function buildChildren(): RouteObject[] {
  return [
    ...sharedRoutes,
    ...(isElectron ? electronRoutes : []),
    ...(isWeb ? webRoutes : []),
  ];
}

const routes: readonly RouteObject[] = [
  {
    path: '/',
    element: <RootLayout />,
    errorElement: <ErrorBoundary />,
    children: buildChildren(),
  },
];

export const router = createHashRouter([...routes]);
