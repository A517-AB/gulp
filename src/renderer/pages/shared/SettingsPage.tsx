import type { ReactNode } from 'react'
import { Settings2 } from 'lucide-react'

export default function SettingsPage(): ReactNode {
  return (
    <div className="flex flex-col h-full p-6 overflow-hidden max-w-2xl mx-auto w-full">
      <div className="flex items-center gap-3 mb-8">
        <div className="h-8 w-8 rounded-md bg-surface border border-subtle flex items-center justify-center">
          <Settings2 className="h-4 w-4 text-fg-muted" />
        </div>
        <div>
          <h2 className="text-lg font-bold tracking-tight text-fg-primary uppercase">Settings</h2>
          <p className="text-[10px] text-fg-dim font-mono uppercase tracking-widest">app-settings</p>
        </div>
      </div>
    </div>
  )
}
