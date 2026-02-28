import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { resolve } from 'path'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'codemirror': ['codemirror', '@codemirror/state', '@codemirror/view', '@codemirror/lang-javascript', '@codemirror/theme-one-dark', '@codemirror/language', '@codemirror/commands'],
          'framer': ['framer-motion'],
          'vendor': ['react', 'react-dom', 'zustand', 'acorn'],
        },
      },
    },
  },
})
