type Platform = 'electron' | 'web';

function detectPlatform(): Platform {
  if (typeof window !== 'undefined' && 'electronAPI' in window) {
    return 'electron';
  }

  return 'web';
}

const platform: Platform = detectPlatform();

console.log(`[Platform Detection] Running in: ${platform.toUpperCase()}`);

export const isElectron: boolean = platform === 'electron';
export const isWeb: boolean = platform === 'web';
