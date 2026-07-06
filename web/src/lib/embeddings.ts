import { pipeline, env, type FeatureExtractionPipeline } from '@huggingface/transformers';

// Model weights are bundled under public/models/ and served from this origin,
// so the first-use download doesn't depend on the HF CDN.
env.allowLocalModels = true;
env.allowRemoteModels = false;

const MODEL_ID = 'Xenova/all-MiniLM-L6-v2';

export interface LoadProgress {
  stage: 'downloading' | 'embedding' | 'ready';
  /** 0..1 when known, otherwise undefined (indeterminate). */
  progress?: number;
  message: string;
}

let extractorPromise: Promise<FeatureExtractionPipeline> | null = null;

/**
 * Lazily construct the shared feature-extraction pipeline. The ~25 MB model is
 * fetched once from the CDN; subsequent calls reuse the in-memory instance.
 */
function getExtractor(onProgress?: (p: LoadProgress) => void): Promise<FeatureExtractionPipeline> {
  if (!extractorPromise) {
    extractorPromise = pipeline('feature-extraction', MODEL_ID, {
      progress_callback: (info: { status?: string; progress?: number; file?: string }) => {
        if (!onProgress) return;
        if (info.status === 'progress' && typeof info.progress === 'number') {
          onProgress({
            stage: 'downloading',
            progress: info.progress / 100,
            message: `Downloading embedding model (${Math.round(info.progress)}%)`,
          });
        } else if (info.status === 'ready') {
          onProgress({ stage: 'ready', message: 'Model ready' });
        }
      },
    }).catch((err) => {
      // Reset so a later call can retry after a transient network failure.
      extractorPromise = null;
      throw err;
    });
  }
  return extractorPromise;
}

/** Warm the model without embedding anything (used to surface download progress up front). */
export async function ensureModel(onProgress?: (p: LoadProgress) => void): Promise<void> {
  await getExtractor(onProgress);
}

/**
 * Embed texts into mean-pooled, L2-normalized vectors. Processes in batches so
 * progress can be reported and the main thread isn't starved on long inputs.
 */
export async function embed(
  texts: string[],
  onProgress?: (p: LoadProgress) => void,
  batchSize = 32
): Promise<Float32Array[]> {
  const extractor = await getExtractor(onProgress);
  const out: Float32Array[] = [];

  for (let i = 0; i < texts.length; i += batchSize) {
    const batch = texts.slice(i, i + batchSize).map((t) => (t.trim() ? t : ' '));
    const tensor = await extractor(batch, { pooling: 'mean', normalize: true });
    const rows = tensor.tolist() as number[][];
    for (const row of rows) out.push(Float32Array.from(row));

    onProgress?.({
      stage: 'embedding',
      progress: Math.min(1, (i + batch.length) / texts.length),
      message: `Embedding ${Math.min(i + batch.length, texts.length)} / ${texts.length}`,
    });
    // Yield to the event loop between batches.
    await new Promise((r) => setTimeout(r, 0));
  }

  onProgress?.({ stage: 'ready', message: 'Done' });
  return out;
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
