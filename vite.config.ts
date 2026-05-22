import { defineConfig } from 'vite'
import react, { reactCompilerPreset } from '@vitejs/plugin-react'
import babel from '@rolldown/plugin-babel'
import tailwindcss from '@tailwindcss/vite'
import electron from 'vite-plugin-electron/simple'
import { fileURLToPath, URL } from 'node:url'

const isWeb = process.env.VITE_TARGET === 'web';

// https://vite.dev/config/
export default defineConfig({
  clearScreen: false,
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      '@renderer': fileURLToPath(new URL('./src/renderer', import.meta.url)),
      '@shared': fileURLToPath(new URL('./src/shared', import.meta.url)),
      '@electron': fileURLToPath(new URL('./src/electron', import.meta.url)),
    },
  },
  server: {
    host: '127.0.0.1',
    port: 5173,
    strictPort: true,
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
              rollupOptions: {
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
              rollupOptions: {
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
