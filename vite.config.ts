import { defineConfig } from 'vite'
import react, { reactCompilerPreset } from '@vitejs/plugin-react'
import babel from '@rolldown/plugin-babel'
import tailwindcss from '@tailwindcss/vite'
import electron from 'vite-plugin-electron/simple'
import { fileURLToPath, URL } from 'node:url'
import { isAbsolute } from 'node:path'

const nodeExternal = (id: string) =>
  !id.startsWith('.') && !isAbsolute(id) && !id.startsWith('\0')

const isWeb = process.env.VITE_TARGET === 'web';


// https://vite.dev/config/
export default defineConfig({
  clearScreen: false,
  resolve: {
    alias: {
      '@/ui': fileURLToPath(new URL('./src/renderer/ui', import.meta.url)),
      '@/store': fileURLToPath(new URL('./src/renderer/store', import.meta.url)),
      '@/hooks': fileURLToPath(new URL('./src/renderer/hooks', import.meta.url)),
      '@/components': fileURLToPath(new URL('./src/renderer/components', import.meta.url)),
      '@/lib': fileURLToPath(new URL('./src/renderer/lib', import.meta.url)),
      '@/utils': fileURLToPath(new URL('./src/renderer/utils', import.meta.url)),
      '@/shell': fileURLToPath(new URL('./src/renderer/shell', import.meta.url)),
      '@/core': fileURLToPath(new URL('./src/renderer/core', import.meta.url)),
      '@/providers': fileURLToPath(new URL('./src/renderer/providers', import.meta.url)),
      '@/pages': fileURLToPath(new URL('./src/renderer/pages', import.meta.url)),
      '@/layouts': fileURLToPath(new URL('./src/renderer/layouts', import.meta.url)),
      '@/renderer': fileURLToPath(new URL('./src/renderer', import.meta.url)),
      '@/shared': fileURLToPath(new URL('./src/shared', import.meta.url)),
      '@/electron': fileURLToPath(new URL('./src/electron', import.meta.url)),
      '@/types': fileURLToPath(new URL('./src/types', import.meta.url)),
      '@/api': fileURLToPath(new URL('./src/renderer/api', import.meta.url)),
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
