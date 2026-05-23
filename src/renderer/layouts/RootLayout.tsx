import type { ReactNode } from 'react';
import { Outlet } from 'react-router';
import { TitleBar, TopBar } from '@renderer/shell';

export default function RootLayout(): ReactNode {
  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-base">
      <TitleBar />
      <TopBar />
      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>
    </div>
  );
}
