import React, { useState, useEffect, useRef } from 'react';
import {
  Camera, UserCheck, ShieldCheck,
  Loader2, Activity, RefreshCcw,
  CheckCircle, CircleX, ArrowLeft, History, Users,
  ScanFace, Fingerprint, Clock, TrendingUp, UserX, LogOut,
  AlertCircle
} from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';
import { apiClient } from '../../api/client';
import * as faceapi from '@vladmandic/face-api';

// Detection configuration
const isMobile = /Mobi|Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
const DETECTION_INTERVAL_MS = isMobile ? 300 : 500; // faster interval on phones
const MATCH_THRESHOLD = 0.52; // Tighter threshold for accuracy
const MODEL_URL = '/models';

// Empty HUD CSS - using pure Tailwind now
const HUD_CSS = ``;

export default function FaceAttendance() {
  const navigate = useNavigate();

  // Core state
  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [hasCamera, setHasCamera] = useState(false);
  const [statusMessage, setStatusMessage] = useState('Initializing Biometric Engine...');
  const [statusType, setStatusType] = useState('idle'); // idle | scanning | success | error | warning
  const [mode, setMode] = useState('check-in'); // 'check-in' | 'check-out'
  const [facingMode, setFacingMode] = useState('user');
  const facingModeRef = useRef('user');
  const [isSwitchingCamera, setIsSwitchingCamera] = useState(false);
  const isSwitchingRef = useRef(false);

  // Worker & matching state
  const [workers, setWorkers] = useState([]);
  const [faceMatcher, setFaceMatcher] = useState(null);
  const [isInitializingMatcher, setIsInitializingMatcher] = useState(false);
  const [enrolledCount, setEnrolledCount] = useState(0);

  // Scan state
  const [isScanning, setIsScanning] = useState(false);
  const [scanResult, setScanResult] = useState(null); // 'success' | 'error' | null
  const [detectedWorker, setDetectedWorker] = useState(null);
  const [isFacePresent, setIsFacePresent] = useState(false);
  const [liveDetectionCount, setLiveDetectionCount] = useState(0);
  const [currentConfidence, setCurrentConfidence] = useState(null);

  // Attendance log state
  const [logs, setLogs] = useState([]);
  const [todayCount, setTodayCount] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showResultModal, setShowResultModal] = useState(false);
  const [submissionError, setSubmissionError] = useState(null);

  // GPS state
  const [location, setLocation] = useState(null);
  const locationRef = useRef(null);

  // Refs
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const detectionIntervalRef = useRef(null);
  const streamRef = useRef(null);
  const hasCameraRef = useRef(false);
  const faceMatcherRef = useRef(null);
  const modelsLoadedRef = useRef(false);

  // Keep refs in sync
  useEffect(() => { hasCameraRef.current = hasCamera; }, [hasCamera]);
  useEffect(() => { faceMatcherRef.current = faceMatcher; }, [faceMatcher]);
  useEffect(() => { modelsLoadedRef.current = modelsLoaded; }, [modelsLoaded]);
  useEffect(() => { facingModeRef.current = facingMode; }, [facingMode]);
  useEffect(() => { isSwitchingRef.current = isSwitchingCamera; }, [isSwitchingCamera]);

  // GPS helper
  const getPreciseLocation = () => {
    return new Promise((resolve) => {
      if (!("geolocation" in navigator)) return resolve(locationRef.current);
      const timeout = setTimeout(() => resolve(locationRef.current), 3000);
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          clearTimeout(timeout);
          const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
          locationRef.current = loc;
          setLocation(loc);
          resolve(loc);
        },
        (err) => {
          clearTimeout(timeout);
          console.warn('[FaceAttendance] GPS lock failed', err);
          resolve(locationRef.current);
        },
        { enableHighAccuracy: true, timeout: 5000 }
      );
    });
  };

  // ─── Initialization ──────────────────────────────────────────────────────────
  useEffect(() => {
    const loadModels = async () => {
      try {
        setStatus('Loading neural network weights...', 'idle');
        await Promise.all([
          faceapi.nets.ssdMobilenetv1.loadFromUri(MODEL_URL),
          faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
          faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
          faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
        ]);
        modelsLoadedRef.current = true;
        setModelsLoaded(true);
        setStatus(
          hasCameraRef.current
            ? 'Models ready — syncing worker profiles...'
            : 'Models ready — awaiting camera...',
          'idle'
        );
        await fetchWorkers();
      } catch (err) {
        console.error('[FaceAttendance] model load error:', err);
        setStatus('Model load failed — check /public/models/ folder.', 'error');
      }
    };

    startWebcam();
    loadModels();
    fetchTodayLogs();

    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
          locationRef.current = loc;
          setLocation(loc);
        },
        (err) => console.warn('[FaceAttendance] Initial GPS denied', err)
      );
    }

    const handleVisibilityChange = () => {
      if (document.hidden) {
        stopWebcam();
        stopDetection();
      } else {
        startWebcam();
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      stopWebcam();
      stopDetection();
    };
  }, []);

  // ─── Face Matcher ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (modelsLoaded && workers.length > 0) {
      buildFaceMatcher(workers);
    }
  }, [modelsLoaded, workers]);

  const buildFaceMatcher = async (workerList) => {
    setIsInitializingMatcher(true);
    setStatus('Building facial recognition index...', 'idle');
    try {
      const labeled = await loadLabeledDescriptors(workerList);
      setEnrolledCount(labeled.length);
      if (labeled.length > 0) {
        const matcher = new faceapi.FaceMatcher(labeled, MATCH_THRESHOLD);
        faceMatcherRef.current = matcher;
        setFaceMatcher(matcher);
        setStatus(`Biometric engine online — ${labeled.length} worker(s) enrolled`, 'idle');
      } else {
        setStatus('No enrolled workers found. Enroll workers first.', 'warning');
      }
    } catch (err) {
      console.error('[FaceAttendance] matcher build error:', err);
      setStatus('Recognition index failed — continuing in detection-only mode', 'warning');
    } finally {
      setIsInitializingMatcher(false);
    }
  };

  const loadLabeledDescriptors = async (workerList) => {
    try {
      const res = await apiClient.get('/workforce/face-descriptors');
      if (res.success && res.data.length > 0) {
        const labeled = res.data.map(({ worker_id, descriptors }) => {
          const float32s = descriptors.map(d => new Float32Array(d));
          return new faceapi.LabeledFaceDescriptors(String(worker_id), float32s);
        });
        return labeled;
      }
    } catch (_) { /* fall through to image-based */ }

    const labels = workerList.map(w => String(w.worker_id || w.id)).filter(Boolean);
    const unique = [...new Set(labels)];
    const results = await Promise.allSettled(
      unique.map(async (label) => {
        const descs = [];
        for (let i = 1; i <= 5; i++) {
          try {
            const img = await faceapi.fetchImage(`/labels/${label}/${i}.png`);
            const det = await faceapi.detectSingleFace(img)
              .withFaceLandmarks()
              .withFaceDescriptor();
            if (det) descs.push(det.descriptor);
          } catch (_) { /* skip missing */ }
        }
        if (descs.length > 0) return new faceapi.LabeledFaceDescriptors(label, descs);
        return null;
      })
    );
    return results
      .filter(r => r.status === 'fulfilled' && r.value !== null)
      .map(r => r.value);
  };

  // ─── Webcam ──────────────────────────────────────────────────────────────────
  const startWebcam = async (modeToUse = facingModeRef.current) => {
    if (isSwitchingRef.current) return;
    setIsSwitchingCamera(true);
    try {
      setStatus('Requesting camera access...', 'idle');

      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setStatus('Camera API unavailable — use Chrome/Edge on localhost', 'error');
        setIsSwitchingCamera(false);
        return;
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: modeToUse, width: { ideal: 640 }, height: { ideal: 480 }, advanced: [{ exposureMode: 'continuous' }] }
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await new Promise((resolve) => {
          videoRef.current.onloadedmetadata = () => {
            videoRef.current.play();
            resolve();
          };
        });
        hasCameraRef.current = true;
        setHasCamera(true);
        setStatus(
          modelsLoadedRef.current
            ? 'Camera active — position face in frame'
            : 'Camera active — loading models...',
          'idle'
        );
        startDetection();
      }
    } catch (err) {
      console.error('[FaceAttendance] camera error:', err);
      hasCameraRef.current = false;
      setHasCamera(false);
      const msg =
        err.name === 'NotAllowedError' ? 'Camera permission denied — click the 🔒 icon in the address bar and allow camera access, then refresh' :
          err.name === 'NotFoundError' ? 'No camera found — plug in a webcam and refresh' :
            err.name === 'NotReadableError' ? 'Camera is in use by another app — close Zoom/Teams/other tabs, then refresh' :
              err.name === 'OverconstrainedError' ? 'Camera constraints failed — refreshing with relaxed settings...' :
                `Camera error (${err.name}) — refresh the page and allow camera access`;
      setStatus(msg, 'error');

      if (err.name === 'OverconstrainedError') {
        try {
          const fallback = await navigator.mediaDevices.getUserMedia({ video: true });
          streamRef.current = fallback;
          if (videoRef.current) {
            videoRef.current.srcObject = fallback;
            await new Promise(r => { videoRef.current.onloadedmetadata = () => { videoRef.current.play(); r(); }; });
            hasCameraRef.current = true;
            setHasCamera(true);
            setStatus('Camera active (fallback mode)', 'idle');
            startDetection();
          }
        } catch (_) {
          setStatus('Camera unavailable — check device settings', 'error');
        }
      }
    } finally {
      setIsSwitchingCamera(false);
    }
  };

  const stopWebcam = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => {
        try { t.stop(); } catch(e) { console.warn(e); }
      });
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    hasCameraRef.current = false;
    setHasCamera(false);
  };

  const toggleCamera = () => {
    if (isSwitchingRef.current) return;
    const nextMode = facingModeRef.current === 'user' ? 'environment' : 'user';
    setFacingMode(nextMode);
    stopWebcam();
    startWebcam(nextMode);
  };

  // ─── Detection Loop ──────────────────────────────────────────────────────────
  const startDetection = () => {
    stopDetection();
    detectionIntervalRef.current = setInterval(async () => {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (!video || !canvas || !hasCameraRef.current || !modelsLoadedRef.current) return;
      if (video.readyState < 3) return;

      try {
        const detections = await faceapi
  .detectAllFaces(
    video,
    isMobile
      ? new faceapi.TinyFaceDetectorOptions({ inputSize: 224, scoreThreshold: 0.5 })
      : new faceapi.SsdMobilenetv1Options({ minConfidence: 0.5 })
  );

        const count = detections.length;
        setIsFacePresent(count > 0);
        setLiveDetectionCount(count);

        // Disabled real-time matching for performance on low-end devices
        setCurrentConfidence(null);

        const displayW = video.videoWidth;
        const displayH = video.videoHeight;
        if (displayW === 0 || displayH === 0) return;

        canvas.width = displayW;
        canvas.height = displayH;
        faceapi.matchDimensions(canvas, { width: displayW, height: displayH });

        const resized = faceapi.resizeResults(detections, { width: displayW, height: displayH });
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, displayW, displayH);

        const mirrorContext = facingModeRef.current === 'user';
        if (mirrorContext) {
          ctx.save();
          ctx.scale(-1, 1);
          ctx.translate(-displayW, 0);
        }

        resized.forEach(det => {
          const box = det.box || det.detection?.box || det;
          const color = '#facc15'; // yellow-400 for camera focus

          const cs = 20; // corner size
          ctx.strokeStyle = color;
          ctx.lineWidth = 3;
          
          // Top Left
          ctx.beginPath(); ctx.moveTo(box.x, box.y + cs); ctx.lineTo(box.x, box.y); ctx.lineTo(box.x + cs, box.y); ctx.stroke();
          // Top Right
          ctx.beginPath(); ctx.moveTo(box.x + box.width - cs, box.y); ctx.lineTo(box.x + box.width, box.y); ctx.lineTo(box.x + box.width, box.y + cs); ctx.stroke();
          // Bottom Left
          ctx.beginPath(); ctx.moveTo(box.x, box.y + box.height - cs); ctx.lineTo(box.x, box.y + box.height); ctx.lineTo(box.x + cs, box.y + box.height); ctx.stroke();
          // Bottom Right
          ctx.beginPath(); ctx.moveTo(box.x + box.width - cs, box.y + box.height); ctx.lineTo(box.x + box.width, box.y + box.height); ctx.lineTo(box.x + box.width, box.y + box.height - cs); ctx.stroke();
        });

        if (mirrorContext) {
          ctx.restore();
        }
      } catch (_) { /* skip frame */ }
    }, DETECTION_INTERVAL_MS);
  };

  const stopDetection = () => {
    if (detectionIntervalRef.current) {
      clearInterval(detectionIntervalRef.current);
      detectionIntervalRef.current = null;
    }
  };

  // ─── Helpers ──────────────────────────────────────────────────────────────────
  const setStatus = (msg, type = 'idle') => {
    setStatusMessage(msg);
    setStatusType(type);
  };

  const fetchWorkers = async () => {
    try {
      const res = await apiClient.get('/workforce/workers');
      if (res.success) setWorkers(res.data);
    } catch (err) {
      console.error('[FaceAttendance] fetchWorkers:', err);
    }
  };

  const fetchTodayLogs = async () => {
    try {
      const res = await apiClient.get('/workforce/biometric-attendance?date=today');
      if (res.success) {
        setLogs(res.data);
        setTodayCount(res.data.length);
      }
    } catch (_) { /* endpoint may not exist yet, use local logs */ }
  };

  // ─── Scan / Authenticate ─────────────────────────────────────────────────────
  const startScan = async () => {
    if (!isFacePresent) {
      setStatus('No face detected — position yourself in frame', 'warning');
      return;
    }
    if (!faceMatcher) {
      setStatus('Recognition index not ready — wait or enroll workers', 'warning');
      return;
    }

    setIsScanning(true);
    setScanResult(null);
    setDetectedWorker(null);
    setStatus('Authenticating biometric signature...', 'scanning');

    try {
      const captures = [];
      for (let attempt = 0; attempt < 3; attempt++) {
        const dets = await faceapi
          .detectAllFaces(
            videoRef.current,
            isMobile
              ? new faceapi.TinyFaceDetectorOptions({ inputSize: 224, scoreThreshold: 0.5 })
              : new faceapi.SsdMobilenetv1Options({ minConfidence: 0.5 })
          )
          .withFaceLandmarks()
          .withFaceDescriptors();
        if (dets.length > 0) captures.push(dets[0]);
        await new Promise(r => setTimeout(r, 120));
      }

      if (captures.length === 0) {
        setStatus('Detection failed — please try again', 'error');
        setScanResult('error');
        return;
      }

      const best = captures.reduce((a, b) =>
        a.detection.score > b.detection.score ? a : b
      );
      const match = faceMatcher.findBestMatch(best.descriptor);

      if (match.label !== 'unknown') {
        const worker = workers.find(
          w => String(w.worker_id) === match.label || String(w.id) === match.label
        );

        if (worker) {
          const conf = ((1 - match.distance) * 100).toFixed(1);

          setStatus('Neural-Sync in progress...', 'scanning');
          await new Promise(r => setTimeout(r, 800));

          setStatus('Analyzing Liveness & Heat Signature...', 'scanning');
          await new Promise(r => setTimeout(r, 1000));

          setScanResult('success');
          setDetectedWorker({
            name: `${worker.first_name} ${worker.last_name}`,
            id: worker.id,
            workerId: worker.worker_id || `W-${worker.id}`,
            role: worker.category || 'Field Worker',
            confidence: `${conf}%`,
            rawWorker: worker
          });
          setShowResultModal(true);
          setStatus('Authentication successful — Reviewing identity', 'success');
        } else {
          setScanResult('error');
          setShowResultModal(true);
          setStatus('Face matched but worker record not found', 'error');
        }
      } else {
        setScanResult('error');
        setShowResultModal(true);
        setStatus('Identity not recognized — not enrolled or poor match', 'error');
      }
    } catch (err) {
      console.error('[FaceAttendance] scan error:', err);
      setScanResult('error');
      setShowResultModal(true);
      setStatus('Authentication error — please retry', 'error');
    } finally {
      setIsScanning(false);
    }
  };

  const submitAttendance = async () => {
    if (!detectedWorker) return;
    setIsSubmitting(true);
    try {
      const freshLoc = await getPreciseLocation();
      const res = await apiClient.post('/workforce/attendance', {
        worker_id: detectedWorker.id,
        latitude: freshLoc?.lat || null,
        longitude: freshLoc?.lng || null,
        auth_method: 'face',
        action: mode
      });

      if (!res.success) {
        throw new Error(res.error || 'System failed to verify record');
      }

      await apiClient.post('/workforce/biometric-attendance', {
        worker_id: detectedWorker.id,
        confidence: parseFloat(detectedWorker.confidence),
        method: 'face-api',
        action: mode
      });

      const entry = {
        id: Date.now(),
        name: detectedWorker.name,
        workerId: detectedWorker.workerId,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        confidence: detectedWorker.confidence,
        status: 'Verified'
      };
      setLogs(prev => [entry, ...prev.slice(0, 49)]);
      setTodayCount(prev => prev + 1);

      setShowResultModal(false);
      resetScan();
    } catch (err) {
      console.error('Submission failed', err);
      setSubmissionError(err.message || 'Biometric link failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetScan = () => {
    setScanResult(null);
    setDetectedWorker(null);
    setShowResultModal(false);
    setSubmissionError(null);
    setStatus(hasCamera ? 'Ready — position face in frame' : 'Camera offline', 'idle');
  };

  // ─── Status color helpers ─────────────────────────────────────────────────────
  const statusColors = {
    idle: 'text-slate-300',
    scanning: 'text-amber-400 animate-pulse',
    success: 'text-emerald-400',
    error: 'text-rose-400',
    warning: 'text-amber-400'
  };

  const statusBg = {
    idle: 'bg-black/80',
    scanning: 'bg-amber-500/10 border-amber-500/30',
    success: 'bg-emerald-500/10 border-emerald-500/30',
    error: 'bg-rose-500/10 border-rose-500/30',
    warning: 'bg-amber-500/10 border-amber-500/30'
  };

  return (
    <div className="fixed inset-0 bg-black sm:bg-zinc-950 sm:flex sm:items-center sm:justify-center z-50">
      <div className="w-full h-full sm:w-[420px] sm:h-[850px] sm:max-h-[90vh] sm:rounded-[3rem] sm:border-[12px] sm:border-zinc-900 sm:shadow-[0_0_50px_rgba(0,0,0,0.5)] bg-black text-white overflow-hidden flex flex-col font-sans select-none animate-in fade-in duration-500 relative">
        <style>{HUD_CSS}</style>
        
        {/* ── Camera Viewport ── */}
        <div className="relative flex-1 bg-black overflow-hidden flex flex-col items-center justify-center">
        {/* Video + Canvas */}
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-1000 ${facingMode === 'user' ? 'scale-x-[-1]' : ''} ${hasCamera ? 'opacity-100' : 'opacity-0'}`}
        />
        <canvas
          ref={canvasRef}
          className={`absolute inset-0 w-full h-full z-10 pointer-events-none transition-opacity duration-1000 ${hasCamera ? 'opacity-100' : 'opacity-0'}`}
        />

        {/* Loading / No Camera State */}
        {!hasCamera && (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-white/50 z-10">
            {!modelsLoaded ? (
              <Loader2 size={40} className="animate-spin mb-4" />
            ) : (
              <Camera size={50} className="mb-4 opacity-50" />
            )}
            <p className="text-xs uppercase tracking-widest font-semibold">
              {!modelsLoaded ? 'Starting Engine...' : 'Camera Access Required'}
            </p>
          </div>
        )}

        {/* Top Controls Overlay */}
        <div className="absolute top-0 inset-x-0 h-28 bg-gradient-to-b from-black/80 via-black/40 to-transparent z-20 flex justify-between items-start p-6">
          <button 
            onClick={() => navigate(-1)} 
            className="w-10 h-10 rounded-full bg-white/10 backdrop-blur flex items-center justify-center active:scale-90 transition-transform"
          >
            <ArrowLeft size={20} className="text-white" />
          </button>
          
          <div className="flex flex-col items-center gap-1">
            <div className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest backdrop-blur-md border ${
              statusType === 'success' ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' : 
              statusType === 'error' ? 'bg-rose-500/20 text-rose-400 border-rose-500/30' : 
              statusType === 'scanning' ? 'bg-amber-500/20 text-amber-400 border-amber-500/30' : 
              statusType === 'warning' ? 'bg-amber-500/20 text-amber-400 border-amber-500/30' : 
              'bg-white/10 text-white/70 border-white/10'
            } text-center max-w-xs truncate`}>
              {statusMessage}
            </div>
            {isFacePresent && !isScanning && (
              <span className="text-[10px] text-yellow-400 font-bold uppercase tracking-widest shadow-black drop-shadow-md">Face Detected</span>
            )}
          </div>
          
          <button 
            onClick={toggleCamera}
            disabled={isSwitchingCamera || !hasCamera}
            className="w-10 h-10 rounded-full bg-white/10 backdrop-blur flex items-center justify-center active:scale-90 transition-transform disabled:opacity-50"
          >
            <RefreshCcw size={18} className={`text-white ${isSwitchingCamera ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {/* Rule of Thirds / Camera Guides */}
        {hasCamera && !isScanning && !showResultModal && (
          <div className="absolute inset-0 z-10 pointer-events-none flex items-center justify-center opacity-30">
             {/* Center focus subtle bracket */}
             <div className="w-64 h-64 border border-white/20 rounded-[2.5rem] relative">
               <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-white/30" />
             </div>
          </div>
        )}
      </div>

      {/* ── Bottom Controls ── */}
      <div className="h-56 bg-black z-20 flex flex-col justify-center items-center pb-8 pt-4">
        {/* Mode Selector */}
        <div className="flex gap-8 mb-6 text-[11px] font-bold tracking-widest uppercase">
          <button 
            onClick={() => setMode('check-in')} 
            className={`transition-all duration-300 ${mode === 'check-in' ? 'text-yellow-400 scale-110 drop-shadow-[0_0_8px_rgba(250,204,21,0.5)]' : 'text-white/50'}`}
          >
            Check-In
          </button>
          <button 
            onClick={() => setMode('check-out')} 
            className={`transition-all duration-300 ${mode === 'check-out' ? 'text-yellow-400 scale-110 drop-shadow-[0_0_8px_rgba(250,204,21,0.5)]' : 'text-white/50'}`}
          >
            Off-Time
          </button>
        </div>

        {/* Shutter Button Row */}
        <div className="flex items-center justify-between w-full px-12 max-w-md mx-auto">
          {/* Logs / History Button */}
          <Link to="/attendance/logs" className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center active:scale-90 transition-transform">
             <History size={20} className="text-white" />
          </Link>

          {/* Shutter Button */}
          <div className="relative flex items-center justify-center">
            {/* Outer Ring */}
            <div className={`absolute inset-0 rounded-full border-[3px] transition-colors duration-300 ${isScanning ? 'border-amber-400' : 'border-white'}`} />
            
            <button 
              onClick={startScan}
              disabled={isScanning || !modelsLoaded || !hasCamera || isInitializingMatcher}
              className={`relative z-10 w-20 h-20 rounded-full flex items-center justify-center p-1.5 focus:outline-none disabled:opacity-50 transition-transform active:scale-95`}
            >
              {/* Inner Button */}
              <div className={`w-full h-full rounded-full transition-all duration-300 ${isScanning ? 'bg-amber-500 scale-[0.4] rounded-xl' : mode === 'check-in' ? 'bg-white' : 'bg-rose-500'}`} />
            </button>
          </div>

          {/* Placeholder for symmetry */}
          <div className="w-12 h-12 flex items-center justify-center">
             {/* Could add a gallery thumbnail here if needed */}
             <div className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center overflow-hidden">
               <Users size={14} className="text-white/30" />
             </div>
          </div>
        </div>
      </div>

      {/* ── Confirmation Modal ── */}
      {showResultModal && (
        <div className="absolute inset-0 z-[300] flex flex-col justify-end bg-black/60 backdrop-blur-sm animate-in fade-in duration-300 pb-8 px-4">
          <div className="w-full max-w-sm mx-auto rounded-[2.5rem] bg-zinc-900 overflow-hidden shadow-2xl animate-in slide-in-from-bottom-10 zoom-in-95 duration-400">
            {scanResult === 'success' && detectedWorker ? (
              <div className="flex flex-col h-full">
                {/* Modal Header */}
                <div className="p-8 text-center border-b border-white/5">
                  <div className={`w-20 h-20 rounded-full mx-auto flex items-center justify-center mb-4 border-[3px] ${mode === 'check-out' ? 'bg-rose-500/10 text-rose-400 border-rose-500/30' : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'}`}>
                    <UserCheck size={36} />
                  </div>
                  <div className={`text-[10px] font-bold uppercase tracking-widest mb-1 ${mode === 'check-out' ? 'text-rose-400' : 'text-emerald-400'}`}>
                    {mode === 'check-out' ? 'Check-Out Scanned' : 'Check-In Scanned'}
                  </div>
                  <h3 className="text-2xl font-black uppercase tracking-tight text-white leading-tight">
                    {detectedWorker.name}
                  </h3>
                  <p className="text-white/50 text-xs font-semibold mt-1 uppercase tracking-widest">{detectedWorker.workerId}</p>
                </div>

                {/* Modal Content */}
                <div className="p-8 space-y-6">
                  {submissionError && (
                    <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl flex items-center gap-2">
                      <AlertCircle className="text-rose-500 shrink-0" size={16} />
                      <p className="text-[10px] font-bold uppercase tracking-widest text-rose-400 leading-tight">
                        {submissionError}
                      </p>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex flex-col gap-3">
                    <button
                      onClick={submitAttendance}
                      disabled={isSubmitting}
                      className={`w-full py-4 rounded-2xl text-white font-black uppercase tracking-widest text-xs flex items-center justify-center gap-2 transition-all ${mode === 'check-out' ? 'bg-rose-600 hover:bg-rose-500' : 'bg-yellow-500 text-black hover:bg-yellow-400'}`}
                    >
                      {isSubmitting ? <Loader2 className="animate-spin" size={16} /> : mode === 'check-out' ? <LogOut size={16} /> : <CheckCircle size={16} />}
                      {mode === 'check-out' ? 'Confirm Off-Time' : 'Log Attendance'}
                    </button>
                    <button
                      onClick={resetScan}
                      disabled={isSubmitting}
                      className="w-full py-4 rounded-2xl bg-white/10 text-white font-bold uppercase tracking-widest text-xs hover:bg-white/20 transition-all"
                    >
                      Retake
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-10 text-center">
                <div className="w-20 h-20 bg-rose-500/10 rounded-full flex items-center justify-center text-rose-500 mx-auto mb-6 border-[3px] border-rose-500/20">
                  <CircleX size={40} />
                </div>
                <h3 className="text-xl font-black text-white uppercase tracking-tight mb-2">Not Recognized</h3>
                <p className="text-white/50 text-xs font-medium mb-8 max-w-[200px] mx-auto leading-relaxed">
                  Bring your face clearly into the frame and try again.
                </p>
                <button
                  onClick={resetScan}
                  className="w-full py-4 bg-white text-black rounded-2xl font-black uppercase tracking-widest text-xs active:scale-95 transition-transform"
                >
                  Try Again
                </button>
              </div>
            )}
          </div>
        </div>
      )}
      </div>
    </div>
  );
}