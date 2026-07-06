export interface LoadProgress {
  stage: 'downloading' | 'embedding' | 'ready';
  /** 0..1 when known, otherwise undefined (indeterminate). */
  progress?: number;
  message: string;
}

type WorkerResponse =
  | { id: number; kind: 'progress'; progress: LoadProgress }
  | { id: number; kind: 'done' }
  | { id: number; kind: 'result'; vectors: number[][] }
  | { id: number; kind: 'error'; message: string };

let worker: Worker | null = null;
let nextId = 0;

// The actual tensor math (ONNX Runtime Web, wasm) is synchronous once it
// starts, so running it on the main thread freezes the page no matter how
// often we `await` between batches. Off-loading it to a worker keeps the UI
// responsive while a large conversation is being embedded.
function getWorker(): Worker {
  if (!worker) {
    worker = new Worker(new URL('./embeddings.worker.ts', import.meta.url), { type: 'module' });
  }
  return worker;
}

function callWorker(
  type: 'load' | 'embed',
  payload: Record<string, unknown>,
  onProgress?: (p: LoadProgress) => void
): Promise<number[][] | undefined> {
  const w = getWorker();
  const id = ++nextId;

  return new Promise((resolve, reject) => {
    function handleMessage(e: MessageEvent<WorkerResponse>) {
      if (e.data.id !== id) return;
      switch (e.data.kind) {
        case 'progress':
          onProgress?.(e.data.progress);
          break;
        case 'done':
          w.removeEventListener('message', handleMessage);
          resolve(undefined);
          break;
        case 'result':
          w.removeEventListener('message', handleMessage);
          resolve(e.data.vectors);
          break;
        case 'error':
          w.removeEventListener('message', handleMessage);
          reject(new Error(e.data.message));
          break;
      }
    }
    w.addEventListener('message', handleMessage);
    w.postMessage({ id, type, ...payload });
  });
}

/** Warm the model without embedding anything (used to surface download progress up front). */
export async function ensureModel(onProgress?: (p: LoadProgress) => void): Promise<void> {
  await callWorker('load', {}, onProgress);
}

/**
 * Embed texts into mean-pooled, L2-normalized vectors. Runs in a Web Worker,
 * batched so progress can be reported without blocking the main thread.
 */
export async function embed(
  texts: string[],
  onProgress?: (p: LoadProgress) => void,
  batchSize = 32
): Promise<Float32Array[]> {
  const vectors = await callWorker('embed', { texts, batchSize }, onProgress);
  return (vectors ?? []).map((row) => Float32Array.from(row));
}

/** Cosine similarity of two vectors. Assumes normalized inputs but does not require them. */
export function cosine(a: Float32Array, b: Float32Array): number {
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  if (na === 0 || nb === 0) return 0;
  return dot / (Math.sqrt(na) * Math.sqrt(nb));
}
