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
  // The embedding pipeline runs inside a module worker (see
  // embeddings.worker.ts) so ONNX Runtime's synchronous tensor math doesn't
  // block the main thread. 'es' format keeps the worker's internal dynamic
  // imports working the same way they do in the main bundle.
  worker: {
    format: 'es',
  },
})
