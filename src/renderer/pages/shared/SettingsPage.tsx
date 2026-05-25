import type { ReactNode } from 'react';

export default function SettingsPage(): ReactNode {
    console.info('[Page] Mounted SettingsPage')
  return (
    <div className="flex items-center justify-center h-full">
      <p className="text-neutral-500 text-sm select-none">Settings</p>
    </div>
  );
}
