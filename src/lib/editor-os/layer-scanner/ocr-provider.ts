import type { RawOcrWord } from "./region-grouper";

/**
 * Fase 6 — tesseract.js is imported dynamically so the OCR engine (and its
 * WASM core) never loads on EditorOS's first render, only when the user
 * actually clicks "Escanear camadas". The worker is created once and
 * reused across scans in the same session; call `terminateOcrWorker()`
 * when the editor unmounts or the scanner panel is released for good.
 */

type TesseractWorker = Awaited<ReturnType<typeof import("tesseract.js").createWorker>>;

let workerPromise: Promise<TesseractWorker> | null = null;
let workerLangs: string | null = null;

async function getWorker(languages: Array<"por" | "eng">): Promise<TesseractWorker> {
  const langKey = languages.join("+");
  if (workerPromise && workerLangs === langKey) return workerPromise;

  // Requesting a different language set than the cached worker — terminate and recreate rather than stacking workers.
  if (workerPromise && workerLangs !== langKey) {
    const stale = await workerPromise;
    await stale.terminate();
    workerPromise = null;
  }

  workerLangs = langKey;
  workerPromise = (async () => {
    const { createWorker } = await import("tesseract.js");
    return createWorker(languages);
  })();
  return workerPromise;
}

export async function terminateOcrWorker(): Promise<void> {
  if (!workerPromise) return;
  const worker = await workerPromise;
  workerPromise = null;
  workerLangs = null;
  await worker.terminate();
}

export interface OcrRunResult {
  words: RawOcrWord[];
  sourceImageWidth: number;
  sourceImageHeight: number;
}

/**
 * Runs OCR over the real pixels of the given image element — never a
 * screenshot of the page or the viewport. `image` must already be loaded
 * (naturalWidth/naturalHeight populated).
 */
export async function runOcr(
  image: HTMLImageElement,
  languages: Array<"por" | "eng">,
  onProgress?: (progress: number) => void,
  signal?: AbortSignal
): Promise<OcrRunResult> {
  if (signal?.aborted) throw new DOMException("Scan cancelled", "AbortError");

  const worker = await getWorker(languages);
  if (signal?.aborted) throw new DOMException("Scan cancelled", "AbortError");
  if (onProgress) onProgress(0.1);

  const result = await worker.recognize(image, {}, { blocks: true } as never);
  if (signal?.aborted) throw new DOMException("Scan cancelled", "AbortError");
  if (onProgress) onProgress(1);

  const words: RawOcrWord[] = [];
  for (const block of result.data.blocks ?? []) {
    for (const paragraph of block.paragraphs ?? []) {
      for (const line of paragraph.lines ?? []) {
        for (const word of line.words ?? []) {
          words.push({
            text: word.text,
            confidence: word.confidence / 100,
            x0: word.bbox.x0,
            y0: word.bbox.y0,
            x1: word.bbox.x1,
            y1: word.bbox.y1,
          });
        }
      }
    }
  }

  return { words, sourceImageWidth: image.naturalWidth, sourceImageHeight: image.naturalHeight };
}
