/**
 * Pump Meter Reading Card
 * Version 3.2 • Displays GHS Sales, Editable UP, Analogue Meter, In-App Camera, and Removable Pumps
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
  X,
  Trash2,
  Gauge,
  PowerOff,
  CheckCircle2,
  Info,
} from 'lucide-react';
import { analyzeMeterPhotoWithAI } from '../../services/aiVisionService';

interface PumpMeterCardProps {
  reading: ReportPumpReading;
  positionNumber: number;
  product?: ConfiguredProduct;
  unitPrice?: number;
  onUpdate: (updated: Partial<ReportPumpReading>) => void;
  onRemovePump?: (readingId: string) => void;
  onPreviewPhoto?: (url: string, title: string) => void;
  onOpenCamera?: (reading: ReportPumpReading) => void;
}

export const PumpMeterCard: React.FC<PumpMeterCardProps> = ({
  reading,
  positionNumber,
  product,
  unitPrice = 16.59,
  onUpdate,
  onRemovePump,
  onPreviewPhoto,
  onOpenCamera,
}) => {
  const [isProcessingAi, setIsProcessingAi] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Compute sales helper
  const computeSales = (
    opening: number | null,
    closing: number | null,
    isRoll: boolean,
    cap = 100000
  ): { litres: number | null; amount: number | null; warning: string | null } => {
    if (opening === null || closing === null) {
      return {
        litres: null,
        amount: null,
        warning: opening === null ? 'Missing opening meter' : null,
      };
    }
    if (closing < opening) {
      if (isRoll) {
        const s = Math.max(0, (cap - opening) + closing);
        const l = Math.round(s * 100) / 100;
        return { litres: l, amount: Math.round(l * unitPrice * 100) / 100, warning: null };
      } else {
        const diff = Math.max(0, closing - opening);
        return {
          litres: diff,
          amount: Math.round(diff * unitPrice * 100) / 100,
          warning: `Closing meter (${closing}) is lower than opening (${opening}). Check for typo or confirm rollover.`,
        };
      }
    }
    const diff = Math.round((closing - opening) * 100) / 100;
    return {
      litres: diff,
      amount: Math.round(diff * unitPrice * 100) / 100,
      warning: null,
    };
  };

  const handleClosingChange = (valStr: string) => {
    if (valStr.trim() === '') {
      onUpdate({
        closingMeter: null,
        litresSold: null,
        amountGhs: null,
        isConfirmed: false,
      });
      return;
    }
    const val = parseFloat(valStr);
    if (!isNaN(val)) {
      const { litres, amount, warning } = computeSales(
        reading.openingMeter,
        val,
        reading.isRollover,
        reading.rolloverCapacity || 100000
      );
      onUpdate({
        closingMeter: val,
        litresSold: litres,
        amountGhs: amount,
        warning,
        isConfirmed: true,
        ocrStatus: reading.ocrStatus === 'candidate' ? 'confirmed' : reading.ocrStatus,
      });
    }
  };

  const handleOpeningChange = (valStr: string) => {
    if (valStr.trim() === '') {
      onUpdate({
        openingMeter: null,
        litresSold: null,
        amountGhs: null,
        warning: 'Missing opening meter',
      });
      return;
    }
    const val = parseFloat(valStr);
    if (!isNaN(val)) {
      const { litres, amount, warning } = computeSales(
        val,
        reading.closingMeter,
        reading.isRollover,
        reading.rolloverCapacity || 100000
      );
      onUpdate({
        openingMeter: val,
        litresSold: litres,
        amountGhs: amount,
        warning,
      });
    }
  };

  const handleToggleRollover = (enabled: boolean) => {
    const { litres, amount, warning } = computeSales(
      reading.openingMeter,
      reading.closingMeter,
      enabled,
      reading.rolloverCapacity || 100000
    );
    onUpdate({
      isRollover: enabled,
      litresSold: litres,
      amountGhs: amount,
      warning,
    });
  };

  const handleAcceptAiReading = () => {
    const candidate = reading.candidateOcrReading ?? reading.aiVisionReading;
    if (candidate !== null && candidate !== undefined) {
      const { litres, amount, warning } = computeSales(
        reading.openingMeter,
        candidate,
        reading.isRollover,
        reading.rolloverCapacity || 100000
      );
      onUpdate({
        closingMeter: candidate,
        litresSold: litres,
        amountGhs: amount,
        warning,
        ocrStatus: 'confirmed',
        isConfirmed: true,
      });
    }
  };

  const handleRunAiVision = async () => {
    if (!reading.photoDataUrl) return;
    setIsProcessingAi(true);
    try {
      const res = await analyzeMeterPhotoWithAI(reading.photoDataUrl, {
        expectedOpeningValue: reading.openingMeter,
        pumpLabel: reading.pumpLabelSnapshot,
        productCode: reading.productCodeSnapshot,
      });
      onUpdate({
        candidateOcrReading: res.reading,
        ocrConfidence: res.confidence,
        ocrStatus: res.reading !== null ? 'candidate' : 'failed',
        aiVisionReading: res.reading,
        aiVisionConfidence: res.confidence,
        aiVisionClear: res.isClear,
        aiVisionMeterType: res.meterType,
        aiVisionRawDigits: res.rawDigitsDetected,
        aiVisionUnclearReason: res.unclearReason,
      });
    } catch (e) {
      console.warn('AI analysis error on pump card:', e);
    } finally {
      setIsProcessingAi(false);
    }
  };

  const hasNegativeMovement =
    reading.openingMeter !== null &&
    reading.closingMeter !== null &&
    reading.closingMeter < reading.openingMeter &&
    !reading.isRollover;

  return (
    <div
      className={`rounded-2xl border transition-all ${
        reading.isIdleOrOptional
          ? 'bg-slate-950/40 border-slate-800/60 opacity-60'
          : hasNegativeMovement
          ? 'bg-rose-950/20 border-rose-500/50 shadow-md shadow-rose-950/20'
          : reading.isConfirmed && reading.closingMeter !== null
          ? 'bg-slate-900/95 border-slate-700/80 shadow-sm'
          : 'bg-slate-900/60 border-slate-800'
      }`}
    >
      {/* Card Header */}
      <div className="px-4 py-3 border-b border-slate-800/80 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <span className="w-5 h-5 rounded-full bg-slate-800 text-slate-300 font-mono text-[11px] font-bold flex items-center justify-center">
            {positionNumber}
          </span>
          <span className="font-extrabold text-white text-base tracking-tight">
            {reading.pumpLabelSnapshot}
          </span>
          <span
            className={`text-[10px] font-black px-2 py-0.5 rounded-md ${
              product?.badgeBg || 'bg-slate-800'
            } ${product?.badgeText || 'text-slate-300'}`}
          >
            {reading.productCodeSnapshot}
          </span>
          <span className="text-[11px] text-amber-400 font-mono">
            @ ¢{unitPrice.toFixed(2)}
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          {/* Confirmed / Verified Badge */}
          {reading.closingMeter !== null && (
            <button
              type="button"
              onClick={() => onUpdate({ isConfirmed: !reading.isConfirmed })}
              className={`px-2 py-0.5 rounded-full text-[11px] font-bold flex items-center gap-1 transition-colors ${
                reading.isConfirmed
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                  : 'bg-amber-500/20 text-amber-400 border border-amber-500/30 hover:bg-amber-500/30'
              }`}
              title="Toggle manager verification"
            >
              <Check className="w-3 h-3" />
              <span>{reading.isConfirmed ? 'Verified' : 'Unconfirmed'}</span>
            </button>
          )}

          {/* Camera Button */}
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

          {/* Remove / Delete Pump Button (Removable pump requirement) */}
          {onRemovePump && (
            <button
              type="button"
              onClick={() => onRemovePump(reading.id)}
              className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-slate-800 transition-colors"
              title="Remove this pump from report"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Main Card Body */}
      <div className="p-4 space-y-3.5">
        {/* Warning Banner */}
        {reading.warning && !reading.isIdleOrOptional && (
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
                  Enable rollover calculation
                </button>
              )}
            </div>
          </div>
        )}

        {/* Input Fields */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          {/* Opening Meter */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-400 mb-1">
              Opening (L)
            </label>
            <input
              type="number"
              step="0.01"
              value={reading.openingMeter !== null ? reading.openingMeter : ''}
              onChange={(e) => handleOpeningChange(e.target.value)}
              placeholder="0.00"
              className={`w-full px-2.5 py-1.5 text-xs font-mono-numbers rounded-xl border focus:outline-none transition-colors ${
                reading.openingMeter === null
                  ? 'bg-amber-950/20 border-amber-500/50 text-amber-300'
                  : 'bg-slate-950 border-slate-700 text-slate-200 focus:border-amber-500'
              }`}
            />
          </div>

          {/* Closing Meter */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-400 mb-1">
              Closing (L)
            </label>
            <input
              type="number"
              step="0.01"
              value={reading.closingMeter !== null ? reading.closingMeter : ''}
              onChange={(e) => handleClosingChange(e.target.value)}
              placeholder="0.00"
              className="w-full px-2.5 py-1.5 text-xs font-mono-numbers rounded-xl bg-slate-950 border border-slate-700 text-white focus:border-amber-500 focus:outline-none font-bold"
            />
          </div>

          {/* Litres Sold */}
          <div className="bg-slate-950/80 rounded-xl p-2 border border-slate-800 flex flex-col justify-center">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              Litres Sold
            </span>
            <span
              className={`text-sm font-mono-numbers font-black ${
                reading.litresSold !== null ? 'text-amber-400' : 'text-slate-500'
              }`}
            >
              {reading.litresSold !== null
                ? `${reading.litresSold.toLocaleString(undefined, { minimumFractionDigits: 2 })} L`
                : '— L'}
            </span>
          </div>

          {/* Total Sales (¢) */}
          <div className="bg-slate-950/80 rounded-xl p-2 border border-slate-800 flex flex-col justify-center">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              Sales Amount (¢)
            </span>
            <span
              className={`text-sm font-mono-numbers font-black ${
                reading.amountGhs !== null ? 'text-emerald-400' : 'text-slate-500'
              }`}
            >
              {reading.amountGhs !== null && reading.amountGhs !== undefined
                ? `¢ ${reading.amountGhs.toLocaleString(undefined, { minimumFractionDigits: 2 })}`
                : '—'}
            </span>
          </div>
        </div>

        {/* Analogue / Mechanical Totalizer Reading Field */}
        <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800/80 flex items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-1.5 text-slate-400">
            <Gauge className="w-3.5 h-3.5 text-sky-400" />
            <span className="font-semibold text-slate-300">Analogue Reading:</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs text-slate-400 font-bold">{reading.pumpLabelSnapshot}-</span>
            <input
              type="text"
              placeholder="e.g. 483179"
              value={reading.analogueMeter || ''}
              onChange={(e) => onUpdate({ analogueMeter: e.target.value.trim() || null })}
              className="w-28 px-2 py-1 bg-slate-900 border border-slate-700 rounded-lg text-xs font-mono text-white focus:outline-none focus:border-sky-400"
            />
          </div>
        </div>

        {/* AI Vision Candidate Review Banner */}
        {((reading.candidateOcrReading !== null && reading.candidateOcrReading !== undefined && reading.closingMeter !== reading.candidateOcrReading) ||
          (reading.aiVisionReading !== null && reading.aiVisionReading !== undefined && reading.closingMeter !== reading.aiVisionReading)) && (
          <div className="p-3 rounded-xl bg-slate-950/80 border border-emerald-500/40 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-emerald-400 shrink-0" />
                <span className="text-[11px] font-bold text-slate-200">AI Vision Detected Meter Reading</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-md bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                  {reading.aiVisionConfidence || reading.ocrConfidence || 95}% Confidence
                </span>
                {reading.aiVisionMeterType && (
                  <span className="text-[10px] text-slate-400 font-mono capitalize">
                    {reading.aiVisionMeterType.replace('_', ' ')}
                  </span>
                )}
              </div>
            </div>

            <div className="flex items-baseline justify-between pt-0.5">
              <div className="flex items-baseline gap-2">
                <span className="font-mono text-xl font-black text-emerald-400">
                  {(reading.candidateOcrReading ?? reading.aiVisionReading)?.toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 3,
                  })}
                </span>
                <span className="text-xs font-semibold text-slate-400">Litres</span>
              </div>
              <button
                type="button"
                onClick={handleAcceptAiReading}
                className="px-3.5 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs shadow transition-all active:scale-95 flex items-center gap-1.5"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Confirm & Apply</span>
              </button>
            </div>
          </div>
        )}

        {/* AI Vision Unclear Photo Warning */}
        {reading.photoDataUrl && (reading.aiVisionClear === false || reading.aiVisionUnclearReason) && (
          <div className="p-2.5 rounded-xl bg-amber-950/30 border border-amber-500/40 flex items-start justify-between gap-2 text-xs">
            <div className="flex items-start gap-2 text-amber-300">
              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-amber-200 block">AI Notice: Photo Unclear</span>
                <span className="text-[11px] text-slate-300">
                  {reading.aiVisionUnclearReason || 'Digits are blurred, obscured, or have glare. Please capture a clearer photo or enter manually.'}
                </span>
              </div>
            </div>
            {onOpenCamera && (
              <button
                type="button"
                onClick={() => onOpenCamera(reading)}
                className="px-2.5 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 font-semibold text-[11px] border border-amber-500/30 shrink-0"
              >
                Retake
              </button>
            )}
          </div>
        )}

        {/* Attached Photo Thumbnail */}
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
                <span className="text-xs font-semibold text-slate-300 block">Meter Photo Attached</span>
                <span className="text-[10px] text-slate-500 font-mono">
                  {reading.isConfirmed ? 'Verified & Linked' : 'Awaiting confirmation'}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={handleRunAiVision}
                disabled={isProcessingAi}
                className="px-2 py-1 text-[11px] font-bold rounded-md bg-slate-800 hover:bg-slate-700 text-amber-300 border border-slate-700 flex items-center gap-1"
                title="Scan with AI Vision"
              >
                <RefreshCw className={`w-3 h-3 ${isProcessingAi ? 'animate-spin' : ''}`} />
                <span>{isProcessingAi ? 'Scanning...' : 'AI Scan'}</span>
              </button>
              <button
                type="button"
                onClick={() => onPreviewPhoto?.(reading.photoDataUrl!, `${reading.pumpLabelSnapshot} Meter Photo`)}
                className="p-1 text-slate-400 hover:text-white"
                title="View full photo"
              >
                <Eye className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => onUpdate({ photoDataUrl: undefined, candidateOcrReading: null, aiVisionReading: null, aiVisionUnclearReason: null })}
                className="p-1 text-slate-400 hover:text-rose-400"
                title="Delete photo"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Quick Options / Advanced accordion */}
        <div className="flex items-center justify-between text-[11px] pt-1">
          <label className="flex items-center gap-1.5 text-slate-400 cursor-pointer hover:text-slate-200">
            <input
              type="checkbox"
              checked={Boolean(reading.isIdleOrOptional)}
              onChange={(e) => onUpdate({ isIdleOrOptional: e.target.checked })}
              className="rounded border-slate-700 bg-slate-950 text-amber-500 focus:ring-0"
            />
            <span>Mark Idle / Not used today</span>
          </label>

          <button
            type="button"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="text-slate-400 hover:text-slate-200 flex items-center gap-1"
          >
            {showAdvanced ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            <span>Rollover / Notes</span>
          </button>
        </div>

        {showAdvanced && (
          <div className="pt-2 space-y-2 border-t border-slate-800 text-xs">
            <label className="flex items-center gap-2 text-slate-300 cursor-pointer">
              <input
                type="checkbox"
                checked={reading.isRollover}
                onChange={(e) => handleToggleRollover(e.target.checked)}
                className="rounded border-slate-700 bg-slate-950 text-amber-500 focus:ring-0"
              />
              <span>Meter Rollover occurred today</span>
            </label>

            <input
              type="text"
              placeholder="Nozzle note (e.g. pump test / calibration 20L)"
              value={reading.notes || ''}
              onChange={(e) => onUpdate({ notes: e.target.value })}
              className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-300 placeholder-slate-600 focus:outline-none"
            />
          </div>
        )}
      </div>
    </div>
  );
};
