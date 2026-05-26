import { defineConfig } from 'vite'
import react, { reactCompilerPreset } from '@vitejs/plugin-react'
import babel from '@rolldown/plugin-babel'
import tailwindcss from '@tailwindcss/vite'
import electron from 'vite-plugin-electron/simple'
import { fileURLToPath, URL } from 'node:url'
import { isAbsolute, join } from 'node:path'
import { existsSync, readFileSync } from 'node:fs'
import { homedir } from 'node:os'

const nodeExternal = (id: string) =>
  !id.startsWith('.') && !isAbsolute(id) && !id.startsWith('\0')

const isWeb = process.env.VITE_TARGET === 'web';

let julesApiKey = process.env.VITE_JULES_API_KEY || process.env.JULES_API_KEY;
if (!julesApiKey) {
  try {
    const userPath = join(homedir(), '.jules');
    if (existsSync(userPath)) {
      const content = readFileSync(userPath, 'utf-8').trim();
      const match = content.match(/JULES_API_KEY=(.+)/);
      if (match) {
        julesApiKey = match[1].trim();
      } else {
        julesApiKey = content;
      }
    }
  } catch (e) {
    console.error('Failed to read .jules from userpath:', e);
  }
}
if (julesApiKey) {
  process.env.VITE_JULES_API_KEY = julesApiKey;
}

// https://vite.dev/config/
export default defineConfig({
  clearScreen: false,
  resolve: {
    alias: {
      '@/components': fileURLToPath(new URL('./src/renderer/components', import.meta.url)),
      '@/ui': fileURLToPath(new URL('./src/renderer/ui', import.meta.url)),
      '@/utils': fileURLToPath(new URL('./src/renderer/utils', import.meta.url)),
      '@/store': fileURLToPath(new URL('./src/renderer/store', import.meta.url)),
      '@/hooks': fileURLToPath(new URL('./src/renderer/hooks', import.meta.url)),
      '@/lib': fileURLToPath(new URL('./src/renderer/lib', import.meta.url)),
      '@renderer/shell': fileURLToPath(new URL('./src/renderer/shell', import.meta.url)),
      '@renderer/core': fileURLToPath(new URL('./src/renderer/core', import.meta.url)),
      '@renderer': fileURLToPath(new URL('./src/renderer', import.meta.url)),
      '@shared': fileURLToPath(new URL('./src/shared', import.meta.url)),
      '@electron': fileURLToPath(new URL('./src/electron', import.meta.url)),
      '@': fileURLToPath(new URL('./src', import.meta.url)),
        '@api': fileURLToPath(new URL('./src/renderer/api', import.meta.url)),
        '@api/sdk': fileURLToPath(new URL('./src/renderer/api/sdk', import.meta.url)),
    },
  },
  server: {
    host: '127.0.0.1',
    port: 5173,
    strictPort: true,
    watch: {
      ignored: ['**/.jules/**'],
    },
    hmr: {
      overlay: false
    },
    proxy: {
      '/api/jules': {
        target: 'https://jules.googleapis.com/v1alpha',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/jules\?path=/, '/'),
      },
    },
  },
  preview: {
    host: '127.0.0.1',
    port: 4173,
    strictPort: true,
  },
  plugins: [
    tailwindcss(),
    react(),

    babel({ presets: [reactCompilerPreset()] }),
    ...isWeb ? [] : [
      electron({
        main: {
          entry: 'src/electron/main.mts',
          vite: {
            build: {
              rolldownOptions: {
                external: nodeExternal,
                output: {
                  entryFileNames: '[name].mjs',
                },
              },
            },
          },
        },
        preload: {
          input: 'src/electron/preload.mts',
          vite: {
            build: {
              rolldownOptions: {
                external: nodeExternal,
                output: {
                  entryFileNames: '[name].mjs',
                },
              },
            },
          },
        },
      }),
    ],
  ],
})
