// Runs the transformers.js feature-extraction pipeline off the main thread so
// embedding a large conversation doesn't block the UI/render loop.
import { pipeline, env, type FeatureExtractionPipeline } from '@huggingface/transformers';

env.allowLocalModels = true;
env.allowRemoteModels = false;
// Default is the origin-absolute '/models/', which 404s once the app is
// served under a sub-path (e.g. GitHub Pages' '/convolyzer/'). Anchor it to
// Vite's configured base instead so local lookups resolve in both dev and prod.
env.localModelPath = `${import.meta.env.BASE_URL}models/`;

const MODEL_ID = 'Xenova/all-MiniLM-L6-v2';

// `self` in a module worker has the Worker's own postMessage/onmessage shape;
// casting through the main-thread `Worker` type avoids pulling in the
// `webworker` lib (which conflicts with the `dom` lib already used app-wide).
const ctx = self as unknown as Worker;

interface ProgressInfo {
  stage: 'downloading' | 'embedding' | 'ready';
  progress?: number;
  message: string;
}

let extractorPromise: Promise<FeatureExtractionPipeline> | null = null;

function getExtractor(onProgress: (p: ProgressInfo) => void): Promise<FeatureExtractionPipeline> {
  if (!extractorPromise) {
    extractorPromise = pipeline('feature-extraction', MODEL_ID, {
      progress_callback: (info: { status?: string; progress?: number }) => {
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
      extractorPromise = null;
      throw err;
    });
  }
  return extractorPromise;
}

interface LoadRequest {
  id: number;
  type: 'load';
}

interface EmbedRequest {
  id: number;
  type: 'embed';
  texts: string[];
  batchSize: number;
}

type Request = LoadRequest | EmbedRequest;

ctx.onmessage = async (e: MessageEvent<Request>) => {
  const { id, type } = e.data;
  const onProgress = (progress: ProgressInfo) => ctx.postMessage({ id, kind: 'progress', progress });

  try {
    if (type === 'load') {
      await getExtractor(onProgress);
      ctx.postMessage({ id, kind: 'done' });
    } else {
      const { texts, batchSize } = e.data;
      const extractor = await getExtractor(onProgress);
      const vectors: number[][] = [];

      for (let i = 0; i < texts.length; i += batchSize) {
        const batch = texts.slice(i, i + batchSize).map((t) => (t.trim() ? t : ' '));
        const tensor = await extractor(batch, { pooling: 'mean', normalize: true });
        for (const row of tensor.tolist() as number[][]) vectors.push(row);

        onProgress({
          stage: 'embedding',
          progress: Math.min(1, (i + batch.length) / texts.length),
          message: `Embedding ${Math.min(i + batch.length, texts.length)} / ${texts.length}`,
        });
      }

      ctx.postMessage({ id, kind: 'result', vectors });
    }
  } catch (err) {
    ctx.postMessage({ id, kind: 'error', message: err instanceof Error ? err.message : String(err) });
  }
};
