import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  ArrowLeft, Camera, UserCheck, ScanFace, Loader2,
  CheckCircle, CircleX, RefreshCcw, Users, Search,
  Fingerprint, AlertTriangle, Trash2, Image as ImageIcon,
  X, ChevronRight, ShieldCheck, Activity, Info, Zap, AlertCircle
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { apiClient } from '../../api/client';
import * as faceapi from '@vladmandic/face-api';

const MODEL_URL = '/models';
const CAPTURE_COUNT = 6;
const CAPTURE_DELAY_MS = 800;
const MAX_RETRIES_PER_SAMPLE = 4;
const MIN_CONFIDENCE = 0.3;        // FIX #5: lowered from 0.25 — let score check filter quality
const QUALITY_THRESHOLD = 0.70;    // Minimum detection score to accept a sample
const CAMERA_WARMUP_MS = 800;      // FIX #6: warmup delay before first capture

const HUD_CSS = `
  @keyframes scanline {
    0% { top: 0%; opacity: 0; }
    5% { opacity: 1; }
    95% { opacity: 1; }
    100% { top: 100%; opacity: 0; }
  }
  @keyframes pulse-glow {
    0%, 100% { opacity: 0.3; transform: scale(1); }
    50% { opacity: 0.6; transform: scale(1.02); }
  }
  .animate-scanline {
    animation: scanline 4s linear infinite;
  }
  .neural-grid {
    background-image: 
      linear-gradient(rgba(16, 185, 129, 0.03) 1px, transparent 1px),
      linear-gradient(90deg, rgba(16, 185, 129, 0.03) 1px, transparent 1px);
    background-size: 30px 30px;
  }
`;

export default function WorkerEnrollment() {
  const navigate = useNavigate();

  // Model state
  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [modelError, setModelError] = useState(false);
  const [modelLoadProgress, setModelLoadProgress] = useState(0);

  // Worker selection
  const [workers, setWorkers] = useState([]);
  const [loadingWorkers, setLoadingWorkers] = useState(true);
  const [selectedWorker, setSelectedWorker] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [enrolledIds, setEnrolledIds] = useState(new Set());

  // Camera & capture
  const [hasCamera, setHasCamera] = useState(false);
  const [facingMode, setFacingMode] = useState('user');
  const facingModeRef = useRef('user');
  const [isSwitchingCamera, setIsSwitchingCamera] = useState(false);
  const isSwitchingRef = useRef(false);
  useEffect(() => { facingModeRef.current = facingMode; }, [facingMode]);
  useEffect(() => { isSwitchingRef.current = isSwitchingCamera; }, [isSwitchingCamera]);
  const [capturing, setCapturing] = useState(false);
  const [captureProgress, setCaptureProgress] = useState(0);
  const [capturedDescriptors, setCapturedDescriptors] = useState([]);
  const [capturedPreviews, setCapturedPreviews] = useState([]);
  const [capturedScores, setCapturedScores] = useState([]);

  // Live detection state
  const [liveDetection, setLiveDetection] = useState(false);
  const [liveScore, setLiveScore] = useState(0);
  const [faceCount, setFaceCount] = useState(0);
  const [faceAlignment, setFaceAlignment] = useState('');

  // Result
  const [enrolling, setEnrolling] = useState(false);
  const [enrollResult, setEnrollResult] = useState(null);
  const [enrollError, setEnrollError] = useState('');
  const [captureLog, setCaptureLog] = useState([]);

  // Refs
  const videoRef = useRef(null);
  const overlayCanvasRef = useRef(null);
  const streamRef = useRef(null);
  const liveIntervalRef = useRef(null);
  const liveDetectionRef = useRef(false);
  const liveScoreRef = useRef(0);

  // Keep refs in sync
  useEffect(() => { liveDetectionRef.current = liveDetection; }, [liveDetection]);
  useEffect(() => { liveScoreRef.current = liveScore; }, [liveScore]);

  // ─── Init ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    const init = async () => {
      try {
        setModelLoadProgress(10);
        await faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL);
        setModelLoadProgress(35);
        await faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL);
        setModelLoadProgress(60);
        await faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL);
        setModelLoadProgress(85);
        await faceapi.nets.ssdMobilenetv1.loadFromUri(MODEL_URL);
        setModelLoadProgress(100);
        setModelsLoaded(true);
      } catch (err) {
        console.error('[Enrollment] model load error:', err);
        setModelError(true);
      }

      try {
        setLoadingWorkers(true);
        const [wRes, eRes] = await Promise.all([
          apiClient.get('/workforce/workers'),
          apiClient.get('/workforce/face-descriptors').catch(() => ({ success: false, data: [] }))
        ]);
        if (wRes.success) setWorkers(wRes.data);
        if (eRes.success) setEnrolledIds(new Set(eRes.data.map(e => String(e.worker_id))));
      } catch (err) {
        console.error('[Enrollment] fetch workers error:', err);
      } finally {
        setLoadingWorkers(false);
      }
    };
    init();

    const handleVisibilityChange = () => {
      if (document.hidden) {
        stopCamera();
      } else if (selectedWorker) {
        startCamera();
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      stopCamera();
      stopLiveDetection();
    };
  }, []);

  // ─── Camera ────────────────────────────────────────────────────────────────
  const startCamera = async (modeToUse = facingModeRef.current) => {
    if (isSwitchingRef.current) return;
    setIsSwitchingCamera(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: modeToUse,
          advanced: [{ exposureMode: 'continuous' }]
        }
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;
        setHasCamera(true);
        startLiveDetection();
      }
    } catch (err) {
      console.error('[Enrollment] camera error:', err.name);
      setHasCamera(false);
      setEnrollError(`Camera unavailable: ${err.name}`);
    } finally {
      setIsSwitchingCamera(false);
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => {
        try { t.stop(); } catch (e) { console.warn(e); }
      });
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setHasCamera(false);
    stopLiveDetection();
  };

  const toggleCamera = () => {
    if (isSwitchingRef.current) return;
    const nextMode = facingModeRef.current === 'user' ? 'environment' : 'user';
    setFacingMode(nextMode);
    stopCamera();
    startCamera(nextMode);
  };

  const stopLiveDetection = () => {
    if (liveIntervalRef.current) {
      clearInterval(liveIntervalRef.current);
      liveIntervalRef.current = null;
    }
  };

  const startLiveDetection = useCallback(() => {
    stopLiveDetection();
    liveIntervalRef.current = setInterval(async () => {
      const video = videoRef.current;
      const canvas = overlayCanvasRef.current;
      if (!video || !canvas || video.readyState < 3) return;

      try {
        const dets = await faceapi
          .detectAllFaces(video, new faceapi.TinyFaceDetectorOptions({ inputSize: 320, scoreThreshold: 0.4 }));

        const count = dets.length;
        setFaceCount(count);
        setLiveDetection(count > 0);

        if (count > 0) {
          const det = dets[0];
          const score = det.score || det.detection?.score;
          setLiveScore(Math.round(score * 100));

          const box = det.box || det.detection?.box;
          const vw = video.videoWidth, vh = video.videoHeight;
          const centerX = box.x + box.width / 2;
          const centerY = box.y + box.height / 2;
          const faceRatio = box.width / vw;

          let alignment = 'centered';
          if (faceRatio < 0.18) alignment = 'too_far';
          else if (faceRatio > 0.55) alignment = 'too_close';
          else if (centerX < vw * 0.3) alignment = 'right';
          else if (centerX > vw * 0.7) alignment = 'left';
          else if (centerY < vh * 0.25) alignment = 'down';
          else if (centerY > vh * 0.75) alignment = 'up';
          setFaceAlignment(alignment);
        } else {
          setLiveScore(0);
          setFaceAlignment('');
        }

        const w = video.offsetWidth, h = video.offsetHeight;
        if (w === 0 || h === 0) return;
        canvas.width = w; canvas.height = h;
        faceapi.matchDimensions(canvas, { width: w, height: h });
        const resized = faceapi.resizeResults(dets, { width: w, height: h });

        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, w, h);
        const mirrorContext = facingModeRef.current === 'user';

        // FIX #3: always wrap mirror transform in save/restore
        if (mirrorContext) {
          ctx.save();
          ctx.scale(-1, 1);
          ctx.translate(-w, 0);
        }

        resized.forEach(det => {
          const box = det.box || det.detection?.box || det;
          const score = det.score || det.detection?.score || 0;
          const quality = score >= QUALITY_THRESHOLD;
          const color = quality ? '#10b981' : '#f59e0b';

          ctx.strokeStyle = color;
          ctx.lineWidth = 2;
          ctx.setLineDash([5, 5]);
          ctx.strokeRect(box.x, box.y, box.width, box.height);
          ctx.setLineDash([]);

          const cs = 15;
          ctx.fillStyle = color;
          ctx.fillRect(box.x, box.y, cs, 2);
          ctx.fillRect(box.x, box.y, 2, cs);
          ctx.fillRect(box.x + box.width - cs, box.y, cs, 2);
          ctx.fillRect(box.x + box.width - 2, box.y, 2, cs);
          ctx.fillRect(box.x, box.y + box.height - 2, cs, 2);
          ctx.fillRect(box.x, box.y + box.height - cs, 2, cs);
          ctx.fillRect(box.x + box.width - cs, box.y + box.height - 2, cs, 2);
          ctx.fillRect(box.x + box.width - 2, box.y + box.height - cs, 2, cs);
        });

        if (mirrorContext) {
          ctx.restore(); // FIX #3: restore after mirror draw
        }
      } catch (err) {
        console.warn('[Enrollment] detection error:', err);
      }
    }, 500);
  }, []);

  // ─── Wait for video frame to be truly ready ─────────────────────────────────
  // FIX #2: helper that polls until readyState is HAVE_ENOUGH_DATA (4)
  const waitForVideoReady = (video, timeoutMs = 3000) => {
    return new Promise((resolve, reject) => {
      if (video.readyState >= 4 && video.videoWidth > 0) {
        resolve();
        return;
      }
      const start = Date.now();
      const check = () => {
        if (video.readyState >= 4 && video.videoWidth > 0) {
          resolve();
        } else if (Date.now() - start > timeoutMs) {
          reject(new Error('Video not ready in time'));
        } else {
          requestAnimationFrame(check);
        }
      };
      check();
    });
  };

  // ─── Capture Samples ───────────────────────────────────────────────────────
  const captureSamples = async () => {
    if (!selectedWorker || capturing) return;
    setCapturing(true);
    setCaptureProgress(0);
    setCapturedDescriptors([]);
    setCapturedPreviews([]);
    setCapturedScores([]);
    setEnrollError('');
    setEnrollResult(null);
    setCaptureLog([{
      ts: new Date().toLocaleTimeString(),
      msg: `Initiating biometric link for ${selectedWorker.first_name}...`,
      type: 'info'
    }]);

    const video = videoRef.current;
    if (!video) {
      setCapturing(false);
      return;
    }

    // FIX #2: ensure video is fully streaming before any detection
    try {
      await waitForVideoReady(video);
    } catch (err) {
      setEnrollError('Camera not ready. Please wait a moment and try again.');
      setEnrollResult('error');
      setCapturing(false);
      return;
    }

    // FIX #6: warmup delay so auto-exposure/focus can settle
    setCaptureLog(prev => [{
      ts: new Date().toLocaleTimeString(),
      msg: 'Waiting for camera to stabilize...',
      type: 'info'
    }, ...prev]);
    await new Promise(r => setTimeout(r, CAMERA_WARMUP_MS));

    // FIX #4: create a fresh canvas per capture session instead of reusing a stale ref
    const captureCanvas = document.createElement('canvas');

    let successCount = 0;
    // local arrays so we can batch-set state once at end (avoids stale closure issues)
    const descriptors = [];
    const previews = [];
    const scores = [];

    for (let i = 0; i < CAPTURE_COUNT; i++) {
      let sampleCaptured = false;
      let retries = 0;

      while (!sampleCaptured && retries < MAX_RETRIES_PER_SAMPLE) {
        if (retries > 0) {
          setCaptureLog(prev => [{
            ts: new Date().toLocaleTimeString(),
            msg: `Retry #${retries} for Sample ${i + 1}...`,
            type: 'warn'
          }, ...prev]);
        }

        // FIX #2: re-check video readiness before each detection attempt
        if (video.readyState < 4 || video.videoWidth === 0) {
          setCaptureLog(prev => [{
            ts: new Date().toLocaleTimeString(),
            msg: `Sample ${i + 1}: video frame not ready, waiting...`,
            type: 'warn'
          }, ...prev]);
          retries++;
          await new Promise(r => setTimeout(r, 300));
          continue;
        }

        // FIX #5: lower minConfidence so SSD can detect, quality threshold does the real filtering
        const det = await faceapi
          .detectSingleFace(video, new faceapi.SsdMobilenetv1Options({ minConfidence: MIN_CONFIDENCE }))
          .withFaceLandmarks()
          .withFaceDescriptor();

        if (det) {
          const score = Math.round(det.detection.score * 100);

          if (score < QUALITY_THRESHOLD * 100) {
            setCaptureLog(prev => [{
              ts: new Date().toLocaleTimeString(),
              msg: `Sample ${i + 1} rejected: low quality (${score}%)`,
              type: 'warn'
            }, ...prev]);
            retries++;
            await new Promise(r => setTimeout(r, 300));
            continue;
          }

          // FIX #3 + #4: use fresh canvas with proper save/restore for mirror
          captureCanvas.width = video.videoWidth;
          captureCanvas.height = video.videoHeight;
          const ctx = captureCanvas.getContext('2d');

          // clear before drawing
          ctx.clearRect(0, 0, captureCanvas.width, captureCanvas.height);

          if (facingModeRef.current === 'user') {
            ctx.save();                                              // FIX #3
            ctx.translate(captureCanvas.width, 0);
            ctx.scale(-1, 1);
            ctx.drawImage(video, 0, 0, captureCanvas.width, captureCanvas.height);
            ctx.restore();                                           // FIX #3
          } else {
            ctx.drawImage(video, 0, 0, captureCanvas.width, captureCanvas.height);
          }

          const preview = captureCanvas.toDataURL('image/jpeg', 0.8);

          descriptors.push(Array.from(det.descriptor));
          previews.push(preview);
          scores.push(score);

          successCount++;
          sampleCaptured = true;

          // update UI incrementally
          setCaptureProgress(successCount);
          setCapturedDescriptors([...descriptors]);
          setCapturedPreviews([...previews]);
          setCapturedScores([...scores]);

          setCaptureLog(prev => [{
            ts: new Date().toLocaleTimeString(),
            msg: `Sample ${i + 1} synchronized successfully (${score}% quality)`,
            type: 'success'
          }, ...prev]);
        } else {
          retries++;
          await new Promise(r => setTimeout(r, 300));
        }
      }

      if (!sampleCaptured) {
        setCaptureLog(prev => [{
          ts: new Date().toLocaleTimeString(),
          msg: `Timed out waiting for Sample ${i + 1}.`,
          type: 'error'
        }, ...prev]);
      } else if (i < CAPTURE_COUNT - 1) {
        await new Promise(r => setTimeout(r, CAPTURE_DELAY_MS));
      }
    }

    setCapturing(false);

    if (successCount < 3) {
      setEnrollError(`Insufficient samples (${successCount}/${CAPTURE_COUNT}). Need at least 3 high-quality captures. Try improving lighting.`);
      setEnrollResult('error');
    } else {
      setCaptureLog(prev => [{
        ts: new Date().toLocaleTimeString(),
        msg: `Neural signature reconstruction complete. Ready to save.`,
        type: 'info'
      }, ...prev]);
    }
  };

  const saveEnrollment = async () => {
    if (!selectedWorker || capturedDescriptors.length < 3) return;
    setEnrolling(true);
    setEnrollResult(null);

    try {
      const res = await apiClient.post('/workforce/face-descriptors', {
        worker_id: selectedWorker.worker_id || selectedWorker.id,
        descriptors: capturedDescriptors
      });

      if (res.success) {
        setEnrollResult('success');
        setEnrolledIds(prev => new Set([...prev, String(selectedWorker.worker_id || selectedWorker.id)]));
      } else {
        setEnrollResult('error');
        setEnrollError(res.error || 'Enrollment failed');
      }
    } catch (err) {
      setEnrollResult('error');
      setEnrollError('Network error — check biometric server connection');
    } finally {
      setEnrolling(false);
    }
  };

  const deleteEnrollment = async (workerId) => {
    if (!window.confirm('Delete this biometric signature? Subject will need to re-enroll for face attendance.')) return;
    try {
      await apiClient.delete(`/workforce/face-descriptors/${workerId}`);
      setEnrolledIds(prev => { const n = new Set(prev); n.delete(String(workerId)); return n; });
    } catch (err) {
      console.error('[Enrollment] delete error:', err);
    }
  };

  const resetCapture = () => {
    setCapturedDescriptors([]);
    setCapturedPreviews([]);
    setCapturedScores([]);
    setCaptureProgress(0);
    setCapturing(false);
    setEnrollResult(null);
    setEnrollError('');
    setCaptureLog([]);
  };

  // ─── Helpers ────────────────────────────────────────────────────────────────
  const filteredWorkers = workers.filter(w => {
    const q = searchQuery.toLowerCase();
    return `${w.first_name} ${w.last_name}`.toLowerCase().includes(q) ||
      String(w.worker_id || '').toLowerCase().includes(q);
  });

  const avgQuality = capturedScores.length > 0
    ? Math.round(capturedScores.reduce((a, b) => a + b, 0) / capturedScores.length)
    : 0;

  return (
    <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500 pb-12">
      <style>{HUD_CSS}</style>

      {/* ── Premium Header ── */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white font-outfit tracking-tight">Biometric Enrollment</h1>
          <p className="text-slate-500 text-sm font-medium flex items-center gap-2 mt-1">
            <Fingerprint size={14} className="text-tea-500" /> Neural registration pipeline — {workers.length} personnel · {enrolledIds.size} signatures active
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className={`flex items-center px-4 py-2 rounded-xl border h-full transition-all ${modelsLoaded ? 'bg-tea-50 dark:bg-tea-900/20 border-tea-200 dark:border-tea-800'
              : modelError ? 'bg-rose-50 dark:bg-rose-900/20 border-rose-200 dark:border-rose-800'
                : 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800'
            }`}>
            <div className="flex items-center gap-3">
              <div className={`w-2 h-2 rounded-full ${modelsLoaded ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : modelError ? 'bg-rose-500' : 'bg-orange-500 animate-pulse'}`} />
              <span className={`text-[10px] font-black uppercase tracking-[0.2em] ${modelsLoaded ? 'text-tea-600 dark:text-tea-400' : 'text-slate-500'}`}>
                {modelsLoaded ? 'Engine Online' : modelError ? 'Engine Error' : `Loading Engine ${modelLoadProgress}%`}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* ── Sidebar: Worker List ── */}
        <div className="lg:col-span-4 space-y-4">
          <div className="premium-card p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xs font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 flex items-center gap-2">
                <Users size={14} /> Personnel Directory
              </h2>
              <span className="text-[9px] font-black bg-tea-50 dark:bg-tea-900/20 text-tea-600 dark:text-tea-400 px-2 py-0.5 rounded-full uppercase tracking-wider">
                {filteredWorkers.length} total
              </span>
            </div>

            <div className="relative mb-4">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search name or ID..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-tea-500/30"
              />
            </div>

            <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
              {loadingWorkers ? (
                <div className="text-center py-12">
                  <Loader2 size={28} className="animate-spin text-tea-500/40 mx-auto mb-2" />
                  <p className="text-[10px] uppercase tracking-widest text-slate-400 font-bold">Synchronizing...</p>
                </div>
              ) : filteredWorkers.length === 0 ? (
                <div className="text-center py-12 text-slate-400">
                  <Users size={28} className="mx-auto mb-2 opacity-30" />
                  <p className="text-[10px] uppercase tracking-widest font-bold opacity-50">No matches</p>
                </div>
              ) : filteredWorkers.slice(0, 4).map(worker => {
                const wid = String(worker.worker_id || worker.id);
                const isEnrolled = enrolledIds.has(wid);
                const isSelected = selectedWorker?.id === worker.id;

                return (
                  <div
                    key={worker.id}
                    onClick={() => { setSelectedWorker(worker); if (!hasCamera) startCamera(); resetCapture(); }}
                    className={`flex items-center justify-between p-3 rounded-xl cursor-pointer transition-all group border ${isSelected
                        ? 'bg-tea-600 border-tea-600 text-white shadow-lg shadow-tea-600/20'
                        : 'bg-slate-50 dark:bg-slate-800/50 border-slate-100 dark:border-slate-800 hover:border-tea-200 dark:hover:border-tea-900'
                      }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-[10px] font-black shrink-0 ${isSelected ? 'bg-white/20 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                        }`}>
                        {worker.first_name?.[0]}{worker.last_name?.[0]}
                      </div>
                      <div className="min-w-0">
                        <p className={`text-[11px] font-black uppercase truncate ${isSelected ? 'text-white' : 'text-slate-900 dark:text-white'}`}>
                          {worker.first_name} {worker.last_name}
                        </p>
                        <p className={`text-[9px] font-bold uppercase tracking-wider ${isSelected ? 'text-white/70' : 'text-slate-400'}`}>
                          {worker.worker_id || `W-${worker.id}`}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {isEnrolled && (
                        <div className="flex items-center gap-1">
                          <ShieldCheck size={13} className={isSelected ? 'text-white' : 'text-emerald-500'} />
                          {!isSelected && (
                            <button
                              onClick={e => { e.stopPropagation(); deleteEnrollment(wid); }}
                              className="p-1 rounded bg-rose-50 dark:bg-rose-900/20 text-rose-500 hover:bg-rose-100 transition-all opacity-0 group-hover:opacity-100"
                              title="Delete Enrollment"
                            >
                              <Trash2 size={10} />
                            </button>
                          )}
                        </div>
                      )}
                      <ChevronRight size={14} className={isSelected ? 'text-white/50' : 'text-slate-300 dark:text-slate-600'} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Capture Log Card */}
          {captureLog.length > 0 && (
            <div className="premium-card p-4 space-y-2 max-h-48 overflow-y-auto bg-slate-900 border-indigo-500/20">
              <p className="text-[9px] font-black uppercase tracking-widest text-indigo-400 flex items-center gap-2 mb-2">
                <Activity size={12} /> Neural Stream Log
              </p>
              {captureLog.map((entry, i) => (
                <div key={i} className={`flex items-start gap-2 text-[10px] font-mono ${entry.type === 'success' ? 'text-emerald-400' :
                    entry.type === 'error' ? 'text-rose-400' :
                      entry.type === 'warn' ? 'text-amber-400' :
                        'text-indigo-300/40'
                  }`}>
                  <span className="opacity-30 shrink-0">{entry.ts}</span>
                  <span className="leading-relaxed">{entry.msg}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── Main Panel: Enrollment Console ── */}
        <div className="lg:col-span-8 space-y-6">
          {!selectedWorker ? (
            <div className="premium-card p-12 flex flex-col items-center justify-center text-center opacity-50 space-y-4 min-h-[400px]">
              <div>
                <h3 className="text-lg font-black text-slate-800 dark:text-white uppercase tracking-tight mb-2">Biometric Target Required</h3>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">
                  Select personnel from directory to initiate uplink
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-6 animate-in slide-in-from-right-4 duration-500">
              {/* Active Worker Context */}
              <div className="premium-card p-4 flex items-center justify-between bg-slate-900 border-indigo-500/20 text-white">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 flex items-center justify-center text-indigo-400 font-black text-sm border border-indigo-500/20">
                    {selectedWorker.first_name?.[0]}{selectedWorker.last_name?.[0]}
                  </div>
                  <div>
                    <p className="font-black uppercase text-white tracking-tight leading-none mb-1">{selectedWorker.first_name} {selectedWorker.last_name}</p>
                    <p className="text-[10px] uppercase font-bold text-indigo-400/60 tracking-widest">{selectedWorker.worker_id || `W-${selectedWorker.id}`}</p>
                  </div>
                </div>
                <button
                  onClick={() => { setSelectedWorker(null); stopCamera(); }}
                  className="p-2.5 rounded-xl text-slate-500 hover:text-white hover:bg-white/5 transition-all"
                  title="Close Session"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Camera Console with HUD */}
              <div className="premium-card p-1.5 overflow-hidden">
                <div className="relative w-full h-[560px] bg-black rounded-[2rem] overflow-hidden border-4 border-slate-900 dark:border-slate-800 shadow-2xl shadow-indigo-500/5">
                  <video
                    ref={videoRef}
                    autoPlay playsInline muted
                    className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-1000 ${facingMode === 'user' ? 'scale-x-[-1]' : ''} ${hasCamera ? 'opacity-100' : 'opacity-0'}`}
                  />
                  <canvas
                    ref={overlayCanvasRef}
                    className={`absolute inset-0 w-full h-full z-10 pointer-events-none transition-opacity duration-1000 ${hasCamera ? 'opacity-100' : 'opacity-0'}`}
                  />
                  {/* Capture Floating Button */}
                  <button
                    onClick={captureSamples}
                    disabled={!hasCamera || !modelsLoaded || capturing || enrolling}
                    className="absolute bottom-4 right-4 bg-tea-600 hover:bg-tea-700 text-white rounded-full p-3 shadow-lg flex items-center justify-center transition disabled:opacity-40 z-30"
                    title="Capture Biometric Sample"
                  >
                    <Camera size={20} />
                  </button>

                  {/* HUD Overlay */}
                  <div className="absolute inset-0 z-20 p-6 flex flex-col justify-between pointer-events-none neural-grid">
                    {hasCamera && <div className="absolute left-0 right-0 h-[2px] bg-tea-500/50 shadow-[0_0_15px_rgba(16,185,129,0.8)] z-30 animate-scanline" />}

                    <div className="flex justify-between items-start">
                      <div className="bg-black/60 backdrop-blur-md px-3 py-2 rounded-xl border border-white/10 text-white flex flex-col gap-1 shadow-2xl">
                        <div className="flex items-center gap-1.5 mb-0.5">
                          <Zap size={12} className="text-tea-400" />
                          <span className="text-[7px] font-black uppercase tracking-widest text-tea-400">Neural Capture</span>
                        </div>
                        <div className="text-[8px] font-black text-white flex items-center justify-between gap-6">
                          <span className="text-slate-400 uppercase tracking-tighter">Live Quality</span>
                          <span className={liveScore >= QUALITY_THRESHOLD * 100 ? 'text-emerald-400' : 'text-amber-400'}>{liveScore}%</span>
                        </div>
                      </div>

                      <div className="flex gap-2">
                        {hasCamera && !capturing && (
                          <button
                            onClick={toggleCamera}
                            disabled={isSwitchingCamera}
                            className="pointer-events-auto bg-black/60 hover:bg-black/80 backdrop-blur-md p-2.5 rounded-xl border border-white/10 text-white flex items-center justify-center transition-all hover:scale-105 active:scale-95 disabled:opacity-50"
                            title="Flip Camera"
                          >
                            <RefreshCcw size={15} className={isSwitchingCamera ? 'animate-spin' : ''} />
                          </button>
                        )}
                        <div className={`px-4 py-2.5 rounded-xl border backdrop-blur-md text-white flex items-center gap-2 transition-all duration-500 ${liveDetection ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-black/60 border-white/10 opacity-40'
                          }`}>
                          <div className={`w-1.5 h-1.5 rounded-full ${liveDetection ? 'bg-emerald-500 shadow-[0_0_10px_#10b981]' : 'bg-white/20'} ${liveDetection ? 'animate-pulse' : ''}`} />
                          <span className="text-[9px] font-black uppercase tracking-[0.2em]">
                            {liveDetection ? 'Target Locked' : 'Searching...'}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="absolute bottom-8 left-1/2 -translate-x-1/2 w-full text-center pointer-events-none">
                      <p className={`text-[7px] font-black uppercase tracking-[0.5em] transition-all duration-300 ${faceAlignment === 'centered' ? 'text-emerald-400' : 'text-amber-400'
                        } opacity-80`}>
                        {capturing ? 'Recording Biometry...' :
                          !liveDetection ? 'Position face in alignment zone' :
                            faceAlignment === 'too_far' ? 'Move Forward' :
                              faceAlignment === 'too_close' ? 'Move Back' :
                                faceAlignment === 'centered' ? 'Hold Position — Stable Link' :
                                  `Move ${faceAlignment}`}
                      </p>
                    </div>

                    {/* Tactical readout */}
                    <div className="absolute bottom-16 left-6 pointer-events-none text-white/20 font-mono text-[7px] uppercase tracking-widest space-y-1">
                      <div>COORD: 6.03N 80.21E</div>
                      <div>SAMPLER: V4-MOBILE</div>
                      <div>HASH: {Math.random().toString(36).substring(7).toUpperCase()}</div>
                    </div>
                  </div>

                  {!hasCamera && (
                    <div className="absolute inset-0 bg-slate-950 flex flex-col items-center justify-center text-slate-700 z-10 p-12">
                      <Loader2 size={48} className="animate-spin text-tea-500/30 mb-6" />
                      <p className="text-[10px] font-black uppercase tracking-[0.3em] opacity-40 italic text-center">Initializing encrypted sensor link...</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Progress & Capture Management */}
              <div className="space-y-6">
                {capturing && (
                  <div className="space-y-2 animate-in slide-in-from-top-2 duration-500">
                    <div className="flex justify-between items-center px-1">
                      <span className="text-[10px] font-black uppercase tracking-widest text-tea-600">Syncing Samples...</span>
                      <span className="text-[10px] font-mono font-bold text-tea-600">{captureProgress}/{CAPTURE_COUNT}</span>
                    </div>
                    <div className="h-1.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden border border-slate-200 dark:border-slate-800">
                      <div
                        className="h-full bg-tea-500 transition-all duration-300"
                        style={{ width: `${(captureProgress / CAPTURE_COUNT) * 100}%` }}
                      />
                    </div>
                  </div>
                )}

                <div className="premium-card p-6 space-y-6">
                  <div className="flex items-center justify-between">
                    <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 flex items-center gap-2">
                      <ImageIcon size={12} /> Biometric Samples
                    </h3>
                    {capturedScores.length > 0 && (
                      <div className={`text-[10px] font-black uppercase tracking-wider px-3 py-1 rounded-full border ${avgQuality >= 80 ? 'bg-emerald-50 text-emerald-600 border-emerald-200' :
                          avgQuality >= 65 ? 'bg-amber-50 text-amber-600 border-amber-200' :
                            'bg-rose-50 text-rose-600 border-rose-200'
                        }`}>
                        Confidence: {avgQuality}%
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
                    {Array.from({ length: CAPTURE_COUNT }).map((_, i) => (
                      capturedPreviews[i] ? (
                        <div key={i} className="relative aspect-square rounded-2xl overflow-hidden border-2 border-tea-500 shadow-lg shadow-tea-500/10 group animate-in zoom-in-95">
                          <img src={capturedPreviews[i]} alt={`Sample ${i + 1}`} className="w-full h-full object-cover" />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex items-end justify-center p-2">
                            <span className="text-[8px] font-black text-emerald-400">{capturedScores[i]}%</span>
                          </div>
                          <div className="absolute top-1.5 right-1.5 bg-tea-600 text-white text-[8px] font-black w-4 h-4 rounded-lg flex items-center justify-center">
                            {i + 1}
                          </div>
                        </div>
                      ) : (
                        <div key={i} className={`aspect-square rounded-2xl border-2 border-dashed flex items-center justify-center transition-all ${capturing && captureProgress === i ? 'border-tea-500 bg-tea-50/10' : 'border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50'
                          }`}>
                          {capturing && captureProgress === i ? (
                            <Loader2 size={16} className="text-tea-500 animate-spin" />
                          ) : (
                            <div className="w-1.5 h-1.5 rounded-full bg-slate-300 dark:bg-slate-700" />
                          )}
                        </div>
                      )
                    ))}
                  </div>

                  {enrollError && (
                    <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-2xl flex items-center gap-3 animate-in fade-in">
                      <AlertCircle className="text-rose-500" size={18} />
                      <p className="text-[10px] font-black uppercase tracking-widest text-rose-600">{enrollError}</p>
                    </div>
                  )}

                  {enrollResult === 'success' && (
                    <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl flex items-center gap-3 animate-in fade-in">
                      <CheckCircle className="text-emerald-500" size={18} />
                      <p className="text-[10px] font-black uppercase tracking-widest text-emerald-600">Signature Hash Saved Successfully</p>
                    </div>
                  )}

                  <div className="flex gap-4">
                    <button
                      onClick={captureSamples}
                      disabled={!hasCamera || !modelsLoaded || capturing || enrolling}
                      className="flex-[2] py-5 bg-tea-600 hover:bg-tea-700 text-white rounded-2xl font-black uppercase tracking-[0.2em] text-[11px] shadow-xl shadow-tea-600/20 transition-all hover:scale-[1.01] active:scale-95 disabled:opacity-40 flex items-center justify-center gap-3"
                    >
                      {capturing
                        ? <><Loader2 className="animate-spin" size={18} /> Syncing {captureProgress}/{CAPTURE_COUNT}</>
                        : <><Camera size={18} /> {capturedPreviews.length > 0 ? 'Re-Capture Signature' : 'Initiate Neural Capture'}</>}
                    </button>

                    {capturedDescriptors.length >= 3 && (
                      <button
                        onClick={saveEnrollment}
                        disabled={enrolling || enrollResult === 'success'}
                        className="flex-1 py-5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-black uppercase text-[11px] tracking-widest shadow-xl shadow-indigo-600/20 transition-all hover:scale-[1.01] active:scale-95 disabled:opacity-40 flex items-center justify-center gap-3"
                      >
                        {enrolling ? <Loader2 className="animate-spin" size={18} />
                          : enrollResult === 'success' ? <><CheckCircle size={18} /> Saved</>
                            : <><UserCheck size={18} /> Save</>}
                      </button>
                    )}

                    <button
                      onClick={resetCapture}
                      className="px-8 py-5 bg-slate-800 text-white rounded-2xl font-black uppercase text-xs transition-all border border-slate-700 hover:bg-slate-700"
                      title="Reset Console"
                    >
                      <RefreshCcw size={18} />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}