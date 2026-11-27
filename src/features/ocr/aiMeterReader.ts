import { recognizeMeterImage, OcrResult } from './ocrService';

export interface AiResult {
  candidate: number | null;
  confidence: number; // 0-100
  source: 'ai' | 'ocr' | 'fallback';
  rawText?: string;
}

const AI_ENDPOINT_KEY = 'omc_ai_inference_url';

/**
 * Calls a configured AI inference endpoint if present. Endpoint must accept JSON { image: dataUrl }
 * and return JSON { reading: number|null, confidence: number }
 * If no endpoint is configured or the request fails, falls back to the local OCR pipeline.
 */
export async function aiRecognizeMeterImage(
  imageDataUrl: string,
  expectedOpeningValue?: number | null,
  onProgress?: (p: number) => void
): Promise<AiResult> {
  const configured = (() => {
    try {
      return localStorage.getItem(AI_ENDPOINT_KEY) || '';
    } catch (e) {
      return '';
    }
  })();

  // Helper to call local OCR when AI is not available or fails
  const fallbackToOcr = async (): Promise<AiResult> => {
    const ocr = await recognizeMeterImage(imageDataUrl, expectedOpeningValue, onProgress);
    return {
      candidate: ocr.candidate,
      confidence: ocr.confidence,
      source: 'ocr',
      rawText: ocr.rawText,
    };
  };

  if (!configured) {
    return fallbackToOcr();
  }

  // Try calling AI endpoint
  try {
    // Send lightweight request (base64 image may be large; many endpoints accept it)
    const resp = await fetch(configured, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ image: imageDataUrl }),
    });

    if (!resp.ok) {
      console.warn('AI inference endpoint returned non-OK response, falling back to OCR');
      return fallbackToOcr();
    }

    const payload = await resp.json();
    // Accept { reading, confidence }
    const reading = payload?.reading ?? null;
    const confidence = Number.isFinite(payload?.confidence) ? Math.round(Number(payload.confidence)) : 0;

    if (reading === null || reading === undefined) {
      return {
        candidate: null,
        confidence: confidence || 0,
        source: 'ai',
      };
    }

    return {
      candidate: Number(reading),
      confidence: confidence || 0,
      source: 'ai',
      rawText: payload?.rawText || undefined,
    };
  } catch (err) {
    console.warn('AI inference failed, falling back to OCR:', err);
    return fallbackToOcr();
  }
}
