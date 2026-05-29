import { createHashRouter, type RouteObject } from 'react-router'
import RootLayout from '@/layouts/RootLayout'
import { RouteErrorBoundary } from '@/core'
import { navRoutes } from '@/renderer/routes'

export const router = createHashRouter([
    {
        path: '/',
        Component: RootLayout,
        errorElement: <RouteErrorBoundary />,
        children: navRoutes as RouteObject[],
    },
])