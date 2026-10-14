/**
 * Pump Meter Reading Card
 * PRD v3.1 Section 8 & 9: In-app camera, OCR suggestion, manager verification, rollover handling.
 */

import React, { useState } from 'react';
import { ReportPumpReading, ConfiguredProduct } from '../../types/report';
import {
  Camera,
  Check,
  AlertTriangle,
  RefreshCw,
  Eye,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Image as ImageIcon,
  CheckCircle2,
  X,
} from 'lucide-react';
import { preprocessMeterImage } from '../ocr/imagePreprocessing';
import { recognizeMeterImage } from '../ocr/ocrService';

interface PumpMeterCardProps {
  reading: ReportPumpReading;
  positionNumber: number;
  product?: ConfiguredProduct;
  onUpdate: (updated: Partial<ReportPumpReading>) => void;
  onPreviewPhoto?: (url: string, title: string) => void;
  onOpenCamera?: (reading: ReportPumpReading) => void;
}

export const PumpMeterCard: React.FC<PumpMeterCardProps> = ({
  reading,
  positionNumber,
  product,
  onUpdate,
  onPreviewPhoto,
  onOpenCamera,
}) => {
  const [isProcessingOcr, setIsProcessingOcr] = useState(false);
  const [ocrProgress, setOcrProgress] = useState(0);
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Compute sales helper
  const computeSales = (
    opening: number | null,
    closing: number | null,
    isRoll: boolean,
    cap = 100000
  ): { litres: number | null; warning: string | null } => {
    if (opening === null || closing === null) {
      return {
        litres: null,
        warning: opening === null ? 'Missing opening meter' : null,
      };
    }
    if (closing < opening) {
      if (isRoll) {
        const s = Math.max(0, (cap - opening) + closing);
        return { litres: Math.round(s * 100) / 100, warning: null };
      } else {
        return {
          litres: Math.max(0, closing - opening),
          warning: `Closing meter (${closing}) is lower than opening (${opening}). Check for typo or confirm rollover.`,
        };
      }
    }
    return {
      litres: Math.round((closing - opening) * 100) / 100,
      warning: null,
    };
  };

  const handleClosingChange = (valStr: string) => {
    if (valStr.trim() === '') {
      onUpdate({
        closingMeter: null,
        litresSold: null,
        isConfirmed: false,
      });
      return;
    }
    const val = parseFloat(valStr);
    if (!isNaN(val)) {
      const { litres, warning } = computeSales(
        reading.openingMeter,
        val,
        reading.isRollover,
        reading.rolloverCapacity || 100000
      );
      onUpdate({
        closingMeter: val,
        litresSold: litres,
        warning,
        isConfirmed: true, // manager manually typed or edited
        ocrStatus: reading.ocrStatus === 'candidate' ? 'confirmed' : reading.ocrStatus,
      });
    }
  };

  const handleOpeningChange = (valStr: string) => {
    if (valStr.trim() === '') {
      onUpdate({
        openingMeter: null,
        litresSold: null,
        warning: 'Missing opening meter',
      });
      return;
    }
    const val = parseFloat(valStr);
    if (!isNaN(val)) {
      const { litres, warning } = computeSales(
        val,
        reading.closingMeter,
        reading.isRollover,
        reading.rolloverCapacity || 100000
      );
      onUpdate({
        openingMeter: val,
        litresSold: litres,
        warning,
      });
    }
  };

  const handleToggleRollover = (enabled: boolean) => {
    const { litres, warning } = computeSales(
      reading.openingMeter,
      reading.closingMeter,
      enabled,
      reading.rolloverCapacity || 100000
    );
    onUpdate({
      isRollover: enabled,
      litresSold: litres,
      warning,
    });
  };

  // Fallback single file upload
  const handleSinglePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsProcessingOcr(true);
      setOcrProgress(15);

      const { originalThumbnail, processedDataUrl } = await preprocessMeterImage(file);
      setOcrProgress(35);

      onUpdate({
        photoDataUrl: originalThumbnail,
        ocrStatus: 'processing',
      });

      const ocrResult = await recognizeMeterImage(
        processedDataUrl,
        reading.openingMeter,
        (progress) => setOcrProgress(progress)
      );

      if (ocrResult.candidate !== null) {
        onUpdate({
          candidateOcrReading: ocrResult.candidate,
          ocrConfidence: ocrResult.confidence,
          ocrStatus: 'candidate',
        });
      } else {
        onUpdate({
          ocrStatus: 'failed',
          ocrError: 'Could not clearly recognize digits',
        });
      }
    } catch (err) {
      console.error('File OCR error:', err);
      onUpdate({ ocrStatus: 'failed' });
    } finally {
      setIsProcessingOcr(false);
    }
  };

  const handleAcceptOcr = () => {
    if (reading.candidateOcrReading !== null && reading.candidateOcrReading !== undefined) {
      const { litres, warning } = computeSales(
        reading.openingMeter,
        reading.candidateOcrReading,
        reading.isRollover,
        reading.rolloverCapacity || 100000
      );
      onUpdate({
        closingMeter: reading.candidateOcrReading,
        litresSold: litres,
        warning,
        ocrStatus: 'confirmed',
        isConfirmed: true,
      });
    }
  };

  const handleToggleConfirmed = () => {
    onUpdate({ isConfirmed: !reading.isConfirmed });
  };

  const hasNegativeMovement =
    reading.openingMeter !== null &&
    reading.closingMeter !== null &&
    reading.closingMeter < reading.openingMeter &&
    !reading.isRollover;

  return (
    <div
      className={`rounded-2xl border transition-all ${
        hasNegativeMovement
          ? 'bg-rose-950/20 border-rose-500/50 shadow-md shadow-rose-950/20'
          : reading.isConfirmed && reading.closingMeter !== null
          ? 'bg-slate-900/90 border-slate-700/80 shadow-sm'
          : 'bg-slate-900/60 border-slate-800'
      }`}
    >
      {/* Card Header */}
      <div className="px-4 py-3 border-b border-slate-800/80 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <span className="w-5 h-5 rounded-full bg-slate-800 text-slate-400 font-mono text-[11px] font-bold flex items-center justify-center">
            {positionNumber}
          </span>
          <span className="font-bold text-white text-base tracking-tight">
            {reading.pumpLabelSnapshot}
          </span>
          <span
            className={`text-[10px] font-black px-2 py-0.5 rounded-md ${
              product?.badgeBg || 'bg-slate-800'
            } ${product?.badgeText || 'text-slate-300'}`}
          >
            {reading.productCodeSnapshot}
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          {reading.closingMeter !== null && (
            <button
              type="button"
              onClick={handleToggleConfirmed}
              className={`px-2 py-0.5 rounded-full text-[11px] font-bold flex items-center gap-1 transition-colors ${
                reading.isConfirmed
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                  : 'bg-amber-500/20 text-amber-400 border border-amber-500/30 hover:bg-amber-500/30'
              }`}
              title="Click to toggle manager confirmation"
            >
              <Check className="w-3 h-3" />
              <span>{reading.isConfirmed ? 'Verified' : 'Unconfirmed'}</span>
            </button>
          )}

          {/* In-App Camera Button */}
          {onOpenCamera && (
            <button
              type="button"
              onClick={() => onOpenCamera(reading)}
              className="p-1.5 rounded-lg bg-amber-500/15 text-amber-400 hover:bg-amber-500/25 border border-amber-500/30 transition-colors"
              title="Take Photo of Meter"
            >
              <Camera className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Main Body Grid */}
      <div className="p-4 space-y-3.5">
        {/* Warning Banner if suspicious or missing */}
        {reading.warning && (
          <div className="p-2.5 rounded-xl bg-amber-950/40 border border-amber-500/30 text-amber-300 text-xs flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0 text-amber-400 mt-0.5" />
            <div className="flex-1 leading-relaxed">
              <span>{reading.warning}</span>
              {hasNegativeMovement && (
                <button
                  type="button"
                  onClick={() => handleToggleRollover(true)}
                  className="block mt-1 font-bold text-amber-200 underline hover:text-white"
                >
                  Enable meter rollover calculation (99,999 → 0)
                </button>
              )}
            </div>
          </div>
        )}

        {/* Meter Inputs */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {/* Opening Meter */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-400 mb-1">
              Opening Meter (L)
            </label>
            <input
              type="number"
              step="0.01"
              value={reading.openingMeter !== null ? reading.openingMeter : ''}
              onChange={(e) => handleOpeningChange(e.target.value)}
              placeholder="0.00"
              className={`w-full px-3 py-2 text-sm font-mono-numbers rounded-xl border focus:outline-none transition-colors ${
                reading.openingMeter === null
                  ? 'bg-amber-950/20 border-amber-500/50 text-amber-300 placeholder-amber-400/50'
                  : 'bg-slate-950 border-slate-700 text-slate-200 focus:border-amber-500'
              }`}
            />
            {reading.openingMeter === null && (
              <span className="text-[10px] text-amber-400 font-medium block mt-1">
                Missing previous close
              </span>
            )}
          </div>

          {/* Closing Meter */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-400 mb-1">
              Closing Meter (L)
            </label>
            <input
              type="number"
              step="0.01"
              value={reading.closingMeter !== null ? reading.closingMeter : ''}
              onChange={(e) => handleClosingChange(e.target.value)}
              placeholder="0.00"
              className="w-full px-3 py-2 text-sm font-mono-numbers rounded-xl bg-slate-950 border border-slate-700 text-white focus:border-amber-500 focus:outline-none font-bold"
            />
          </div>

          {/* Litres Sold */}
          <div className="col-span-2 sm:col-span-1 bg-slate-950/70 rounded-xl p-2.5 border border-slate-800 flex flex-col justify-center">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              Litres Sold
            </span>
            <span
              className={`text-base font-mono-numbers font-black ${
                reading.litresSold !== null ? 'text-amber-400' : 'text-slate-500'
              }`}
            >
              {reading.litresSold !== null
                ? `${reading.litresSold.toLocaleString(undefined, { minimumFractionDigits: 2 })} L`
                : '— L'}
            </span>
          </div>
        </div>

        {/* OCR Candidate Suggestion Banner (if present and not yet applied) */}
        {reading.candidateOcrReading !== null &&
          reading.closingMeter !== reading.candidateOcrReading && (
            <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
                <div>
                  <span className="text-[10px] text-slate-400 block">OCR Detected Suggestion:</span>
                  <span className="font-mono text-sm font-bold text-amber-300">
                    {reading.candidateOcrReading.toLocaleString(undefined, { minimumFractionDigits: 1 })}
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={handleAcceptOcr}
                className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow transition-all"
              >
                Apply Suggestion
              </button>
            </div>
          )}

        {/* Attached Photo Thumbnail & Options */}
        {reading.photoDataUrl && (
          <div className="flex items-center justify-between p-2 rounded-xl bg-slate-950/50 border border-slate-800">
            <div className="flex items-center gap-2.5">
              <img
                src={reading.photoDataUrl}
                alt="Meter snapshot"
                className="w-10 h-10 rounded-lg object-cover border border-slate-700 cursor-pointer"
                onClick={() => onPreviewPhoto?.(reading.photoDataUrl!, `${reading.pumpLabelSnapshot} Meter Photo`)}
              />
              <div>
                <span className="text-xs font-semibold text-slate-300 block">
                  Meter Photo Attached
                </span>
                <span className="text-[10px] text-emerald-400">Ready for report archive</span>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => onPreviewPhoto?.(reading.photoDataUrl!, `${reading.pumpLabelSnapshot} Meter Photo`)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
                title="View full photo"
              >
                <Eye className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => onUpdate({ photoDataUrl: undefined, candidateOcrReading: null })}
                className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800"
                title="Remove photo"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Advanced Rollover & Notes Accordion */}
        <div>
          <button
            type="button"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="text-[11px] font-semibold text-slate-400 hover:text-slate-200 flex items-center gap-1"
          >
            {showAdvanced ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            <span>Rollover settings & notes</span>
          </button>

          {showAdvanced && (
            <div className="pt-2 space-y-2 border-t border-slate-800 mt-2">
              <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={reading.isRollover}
                  onChange={(e) => handleToggleRollover(e.target.checked)}
                  className="rounded border-slate-700 bg-slate-950 text-amber-500 focus:ring-0"
                />
                <span>Totalizer Rollover / Reset occurred today</span>
              </label>

              {reading.isRollover && (
                <div className="pl-6">
                  <label className="block text-[10px] text-slate-400">Rollover Capacity</label>
                  <input
                    type="number"
                    value={reading.rolloverCapacity || 100000}
                    onChange={(e) =>
                      onUpdate({ rolloverCapacity: parseFloat(e.target.value) || 100000 })
                    }
                    className="w-32 px-2 py-1 bg-slate-950 border border-slate-700 rounded text-xs text-white"
                  />
                </div>
              )}

              <input
                type="text"
                placeholder="Optional nozzle note (e.g. nozzle test calibration 20L)"
                value={reading.notes || ''}
                onChange={(e) => onUpdate({ notes: e.target.value })}
                className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-300 placeholder-slate-600 focus:outline-none"
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
