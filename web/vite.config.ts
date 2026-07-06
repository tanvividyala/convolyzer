import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  base: '/convolyzer/',
  plugins: [react()],
  // transformers.js ships an onnxruntime-web WASM backend that must not be
  // pre-bundled by esbuild, or the .wasm assets fail to resolve at runtime.
  optimizeDeps: {
    exclude: ['@huggingface/transformers'],
  },
})
