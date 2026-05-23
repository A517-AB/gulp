import type { ReactNode } from 'react';
import { NavLink } from 'react-router';
import { isElectron, isWeb } from '@shared';
import { ThemeToggle } from '@/ui/theme-toggle';

type Platform = 'shared' | 'electron' | 'web';

interface NavItem {
  readonly label: string;
  readonly to: string;
  readonly platform: Platform;
}

const NAV_ITEMS: readonly NavItem[] = [
  { label: 'Home', to: '/', platform: 'shared' },
  { label: 'Projects', to: '/projects', platform: 'electron' },
  { label: 'Workbench', to: '/workbench', platform: 'electron' },
  { label: 'Settings', to: '/settings', platform: 'shared' },
] as const;

function isVisible(platform: Platform): boolean {
  if (platform === 'shared') return true;
  if (platform === 'electron') return isElectron;
  return isWeb;
}

function navLinkClass(isActive: boolean): string {
  const base = 'relative px-3 py-1.5 text-xxs font-mono rounded-md transition-colors';
  return isActive
    ? `${base} text-fg-primary bg-active`
    : `${base} text-fg-ghost hover:text-fg-secondary hover:bg-hover`;
}

export default function TopBar(): ReactNode {
  return (
    <nav className="flex items-center h-10 px-3 bg-surface border-b border-hair shrink-0">
      <div className="flex items-center gap-1 flex-1">
        {NAV_ITEMS.filter(item => isVisible(item.platform)).map(item => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) => navLinkClass(isActive)}
          >
            {({ isActive }) => (
              <>
                {item.label}
                {isActive && (
                  <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-4 h-px bg-fg-dim rounded-full" />
                )}
              </>
            )}
          </NavLink>
        ))}
      </div>
      <ThemeToggle />
    </nav>
  );
}
