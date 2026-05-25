import type { ReactNode } from 'react';
import { RouterProvider } from 'react-router';
import { router } from '@renderer/router';

export default function App(): ReactNode {
    return (
        <RouterProvider router={router} />
    );
}
