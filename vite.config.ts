import {defineConfig} from 'vite'
import react, {reactCompilerPreset} from '@vitejs/plugin-react'
import babel from '@rolldown/plugin-babel'
import tailwindcss from '@tailwindcss/vite'
import electron from 'vite-plugin-electron/simple'
import {isAbsolute} from 'node:path'

const nodeExternal = (id: string) =>
    id !== '@jules' &&
  !id.startsWith('.') && !isAbsolute(id) && !id.startsWith('\0')

const isNotif     = process.env.VITE_BUILD_TARGET === 'notif'
const keepVendors = process.env.VITE_KEEP_VENDORS  === 'true'
const isWeb       = process.env.VITE_TARGET === 'web'

export default defineConfig({
  clearScreen: false,
  define: {
      'import.meta.env.JULES_API_KEY': JSON.stringify(process.env.JULES_API_KEY ?? ''),
      'process.env.JULES_API_KEY': JSON.stringify(process.env.JULES_API_KEY ?? ''),
  },
  resolve: {
    tsconfigPaths: true,
    alias: [

        // renderer runs in the browser — must load the browser build (IndexedDB storage),
        // not dist-jules/index.mjs (the Node build, which imports node:fs/node:crypto and
        // gets externalized/crashes in the browser). tsconfig-paths still points @jules's
        // *types* at the plain dist-jules dir (index.d.ts) since it's a superset of browser.d.ts.
        {find: '@jules', replacement: resolve(__dirname, 'dist-jules/browser.mjs')},


        {find: 'node:path', replacement: 'path-browserify'},
        {find: 'react', replacement: resolve(__dirname, 'node_modules/react')},
        {find: 'react-dom', replacement: resolve(__dirname, 'node_modules/react-dom')},
        // 2026-06-22: For later, not for dev
        // { find: '@syncfusion/ej2-gantt',            replacement: 'D:/synco/JavaScript - EJ2/32.1.19/Web (Essential JS 2)/JavaScript/ej2-gantt/dist-jules/es6/ej2-gantt.es5.js' },
        // { find: '@syncfusion/ej2-react-gantt',       replacement: 'D:/synco/JavaScript - EJ2/32.1.19/Web (Essential JS 2)/JavaScript/ej2-react-gantt/dist-jules/es6/ej2-react-gantt.es5.js' },
        // { find: '@syncfusion/ej2-pdfviewer',         replacement: 'D:/synco/JavaScript - EJ2/32.1.19/Web (Essential JS 2)/JavaScript/ej2-pdfviewer/dist-jules/es6/ej2-pdfviewer.es5.js' },
        // { find: /^@syncfusion\/(.+)$/, replacement: 'D:/synco/JavaScript - EJ2/32.1.19/Web (Essential JS 2)/JavaScript/$1' },
    ],
  },
  server: {
    host: '127.0.0.1',
    port: 5173,
    strictPort: true,
    watch: {
        ignored: ['**/.workspace/**', '**/.jules/**'],
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
              changeOrigin: true,
          },
      },
  },
  // can you not change it to rollup because this is vite 8, if you don't know you don't know
  build: {
    target:      'esnext',
      emptyOutDir: !keepVendors && !isNotif,
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
    optimizeDeps: {
        exclude: ['pyodide'],
    },
    worker: {
        format: 'es',
        //   },
        // preview: {
        //   host: '127.0.0.1',
        //   port: 4173,
        //   strictPort: true,
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
              resolve: {
                  // main is Node — @jules must be the node source (disk cache),
                  // NOT the renderer's browser.mjs. Scoped to this build only.
                  alias: [
                      {find: '@jules', replacement: resolve(__dirname, 'electron/ipc/Jules/index.ts')},
                  ],
              },
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
