import type { ReactNode } from 'react';
import { isElectron } from '@shared';

export default function TitleBar(): ReactNode {
  if (!isElectron) return null;

  return (
    <header className="titlebar-drag flex items-center justify-between h-9 px-3 bg-[#111111] border-b border-white/5 select-none shrink-0">
      <span className="text-[11px] font-medium tracking-wide text-neutral-400 uppercase">
        Last
      </span>

      <div className="titlebar-no-drag flex items-center gap-0.5">
        <button
          type="button"
          onClick={() => { window.electronAPI?.minimize(); }}
          className="group flex items-center justify-center w-8 h-8 rounded-md hover:bg-white/5 transition-colors"
          aria-label="Minimize"
        >
          <svg width="10" height="1" viewBox="0 0 10 1" className="text-neutral-500 group-hover:text-neutral-300 transition-colors">
            <rect fill="currentColor" width="10" height="1" />
          </svg>
        </button>

        <button
          type="button"
          onClick={() => { window.electronAPI?.maximize(); }}
          className="group flex items-center justify-center w-8 h-8 rounded-md hover:bg-white/5 transition-colors"
          aria-label="Maximize"
        >
          <svg width="9" height="9" viewBox="0 0 9 9" className="text-neutral-500 group-hover:text-neutral-300 transition-colors">
            <rect fill="none" stroke="currentColor" strokeWidth="1" x="0.5" y="0.5" width="8" height="8" rx="1" />
          </svg>
        </button>

        <button
          type="button"
          onClick={() => { window.electronAPI?.close(); }}
          className="group flex items-center justify-center w-8 h-8 rounded-md hover:bg-red-500/10 transition-colors"
          aria-label="Close"
        >
          <svg width="10" height="10" viewBox="0 0 10 10" className="text-neutral-500 group-hover:text-red-400 transition-colors">
            <line x1="1" y1="1" x2="9" y2="9" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
            <line x1="9" y1="1" x2="1" y2="9" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
          </svg>
        </button>
      </div>
    </header>
  );
}
