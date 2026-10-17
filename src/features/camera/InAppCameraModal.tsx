/**
 * In-App Camera & Meter Photo Capture Modal
 * Version 3.1 • MediaDevices live camera stream, retake, OCR assistance, and Save to Gallery
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Camera,
  RefreshCw,
  Check,
  Download,
  Share2,
  Sparkles,
  X,
  AlertTriangle,
  Image as ImageIcon,
  CheckCircle2,
  Eye,
  Info,
} from 'lucide-react';
import { analyzeMeterPhotoWithAI, AiVisionResult } from '../../services/aiVisionService';
import { preprocessMeterImage } from '../ocr/imagePreprocessing';

interface InAppCameraModalProps {
  isOpen: boolean;
  onClose: () => void;
  pumpLabel: string;
  productCode: string;
  expectedOpeningValue?: number | null;
  onAcceptPhoto: (
    photoDataUrl: string,
    candidateReading?: number | null,
    confidence?: number,
    metadata?: Partial<AiVisionResult>
  ) => void;
}

export const InAppCameraModal: React.FC<InAppCameraModalProps> = ({
  isOpen,
  onClose,
  pumpLabel,
  productCode,
  expectedOpeningValue,
  onAcceptPhoto,
}) => {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [isAiProcessing, setIsAiProcessing] = useState(false);
  const [aiStatusMessage, setAiStatusMessage] = useState('Analyzing meter image with AI Vision...');
  const [aiVisionResult, setAiVisionResult] = useState<AiVisionResult | null>(null);
  const [gallerySaveNotice, setGallerySaveNotice] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Initialize camera stream
  const startCamera = useCallback(async () => {
    setCameraError(null);
    try {
      // Stop any existing stream
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }

      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Camera API is not supported in this browser environment.');
      }

      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: facingMode },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      });

      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (err: any) {
      console.warn('Camera stream error:', err);
      let msg = 'Could not access device camera. Please check permissions or upload from files.';
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        msg = 'Camera access was denied. Please allow camera permissions in browser settings.';
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        msg = 'No camera hardware found on this device.';
      }
      setCameraError(msg);
    }
  }, [facingMode]);

  useEffect(() => {
    if (isOpen && !capturedPhoto) {
      startCamera();
    } else {
      // Clean up stream
      if (stream) {
        stream.getTracks().forEach((t) => t.stop());
        setStream(null);
      }
    }

    return () => {
      if (stream) {
        stream.getTracks().forEach((t) => t.stop());
      }
    };
  }, [isOpen, capturedPhoto, facingMode]);

  if (!isOpen) return null;

  // Capture snapshot from video canvas
  const handleCaptureSnapshot = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current || document.createElement('canvas');
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.92);

    // Stop stream once captured
    if (stream) {
      stream.getTracks().forEach((t) => t.stop());
      setStream(null);
    }

    setCapturedPhoto(dataUrl);
    setAiVisionResult(null);

    // Auto-run AI Vision meter analysis in background
    runAiVisionOnPhoto(dataUrl);
  };

  // Run AI Vision Analysis
  const runAiVisionOnPhoto = async (dataUrl: string) => {
    setIsAiProcessing(true);
    setAiStatusMessage('AI Vision scanning pump totalizer meter...');
    try {
      const res = await analyzeMeterPhotoWithAI(dataUrl, {
        expectedOpeningValue,
        pumpLabel,
        productCode,
        onProgress: (msg) => setAiStatusMessage(msg),
      });
      setAiVisionResult(res);
    } catch (e: any) {
      console.warn('AI Vision processing failed:', e);
      setAiVisionResult({
        success: false,
        reading: null,
        confidence: 0,
        isClear: false,
        suggestManualEntry: true,
        unclearReason: 'Analysis interrupted. Manual entry remains available.',
      });
    } finally {
      setIsAiProcessing(false);
    }
  };

  // Save to Photos / Gallery
  const handleSaveToGallery = async () => {
    if (!capturedPhoto) return;

    try {
      // Convert Data URL to Blob/File for Web Share API
      const res = await fetch(capturedPhoto);
      const blob = await res.blob();
      const filename = `${pumpLabel.replace(/\s+/g, '_')}_Meter_${Date.now()}.jpg`;
      const file = new File([blob], filename, { type: 'image/jpeg' });

      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: `${pumpLabel} Meter Photo`,
          text: `Meter reading photo for ${pumpLabel} - Daily Report`,
        });
        setGallerySaveNotice('Share sheet opened! Select "Save Image" to store in Photos/Gallery.');
      } else {
        // Fallback: direct download link
        const link = document.createElement('a');
        link.href = capturedPhoto;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        setGallerySaveNotice('Image downloaded to device! Access via Downloads/Photos.');
      }
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        const link = document.createElement('a');
        link.href = capturedPhoto;
        link.download = `${pumpLabel}_meter.jpg`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        setGallerySaveNotice('Photo downloaded to device storage.');
      }
    }

    setTimeout(() => setGallerySaveNotice(null), 5000);
  };

  // Fallback file upload from device files
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const { processedDataUrl } = await preprocessMeterImage(file);
      setCapturedPhoto(processedDataUrl);
      setCameraError(null);
      runAiVisionOnPhoto(processedDataUrl);
    } catch (err) {
      console.warn('Error reading uploaded image:', err);
    }
  };

  // Retake photo
  const handleRetake = () => {
    setCapturedPhoto(null);
    setAiVisionResult(null);
    setGallerySaveNotice(null);
    startCamera();
  };

  // Accept and finish with manager review
  const handleAccept = () => {
    if (!capturedPhoto) return;
    onAcceptPhoto(
      capturedPhoto,
      aiVisionResult?.reading,
      aiVisionResult?.confidence,
      aiVisionResult || undefined
    );
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-slate-950/85 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-4 py-3 bg-slate-800/90 border-b border-slate-700/80 flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <span className="p-1.5 rounded-lg bg-amber-500/15 text-amber-400">
              <Camera className="w-5 h-5" />
            </span>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="font-bold text-white text-base tracking-tight">Meter Photo: {pumpLabel}</h3>
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-slate-700 text-slate-300">
                  {productCode}
                </span>
              </div>
              <p className="text-xs text-slate-400">Capture nozzle mechanical or digital totalizer</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700/60 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Viewport Area */}
        <div className="relative bg-black flex-1 min-h-[320px] max-h-[460px] flex items-center justify-center overflow-hidden">
          {!capturedPhoto ? (
            /* Live Camera Stream */
            cameraError ? (
              <div className="p-6 text-center max-w-sm space-y-4">
                <AlertTriangle className="w-10 h-10 text-amber-400 mx-auto" />
                <p className="text-sm text-slate-300">{cameraError}</p>
                <div className="flex flex-col gap-2 pt-2">
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full py-2.5 px-4 bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold text-sm rounded-xl flex items-center justify-center gap-2 shadow"
                  >
                    <ImageIcon className="w-4 h-4" />
                    Select Photo from Device
                  </button>
                  <button
                    onClick={startCamera}
                    className="w-full py-2 px-4 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs rounded-xl"
                  >
                    Retry Camera
                  </button>
                </div>
              </div>
            ) : (
              <div className="relative w-full h-full flex items-center justify-center">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover"
                />

                {/* Viewfinder Overlay */}
                <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center p-6">
                  <div className="w-full max-w-[280px] h-36 border-2 border-dashed border-amber-400/80 rounded-xl flex flex-col items-center justify-between p-3 bg-amber-500/5 shadow-[0_0_20px_rgba(245,158,11,0.2)]">
                    <span className="text-[11px] font-bold text-amber-300 tracking-wider uppercase bg-slate-950/70 px-2 py-0.5 rounded">
                      Align Meter Digits Here
                    </span>
                    <span className="text-[10px] text-slate-300/80 bg-slate-950/60 px-2 py-0.5 rounded">
                      Keep flat & avoid harsh glare
                    </span>
                  </div>
                </div>

                {/* Switch Camera Button */}
                <button
                  type="button"
                  onClick={() => setFacingMode((prev) => (prev === 'environment' ? 'user' : 'environment'))}
                  className="absolute top-3 right-3 p-2 bg-slate-900/80 text-white rounded-full border border-slate-700 hover:bg-slate-800 backdrop-blur-md"
                  title="Switch Camera"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
              </div>
            )
          ) : (
            /* Captured Photo Preview */
            <div className="relative w-full h-full flex items-center justify-center bg-slate-950">
              <img
                src={capturedPhoto}
                alt={`Captured meter for ${pumpLabel}`}
                className="w-full h-full object-contain max-h-[460px]"
              />

              {/* Pump watermark badge */}
              <div className="absolute top-3 left-3 bg-slate-900/90 border border-slate-700 px-3 py-1 rounded-lg backdrop-blur-md flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                <span className="font-bold text-xs text-white">{pumpLabel}</span>
              </div>
            </div>
          )}

          {/* Hidden Canvas and File Input */}
          <canvas ref={canvasRef} className="hidden" />
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileUpload}
          />
        </div>

        {/* Gallery Save Notice Banner */}
        {gallerySaveNotice && (
          <div className="bg-emerald-950/80 border-t border-emerald-500/40 px-4 py-2 flex items-center gap-2 text-emerald-300 text-xs">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{gallerySaveNotice}</span>
          </div>
        )}

        {/* AI Vision Result / Suggestion Area if Photo is Captured */}
        {capturedPhoto && (
          <div className="p-3.5 bg-slate-900 border-t border-slate-800">
            {isAiProcessing ? (
              <div className="flex items-center gap-3 py-2">
                <RefreshCw className="w-4 h-4 text-amber-400 animate-spin shrink-0" />
                <div className="flex-1">
                  <div className="flex justify-between text-xs text-slate-300 mb-1">
                    <span className="font-medium text-amber-300">{aiStatusMessage}</span>
                    <span className="text-slate-400 font-mono text-[11px]">Gemini Vision</span>
                  </div>
                  <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-amber-500 to-amber-300 w-3/4 animate-pulse rounded-full" />
                  </div>
                </div>
              </div>
            ) : aiVisionResult?.reading !== null && aiVisionResult?.reading !== undefined && aiVisionResult.isClear ? (
              <div className="bg-slate-950/80 border border-emerald-500/40 rounded-xl p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-emerald-400" />
                    <span className="text-[11px] font-bold text-slate-300 uppercase tracking-wider">
                      AI Vision Detected Reading
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-md bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                      {aiVisionResult.confidence}% Confidence
                    </span>
                    {aiVisionResult.meterType && (
                      <span className="text-[10px] font-medium px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 border border-slate-700 capitalize">
                        {aiVisionResult.meterType.replace('_', ' ')}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-baseline justify-between pt-1">
                  <div className="flex items-baseline gap-2">
                    <span className="font-mono text-2xl font-black text-emerald-400 tracking-tight">
                      {aiVisionResult.reading.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 3 })}
                    </span>
                    <span className="text-xs font-bold text-slate-400">Litres</span>
                  </div>
                  <span className="text-[11px] text-slate-400">
                    Raw: <code className="text-slate-200 font-mono">{aiVisionResult.rawDigitsDetected || '—'}</code>
                  </span>
                </div>

                <p className="text-[10px] text-slate-400 border-t border-slate-800/80 pt-1.5">
                  Review the detected reading above. Tap <strong>Accept for {pumpLabel}</strong> below to confirm and apply to your daily report ledger.
                </p>
              </div>
            ) : (
              <div className="p-3 rounded-xl bg-amber-950/40 border border-amber-500/40 space-y-2">
                <div className="flex items-start gap-2.5">
                  <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  <div className="flex-1 text-xs">
                    <span className="font-bold text-amber-200 block">
                      AI Vision Notice: {aiVisionResult?.unclearReason || 'Unclear or Glared Meter Display'}
                    </span>
                    <p className="text-[11px] text-slate-300 mt-1 leading-relaxed">
                      To prevent accounting errors, AI does not guess uncertain digits. You can capture a clearer, glare-free photo or simply enter the reading manually.
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-1 border-t border-amber-500/20">
                  <button
                    type="button"
                    onClick={() => runAiVisionOnPhoto(capturedPhoto)}
                    className="px-2.5 py-1 text-xs font-semibold text-amber-300 hover:text-white flex items-center gap-1"
                  >
                    <RefreshCw className="w-3 h-3" />
                    <span>Re-analyze Image</span>
                  </button>
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-3 py-1 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-lg shadow"
                  >
                    Enter Manually
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Bottom Actions */}
        <div className="p-4 bg-slate-900 border-t border-slate-800 flex flex-wrap items-center justify-between gap-3">
          {!capturedPhoto ? (
            /* Live Camera Controls */
            <div className="w-full flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="px-3.5 py-2.5 rounded-xl border border-slate-700 bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700/80 text-xs font-semibold flex items-center gap-1.5"
              >
                <ImageIcon className="w-4 h-4" />
                <span>Upload File</span>
              </button>

              <button
                type="button"
                onClick={handleCaptureSnapshot}
                disabled={Boolean(cameraError)}
                className="flex-1 py-3 px-5 rounded-xl bg-amber-500 hover:bg-amber-400 active:scale-[0.98] disabled:opacity-50 text-slate-950 font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 transition-transform"
              >
                <Camera className="w-5 h-5" />
                <span>Capture Photo</span>
              </button>
            </div>
          ) : (
            /* Review Captured Photo Controls */
            <div className="w-full flex flex-col gap-2.5">
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={handleRetake}
                  className="py-2.5 px-3 rounded-xl border border-slate-700 bg-slate-800 hover:bg-slate-700/80 text-slate-300 text-xs font-semibold flex items-center justify-center gap-1.5"
                >
                  <RefreshCw className="w-4 h-4" />
                  <span>Retake</span>
                </button>

                <button
                  type="button"
                  onClick={handleSaveToGallery}
                  className="py-2.5 px-3 rounded-xl border border-slate-700 bg-slate-800 hover:bg-slate-700/80 text-slate-200 text-xs font-semibold flex items-center justify-center gap-1.5"
                  title="Save or share image to device Photos/Gallery"
                >
                  <Download className="w-4 h-4 text-emerald-400" />
                  <span>Save to Gallery</span>
                </button>
              </div>

              <button
                type="button"
                onClick={handleAccept}
                className="w-full py-3 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 active:scale-[0.98] text-slate-950 font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20"
              >
                <Check className="w-5 h-5" />
                <span>Accept for {pumpLabel}</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
