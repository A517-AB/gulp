import type { ReactNode } from 'react';
import { NavLink } from 'react-router';
import { isElectron, isWeb } from '@shared';

type Platform = 'shared' | 'electron' | 'web';

interface NavItem {
  readonly label: string;
  readonly to: string;
  readonly platform: Platform;
}

const NAV_ITEMS: readonly NavItem[] = [
  { label: 'Home', to: '/', platform: 'shared' },
  { label: 'Projects', to: '/projects', platform: 'electron' },
  { label: 'Settings', to: '/settings', platform: 'shared' },
] as const;

function isVisible(platform: Platform): boolean {
  if (platform === 'shared') return true;
  if (platform === 'electron') return isElectron;
  return isWeb;
}

function getNavLinkClass(isActive: boolean): string {
  const base = 'relative px-3 py-1.5 text-[12px] font-medium rounded-md transition-colors';

  return isActive
    ? `${base} text-neutral-100 bg-white/8`
    : `${base} text-neutral-500 hover:text-neutral-300 hover:bg-white/4`;
}

export default function TopBar(): ReactNode {
  return (
    <nav className="flex items-center gap-1 h-10 px-3 bg-[#0f0f0f] border-b border-white/5 shrink-0">
      {NAV_ITEMS.filter((item) => isVisible(item.platform)).map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          className={({ isActive }) => getNavLinkClass(isActive)}
        >
          {({ isActive }) => (
            <>
              {item.label}
              {isActive && (
                <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-4 h-px bg-neutral-400 rounded-full" />
              )}
            </>
          )}
        </NavLink>
      ))}
    </nav>
  );
}
