/**
 * Bulk Meter Photo Upload & OCR Modal
 * Supports batch photo processing and candidate reading suggestions.
 */

import React, { useState } from 'react';
import { DailyReport, ReportPumpReading } from '../../types/report';
import { X, Upload, Sparkles, Check, RefreshCw, Trash2, CheckCircle2, AlertTriangle } from 'lucide-react';
import { preprocessMeterImage } from '../ocr/imagePreprocessing';
import { analyzeMeterPhotoWithAI } from '../../services/aiVisionService';
import { generateAllSamplePhotos } from '../ocr/sampleMeterImages';

interface BulkUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  report: DailyReport;
  onApplyReadings: (readings: Record<string, Partial<ReportPumpReading>>) => void;
  onPreviewPhoto?: (url: string, title: string) => void;
}

interface AssignedSlot {
  position: number;
  readingId: string;
  pumpLabel: string;
  productCode: string;
  fileName: string;
  originalThumbnail: string;
  processedDataUrl: string;
  candidateNumber: number | null;
  confidence: number;
  status: 'assigned' | 'processing' | 'candidate' | 'confirmed' | 'failed';
  error?: string;
}

export const BulkUploadModal: React.FC<BulkUploadModalProps> = ({
  isOpen,
  onClose,
  report,
  onApplyReadings,
  onPreviewPhoto,
}) => {
  const [slots, setSlots] = useState<AssignedSlot[]>([]);
  const [isProcessingBatch, setIsProcessingBatch] = useState(false);
  const [batchProgress, setBatchProgress] = useState({ current: 0, total: 0 });

  if (!isOpen) return null;

  // Handle files selected from device
  const handleFilesSelected = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    const fileList = Array.from(files).slice(0, report.pumps.length);
    const newSlots: AssignedSlot[] = [];

    for (let i = 0; i < fileList.length; i++) {
      const file = fileList[i];
      const targetPump = report.pumps[i] || report.pumps[report.pumps.length - 1];

      try {
        const { originalThumbnail, processedDataUrl } = await preprocessMeterImage(file);
        newSlots.push({
          position: i + 1,
          readingId: targetPump.id,
          pumpLabel: targetPump.pumpLabelSnapshot,
          productCode: targetPump.productCodeSnapshot,
          fileName: file.name,
          originalThumbnail,
          processedDataUrl,
          candidateNumber: null,
          confidence: 0,
          status: 'assigned',
        });
      } catch (err) {
        console.error('Failed to preprocess file', file.name, err);
      }
    }

    setSlots(newSlots);
  };

  // Run Gemini AI Vision on all slots
  const handleRunAiVisionAll = async () => {
    if (slots.length === 0) return;
    setIsProcessingBatch(true);
    setBatchProgress({ current: 0, total: slots.length });

    const updatedSlots = [...slots];

    for (let i = 0; i < updatedSlots.length; i++) {
      const slot = updatedSlots[i];
      slot.status = 'processing';
      setSlots([...updatedSlots]);

      const pumpReading = report.pumps.find((p) => p.id === slot.readingId);
      const expectedOpening = pumpReading?.openingMeter;

      try {
        const visionRes = await analyzeMeterPhotoWithAI(slot.processedDataUrl, {
          expectedOpeningValue: expectedOpening,
          pumpLabel: slot.pumpLabel,
          productCode: slot.productCode,
        });

        slot.candidateNumber = visionRes.reading;
        slot.confidence = visionRes.confidence;
        slot.status = visionRes.reading !== null && visionRes.isClear ? 'candidate' : 'failed';
        if (visionRes.reading === null || !visionRes.isClear) {
          slot.error = visionRes.unclearReason || 'Unclear or blurry digits';
        }
      } catch (err: any) {
        slot.status = 'failed';
        slot.error = err?.message || 'AI Vision failed';
      }

      setBatchProgress({ current: i + 1, total: slots.length });
      setSlots([...updatedSlots]);
    }

    setIsProcessingBatch(false);
  };

  // Load sample pack
  const handleLoadSamplePack = async () => {
    const samples = generateAllSamplePhotos();
    const newSlots: AssignedSlot[] = [];

    for (let i = 0; i < Math.min(samples.length, report.pumps.length); i++) {
      const sample = samples[i];
      const targetPump = report.pumps[i];
      const { originalThumbnail, processedDataUrl } = await preprocessMeterImage(sample.dataUrl);

      newSlots.push({
        position: i + 1,
        readingId: targetPump.id,
        pumpLabel: targetPump.pumpLabelSnapshot,
        productCode: targetPump.productCodeSnapshot,
        fileName: sample.fileName,
        originalThumbnail,
        processedDataUrl,
        candidateNumber: sample.expectedReading,
        confidence: 96,
        status: 'candidate',
      });
    }

    setSlots(newSlots);
  };

  // Apply confirmed readings back to report
  const handleApplyAll = () => {
    const updates: Record<string, Partial<ReportPumpReading>> = {};

    slots.forEach((slot) => {
      const candidate = slot.candidateNumber;
      if (candidate !== null && !isNaN(candidate)) {
        updates[slot.readingId] = {
          closingMeter: candidate,
          candidateOcrReading: candidate,
          ocrConfidence: slot.confidence,
          ocrStatus: 'confirmed',
          photoDataUrl: slot.originalThumbnail,
          isConfirmed: true,
        };
      } else if (slot.originalThumbnail) {
        updates[slot.readingId] = {
          photoDataUrl: slot.originalThumbnail,
        };
      }
    });

    onApplyReadings(updates);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/85 backdrop-blur-sm overflow-y-auto animate-in fade-in duration-150">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden my-auto">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-800/50">
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Upload className="w-5 h-5 text-amber-400" />
              <span>Bulk Meter Photo Upload & AI Vision Processing</span>
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Select multiple photos at once. AI Vision reads dispenser counters and lets you review before applying.
            </p>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Action Controls */}
        <div className="p-4 bg-slate-800/40 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <label className="px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs cursor-pointer flex items-center gap-1.5 shadow">
              <Upload className="w-4 h-4" />
              <span>Select Photos from Device</span>
              <input
                type="file"
                multiple
                accept="image/*"
                className="hidden"
                onChange={(e) => handleFilesSelected(e.target.files)}
              />
            </label>

            <button
              type="button"
              onClick={handleLoadSamplePack}
              className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>Load Test Pack</span>
            </button>
          </div>

          {slots.length > 0 && (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleRunAiVisionAll}
                disabled={isProcessingBatch}
                className="px-3.5 py-2 rounded-xl bg-slate-700 hover:bg-slate-600 disabled:opacity-50 text-white text-xs font-bold flex items-center gap-1.5"
              >
                {isProcessingBatch ? (
                  <RefreshCw className="w-4 h-4 animate-spin text-amber-400" />
                ) : (
                  <Sparkles className="w-4 h-4 text-amber-400" />
                )}
                <span>
                  {isProcessingBatch
                    ? `AI Analyzing (${batchProgress.current}/${batchProgress.total})`
                    : 'Analyze All with AI Vision'}
                </span>
              </button>

              <button
                type="button"
                onClick={handleApplyAll}
                className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 shadow"
              >
                <Check className="w-4 h-4" />
                <span>Apply to Report</span>
              </button>
            </div>
          )}
        </div>

        {/* Slots Content */}
        <div className="p-5 overflow-y-auto space-y-3 flex-1">
          {slots.length === 0 ? (
            <div className="py-16 text-center space-y-2 border border-dashed border-slate-800 rounded-2xl">
              <Upload className="w-10 h-10 text-slate-600 mx-auto" />
              <p className="text-sm font-semibold text-slate-300">No photos selected yet</p>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Choose images from your device gallery or click "Load Test Pack" to test OCR with sample meter pictures.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {slots.map((slot, index) => (
                <div
                  key={index}
                  className="bg-slate-950 border border-slate-800 rounded-xl p-3 flex flex-col justify-between space-y-2.5"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-white">
                      {slot.pumpLabel} ({slot.productCode})
                    </span>
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                        slot.status === 'candidate'
                          ? 'bg-amber-500/20 text-amber-400'
                          : slot.status === 'processing'
                          ? 'bg-blue-500/20 text-blue-400 animate-pulse'
                          : slot.status === 'failed'
                          ? 'bg-rose-500/20 text-rose-400'
                          : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      {slot.status}
                    </span>
                  </div>

                  <div className="flex items-center gap-3">
                    <img
                      src={slot.originalThumbnail}
                      alt={slot.pumpLabel}
                      className="w-16 h-16 rounded-lg object-cover border border-slate-800 shrink-0"
                    />

                    <div className="flex-1 min-w-0">
                      <span className="text-[10px] text-slate-400 block truncate">
                        {slot.fileName}
                      </span>
                      <div className="mt-1">
                        <label className="text-[10px] text-slate-400 block">Candidate:</label>
                        <input
                          type="number"
                          step="0.01"
                          value={slot.candidateNumber !== null ? slot.candidateNumber : ''}
                          onChange={(e) => {
                            const val = parseFloat(e.target.value);
                            const copy = [...slots];
                            copy[index].candidateNumber = !isNaN(val) ? val : null;
                            setSlots(copy);
                          }}
                          placeholder="Reading"
                          className="w-full px-2 py-1 bg-slate-900 border border-slate-700 rounded text-xs font-mono text-white"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
