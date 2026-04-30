import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Camera,
  Maximize,
  ShieldCheck,
  CheckCircle,
  XCircle,
  Loader2,
  Shield,
} from 'lucide-react';

interface ProctoringSetupProps {
  onPermissionsGranted: () => Promise<boolean>;
  onEnterFullscreen: () => Promise<boolean>;
  onStartExam: () => void;
  cameraAllowed: boolean;
  isFullscreen: boolean;
  videoStream: MediaStream | null;
  isGenerating?: boolean;
  aiState?: any;
  setVideoElement?: (el: HTMLVideoElement | null) => void;
}

const EXAM_RULES = [
  'Your face must remain visible and centred in the camera at all times.',
  'No mobile phones, books, notes, or external screens are permitted.',
  'Switching tabs or applications will trigger an automatic warning.',
  'Leaving fullscreen mode constitutes a violation.',
  'Any repeated violation will result in automatic disqualification.',
  'Ensure adequate lighting and a quiet, uninterrupted environment.',
  'Do not cover the camera during the exam.',
];

export default function ProctoringSetup({
  onPermissionsGranted,
  onEnterFullscreen,
  onStartExam,
  cameraAllowed,
  isFullscreen,
  videoStream,
  isGenerating = false,
  aiState,
  setVideoElement,
}: ProctoringSetupProps) {
  const [step, setStep] = useState<'rules' | 'permissions' | 'ready'>('rules');
  const [acceptedRules, setAcceptedRules] = useState(false);
  const [noMobileConfirm, setNoMobileConfirm] = useState(false);
  const [isRequestingPermissions, setIsRequestingPermissions] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current && videoStream) {
      videoRef.current.srcObject = videoStream;
      videoRef.current.play().catch(() => {});
      if (setVideoElement) setVideoElement(videoRef.current);
    }
  }, [videoStream, step, setVideoElement]);

  const handleAcceptRules = () => {
    if (acceptedRules && noMobileConfirm) setStep('permissions');
  };

  const handleRequestPermissions = async () => {
    setIsRequestingPermissions(true);
    const granted = await onPermissionsGranted();
    setIsRequestingPermissions(false);
    if (granted) {
      setTimeout(async () => {
        const fs = await onEnterFullscreen();
        if (fs) setStep('ready');
      }, 500);
    }
  };

  const isAiReady = aiState?.facePresent && !aiState?.phoneDetected && aiState?.faceCount <= 1;
  const allGranted = cameraAllowed && isFullscreen;

  const requiredChecks = [
    { label: 'Camera Access', ok: cameraAllowed, icon: Camera },
    { label: 'Fullscreen Lock', ok: isFullscreen, icon: Maximize },
  ];

  const aiChecks = [
    { label: 'Face Detected', ok: !!aiState?.facePresent },
    { label: 'No Phone Detected', ok: !aiState?.phoneDetected },
    { label: 'Single Person', ok: (aiState?.faceCount ?? 0) <= 1 },
  ];

  return (
    <div className="fixed inset-0 bg-slate-900/85 z-[1000] flex items-center justify-center p-4 md:p-8 overflow-hidden">
      <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-4xl w-full shadow-xl overflow-hidden border border-slate-200 dark:border-slate-700 flex flex-col lg:flex-row max-h-[92vh]">

        {/* ─── Left Panel ─── */}
        <div className="lg:w-1/2 p-8 border-b lg:border-b-0 lg:border-r border-slate-100 dark:border-slate-800 flex flex-col justify-between overflow-y-auto">
          <div>
            {/* Header */}
            <div className="flex items-center gap-3 mb-8 pb-6 border-b border-slate-100 dark:border-slate-800">
              <ShieldCheck className="w-6 h-6 text-slate-600 dark:text-slate-400" />
              <div>
                <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 tracking-tight">Technical Readiness Check</h2>
                <p className="text-xs text-slate-400 uppercase tracking-widest">Secure Examination Protocol</p>
              </div>
            </div>

            {/* Step: Rules */}
            {step === 'rules' && (
              <div className="space-y-6">
                <div className="space-y-3">
                  {EXAM_RULES.map((rule, idx) => (
                    <div key={idx} className="flex gap-3 items-start">
                      <span className="text-[10px] font-bold text-slate-300 mt-0.5 w-5 shrink-0 tabular-nums">{idx + 1}.</span>
                      <p className="text-sm text-slate-600 dark:text-slate-400 leading-snug">{rule}</p>
                    </div>
                  ))}
                </div>

                <div className="pt-4 space-y-3 border-t border-slate-100 dark:border-slate-800">
                  <label className="flex items-start gap-3 p-3 rounded-xl border border-slate-100 dark:border-slate-800 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                    <Checkbox
                      checked={acceptedRules}
                      onCheckedChange={(v) => setAcceptedRules(v === true)}
                      className="mt-0.5"
                    />
                    <span className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                      I have read all the examination rules and accept the terms of this proctored session.
                    </span>
                  </label>
                  <label className="flex items-start gap-3 p-3 rounded-xl border border-slate-100 dark:border-slate-800 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                    <Checkbox
                      checked={noMobileConfirm}
                      onCheckedChange={(v) => setNoMobileConfirm(v === true)}
                      className="mt-0.5"
                    />
                    <span className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                      I confirm no secondary devices or prohibited materials are within my reach.
                    </span>
                  </label>
                </div>
              </div>
            )}

            {/* Step: Permissions */}
            {step === 'permissions' && (
              <div className="space-y-3">
                <p className="text-sm text-slate-500 mb-4">Grant the required system access to proceed. Each item must be confirmed before the exam can begin.</p>
                {requiredChecks.map((item, i) => (
                  <div
                    key={i}
                    className={`flex items-center justify-between p-4 rounded-xl border ${
                      item.ok
                        ? 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50'
                        : 'border-slate-100 dark:border-slate-800 opacity-60'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <item.icon className="w-4 h-4 text-slate-500" />
                      <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{item.label}</span>
                    </div>
                    {item.ok
                      ? <CheckCircle className="w-4 h-4 text-slate-600 dark:text-slate-400" />
                      : <Loader2 className="w-4 h-4 text-slate-300 animate-spin" />
                    }
                  </div>
                ))}
              </div>
            )}

            {/* Step: Ready */}
            {step === 'ready' && (
              <div className="space-y-4">
                <p className="text-sm text-slate-500 mb-4">
                  The AI monitoring system is calibrating. Ensure your face is clearly visible, well-lit, and centred in the camera feed before proceeding.
                </p>
                {aiChecks.map((c, i) => (
                  <div key={i} className="flex items-center justify-between py-2.5 border-b border-slate-50 dark:border-slate-800">
                    <span className="text-sm text-slate-600 dark:text-slate-400">{c.label}</span>
                    <div className={`flex items-center gap-2 text-xs font-semibold ${c.ok ? 'text-slate-600 dark:text-slate-400' : 'text-rose-500'}`}>
                      {c.ok
                        ? <><CheckCircle className="w-3.5 h-3.5" /> Confirmed</>
                        : <><XCircle className="w-3.5 h-3.5" /> Not Detected</>
                      }
                    </div>
                  </div>
                ))}

                <div className={`mt-4 p-4 rounded-xl border text-sm ${isAiReady
                  ? 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 text-slate-600 dark:text-slate-400'
                  : 'border-amber-100 dark:border-amber-900/30 bg-amber-50 dark:bg-amber-900/10 text-amber-700 dark:text-amber-400'
                }`}>
                  {isAiReady
                    ? '✓ All systems confirmed. You may initiate the examination.'
                    : 'Please position yourself clearly in front of the camera to proceed.'}
                </div>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="pt-8">
            {step === 'rules' && (
              <Button
                onClick={handleAcceptRules}
                disabled={!acceptedRules || !noMobileConfirm}
                className="w-full h-12 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-white rounded-xl font-semibold text-sm disabled:opacity-30"
              >
                Acknowledge &amp; Continue
              </Button>
            )}
            {step === 'permissions' && (
              <Button
                onClick={handleRequestPermissions}
                disabled={isRequestingPermissions || allGranted}
                className="w-full h-12 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 hover:bg-slate-800 rounded-xl font-semibold text-sm disabled:opacity-50"
              >
                {isRequestingPermissions ? (
                  <><Loader2 className="w-4 h-4 animate-spin mr-2" />Requesting Access...</>
                ) : allGranted ? 'Access Granted' : 'Grant System Access'}
              </Button>
            )}
            {step === 'ready' && (
              <Button
                onClick={onStartExam}
                disabled={isGenerating || !isAiReady}
                className="w-full h-12 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 hover:bg-slate-800 rounded-xl font-semibold text-sm disabled:opacity-30 flex items-center justify-center gap-2"
              >
                {isGenerating
                  ? <><Loader2 className="w-4 h-4 animate-spin" /> Generating Questions...</>
                  : <><Shield className="w-4 h-4" /> Initiate Examination</>
                }
              </Button>
            )}
          </div>
        </div>

        {/* ─── Right Panel: Camera ─── */}
        <div className="lg:w-1/2 bg-slate-50 dark:bg-slate-950 p-6 lg:p-10 flex items-center justify-center">
          <div className="w-full max-w-xs">
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-3 text-center">Live Camera Feed</p>

            <div className="aspect-[3/4] rounded-2xl border-2 border-slate-200 dark:border-slate-700 overflow-hidden bg-slate-100 dark:bg-slate-800 relative">
              {cameraAllowed && videoStream ? (
                <>
                  <video
                    ref={videoRef}
                    autoPlay
                    muted
                    playsInline
                    className="w-full h-full object-cover scale-x-[-1]"
                  />
                  {/* Minimal status badges */}
                  {step === 'ready' && (
                    <div className="absolute top-3 left-3 right-3 space-y-1.5">
                      {aiChecks.map((c, i) => (
                        <div
                          key={i}
                          className={`flex items-center justify-between px-2.5 py-1 rounded-lg text-[9px] font-semibold uppercase tracking-wide ${
                            c.ok
                              ? 'bg-black/50 text-white/80'
                              : 'bg-rose-600/80 text-white'
                          }`}
                        >
                          <span>{c.label}</span>
                          <span>{c.ok ? '✓' : '✗'}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-slate-400 gap-3">
                  <Camera className="w-10 h-10 opacity-20" />
                  <p className="text-xs text-slate-400 text-center">Camera access required</p>
                </div>
              )}
            </div>

            <p className="text-[9px] text-slate-300 dark:text-slate-600 text-center mt-3 uppercase tracking-widest">
              Visual Validation Protocol
            </p>
          </div>
        </div>

      </div>
    </div>
  );
}
