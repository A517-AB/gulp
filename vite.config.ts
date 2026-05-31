import { defineConfig } from 'vite'
import react, { reactCompilerPreset } from '@vitejs/plugin-react'
import babel from '@rolldown/plugin-babel'
import tailwindcss from '@tailwindcss/vite'
import electron from 'vite-plugin-electron/simple'
import { isAbsolute, join } from 'node:path'
import { existsSync, readFileSync } from 'node:fs'
import { homedir } from 'node:os'

const nodeExternal = (id: string) =>
  !id.startsWith('.') && !isAbsolute(id) && !id.startsWith('\0')

const isWeb = process.env.VITE_TARGET === 'web';

let julesApiKey = process.env.VITE_JULES_API_KEY ?? process.env.JULES_API_KEY;
if (!julesApiKey) {
  try {
    const userPath = join(homedir(), '.workspace');
    if (existsSync(userPath)) {
      const content = readFileSync(userPath, 'utf-8').trim();
      const match = /JULES_API_KEY=(.+)/.exec(content);
      if (match?.[1]) {
        julesApiKey = match[1].trim();
      } else {
        julesApiKey = content;
      }
    }
  } catch (e) {
    console.error('Failed to read .workspace from userpath:', e);
  }
}
if (julesApiKey) {
  process.env.VITE_JULES_API_KEY = julesApiKey;
}

// https://vite.dev/config/
export default defineConfig({
  clearScreen: false,
  resolve: {
    tsconfigPaths: true,
  },
  server: {
    host: '127.0.0.1',
    port: 5173,
    strictPort: true,
    watch: {
      ignored: ['**/.workspace/**'],
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
          entry: 'electron/main.mts',
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
          input: 'electron/preload.mts',
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
