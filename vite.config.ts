import { defineConfig } from 'vite'
import react, { reactCompilerPreset } from '@vitejs/plugin-react'
import babel from '@rolldown/plugin-babel'
import tailwindcss from '@tailwindcss/vite'
import electron from 'vite-plugin-electron/simple'
import { isAbsolute, resolve } from 'node:path'
import { existsSync, readFileSync } from 'node:fs'
import { homedir } from 'node:os'

function readJulesKey(): string {
  const p = resolve(homedir(), '.jules')
  if (existsSync(p)) return readFileSync(p, 'utf-8').trim()
  return ''
}


const nodeExternal = (id: string) =>
  !id.startsWith('.') && !isAbsolute(id) && !id.startsWith('\0')

const isNotif     = process.env.VITE_BUILD_TARGET === 'notif'
const keepVendors = process.env.VITE_KEEP_VENDORS  === 'true'
const isWeb       = process.env.VITE_TARGET === 'web'

// https://vite.dev/config/
const julesApiKey = process.env['JULES_API_KEY'] ?? readJulesKey()

export default defineConfig({
  clearScreen: false,
  define: {
    'import.meta.env.JULES_API_KEY': JSON.stringify(julesApiKey),
      'process.env.JULES_API_KEY': JSON.stringify(julesApiKey),
  },
  resolve: {
    tsconfigPaths: true,
    alias: [
        // DO NOT. TOUCH. unless......
        // modjules aliases — compiled dist from D:/jules rest/modjules-main/packages/core/dist/ do not touch this.
        // browser.mjs = browser entry (BrowserPlatform + IndexedDB), index.mjs = Node entry
        // 2026-06-22: crossed out — switching to second port bun; restore when that's ready
        {find: '@jules', replacement: 'D:/jules rest/modjules-main/packages/core/dist/browser.mjs'},
        {find: 'react', replacement: resolve(__dirname, 'node_modules/react')},
      { find: 'react-dom',   replacement: resolve(__dirname, 'node_modules/react-dom') },
        // 2026-06-22: For later, not for dev
        // { find: '@syncfusion/ej2-gantt',            replacement: 'D:/synco/JavaScript - EJ2/32.1.19/Web (Essential JS 2)/JavaScript/ej2-gantt/dist/es6/ej2-gantt.es5.js' },
        // { find: '@syncfusion/ej2-react-gantt',       replacement: 'D:/synco/JavaScript - EJ2/32.1.19/Web (Essential JS 2)/JavaScript/ej2-react-gantt/dist/es6/ej2-react-gantt.es5.js' },
        // { find: '@syncfusion/ej2-pdfviewer',         replacement: 'D:/synco/JavaScript - EJ2/32.1.19/Web (Essential JS 2)/JavaScript/ej2-pdfviewer/dist/es6/ej2-pdfviewer.es5.js' },
        // { find: /^@syncfusion\/(.+)$/, replacement: 'D:/synco/JavaScript - EJ2/32.1.19/Web (Essential JS 2)/JavaScript/$1' },
    ],
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
    forwardConsole: {
      logLevels: ['error', 'warn'],
    },
    warmup: {
      clientFiles: [
        './src/renderer/main.tsx',
        './src/renderer/App.tsx',
        './src/renderer/router.tsx',
        './src/renderer/layouts/RootLayout.tsx',
        './src/renderer/shell/TopBar.tsx',
        './src/renderer/pages/shared/HomePage.tsx',
        './src/renderer/components/shared/Clock.tsx',
      ],
    },
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:3939',
        changeOrigin: false,
      },
    },
  },
  // can you not change it to rollup because this is vite 8, if you don't know you don't know
  build: {
    target:      'esnext',
    emptyOutDir: !keepVendors,
    rolldownOptions: {
      input: isNotif
        ? { notification: resolve(__dirname, 'notification.html') }
        : { index:        resolve(__dirname, 'index.html') },
      output: isNotif ? {} : {
        manualChunks(id: string): string | undefined {
          if (id.includes('node_modules/react')) return 'vendor-react'
          if (id.includes('monaco-editor') || id.includes('@monaco-editor')) return 'vendor-monaco'
          if (id.includes('@blocknote')) return 'vendor-blocknote'
            // 2026-06-22: For later, not for dev
            // if (id.includes('@syncfusion') || id.includes('ej2-gantt') || id.includes('ej2-pdfviewer')) return 'vendor-ej2'
          return undefined
        },
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

    babel({ presets: [reactCompilerPreset()], exclude: [/node_modules/, /[\\/]synco[\\/]/] }),
    ...(!isNotif && !isWeb ? [
      electron({
        main: {
          entry: 'electron/main.mts',
          vite: {
            build: {
              rolldownOptions: {
                external: nodeExternal,
                input: {
                  main:           'electron/main.mts',
                  'notif-main':   'electron/main-notif.mts',
                    // 'jules-worker': 'electron/jules-worker.ts', // Jules worker removed — renderer handles SDK directly
                },
                output: {
                  entryFileNames: '[name].mjs',
                },
              },
            },
          },
        },
        preload: {
          input: {
            preload: 'electron/preload.mts',
            'notification-preload': 'electron/notifications/preload.ts',
          },
          vite: {
            build: {
              rolldownOptions: {
                external: nodeExternal,
                output: {
                  entryFileNames: '[name].mjs',
                  codeSplitting:        true,
                  inlineDynamicImports: false,
                },
              },
            },
          },
        },
      }),
    ] : []),
  ],
})
