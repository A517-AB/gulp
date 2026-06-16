import { defineConfig } from 'vite'
import react, { reactCompilerPreset } from '@vitejs/plugin-react'
import babel from '@rolldown/plugin-babel'
import tailwindcss from '@tailwindcss/vite'
import electron from 'vite-plugin-electron/simple'
import { isAbsolute, resolve } from 'node:path'


const nodeExternal = (id: string) =>
  !id.startsWith('.') && !isAbsolute(id) && !id.startsWith('\0')

const isWeb = process.env.VITE_TARGET === 'web';

// https://vite.dev/config/
export default defineConfig({
  clearScreen: false,
  resolve: {
    tsconfigPaths: true,
    alias: [
      { find: 'react',       replacement: resolve(__dirname, 'node_modules/react') },
      { find: 'react-dom',   replacement: resolve(__dirname, 'node_modules/react-dom') },
      { find: '@syncfusion/ej2-gantt',       replacement: 'D:/synco/JavaScript - EJ2/32.1.19/Web (Essential JS 2)/JavaScript/ej2-gantt/dist/es6/ej2-gantt.es5.js' },
      { find: '@syncfusion/ej2-react-gantt', replacement: 'D:/synco/JavaScript - EJ2/32.1.19/Web (Essential JS 2)/JavaScript/ej2-react-gantt/dist/es6/ej2-react-gantt.es5.js' },
      { find: /^@syncfusion\/(.+)$/, replacement: 'D:/synco/JavaScript - EJ2/32.1.19/Web (Essential JS 2)/JavaScript/$1' },
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
      ],
    },
    proxy: {
      '/api/jules': {
        target: 'https://jules.googleapis.com/v1alpha',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/jules\?path=/, '/'),
      },
    },
  },
    optimizeDeps: {
    include: [
      '@syncfusion/ej2-gantt',
      '@syncfusion/ej2-react-gantt',
    ],
  },
  // can you not change it to rollup
  build: {
    target: 'esnext',
      rolldownOptions: {
      input: {
        index:        resolve(__dirname, 'index.html'),
        notification: resolve(__dirname, 'notification.html'),
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
                input: {
                  main:           'electron/main.mts',
                  'notif-main':   'electron/main-notif.mts',
                  'jules-worker': 'electron/jules-worker.ts',
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
    ],
  ],
})
