import { defineConfig } from 'vite'
import react, { reactCompilerPreset } from '@vitejs/plugin-react'
import babel from '@rolldown/plugin-babel'
import tailwindcss from '@tailwindcss/vite'
import electron from 'vite-plugin-electron/simple'

// https://vite.dev/config/
export default defineConfig({
  clearScreen: false,
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
})
