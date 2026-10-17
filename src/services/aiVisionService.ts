/**
 * AI Vision Meter Reading Service
 * Powered by Gemini Vision model on the server-side.
 * Accurately reads mechanical and digital fuel pump totalizer meters,
 * returns structured data with decimals, and avoids guessing when images are unclear.
 */

export interface AiVisionResult {
  success: boolean;
  reading: number | null;
  confidence: number; // 0 to 100
  isClear: boolean;
  meterType?: string;
  rawDigitsDetected?: string;
  unclearReason?: string | null;
  suggestManualEntry: boolean;
  notes?: string;
  error?: string;
}

export interface AnalyzeMeterOptions {
  expectedOpeningValue?: number | null;
  pumpLabel?: string;
  productCode?: string;
  onProgress?: (step: string) => void;
}

/**
 * Analyzes a fuel pump meter photo using AI Vision (Gemini 3.8 Flash).
 * Returns detected reading, precision, confidence, and clarity validation.
 */
export async function analyzeMeterPhotoWithAI(
  photoDataUrl: string,
  options?: AnalyzeMeterOptions
): Promise<AiVisionResult> {
  try {
    options?.onProgress?.('Uploading image to AI Vision...');

    const response = await fetch('/api/vision/read-meter', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        photoDataUrl,
        expectedOpeningValue: options?.expectedOpeningValue,
        pumpLabel: options?.pumpLabel,
        productCode: options?.productCode,
      }),
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      const errorMsg = errData.error || `Server responded with status ${response.status}`;
      return {
        success: false,
        reading: null,
        confidence: 0,
        isClear: false,
        suggestManualEntry: true,
        unclearReason: 'AI service currently unreachable. You can enter the reading manually.',
        error: errorMsg,
      };
    }

    const data = await response.json();
    return {
      success: Boolean(data.success),
      reading: typeof data.reading === 'number' ? data.reading : null,
      confidence: typeof data.confidence === 'number' ? data.confidence : 0,
      isClear: Boolean(data.isClear),
      meterType: data.meterType || 'electronic_lcd',
      rawDigitsDetected: data.rawDigitsDetected || '',
      unclearReason: data.unclearReason || null,
      suggestManualEntry: Boolean(data.suggestManualEntry),
      notes: data.notes || '',
    };
  } catch (err: any) {
    console.warn('Network or client error during AI Vision meter analysis:', err);
    return {
      success: false,
      reading: null,
      confidence: 0,
      isClear: false,
      suggestManualEntry: true,
      unclearReason: 'Network error analyzing photo. Please enter reading manually or retry.',
      error: err?.message || 'Network error',
    };
  }
}
