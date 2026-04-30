import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { cameraManager } from '@/proctoring/camera';
import { ViolationManager, ProctoringState as AIProctoringState, ViolationEvent } from '@/proctoring/violationManager';

export interface ViolationType {
  type: string;
  severity: 'warning' | 'critical' | 'terminal';
  description: string;
}

interface UseProctoringProps {
  testId: string;
  userId: string;
  enabled: boolean;
  onDisqualify: () => void;
}

interface ProctoringState {
  cameraAllowed: boolean;
  isFullscreen: boolean;
  violationCount: number;
  isDisqualified: boolean;
  aiState: AIProctoringState;
  isInitializing: boolean;
  videoStream: MediaStream | null;
}

const MAX_WARNINGS = 5;

export function useProctoring({ testId, userId, enabled, onDisqualify }: UseProctoringProps) {
  const { toast } = useToast();
  const [state, setState] = useState<ProctoringState>({
    cameraAllowed: false,
    isFullscreen: false,
    violationCount: 0,
    isDisqualified: false,
    isInitializing: false,
    videoStream: cameraManager.getStream(),
    aiState: {
      warnings: 0,
      facePresent: false, // Start pessimistic so user sees it flip to green
      lookingAway: false,
      phoneDetected: false,
      faceCount: 0,
      isBlinking: false,
      lastBlinkTime: Date.now(),
      screenFocused: true,
      detections: [],
      isInitialized: false,
    }
  });

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const violationManagerRef = useRef<ViolationManager | null>(null);
  // Refs for live values — avoids stale closure bug in logViolation useCallback
  const violationCountRef = useRef(0);
  const isDisqualifiedRef = useRef(false);

  // Sync state with cameraManager on mount/enabled change
  useEffect(() => {
    if (enabled) {
      setState(prev => ({
        ...prev,
        cameraAllowed: true,
        videoStream: cameraManager.getStream()
      }));
    }
  }, [enabled]);

  // Log violation to database
  const logViolation = useCallback(async (violation: ViolationType) => {
    if (!enabled || isDisqualifiedRef.current) return;

    // Use ref for live count — avoids stale closure giving always-1 count
    violationCountRef.current += 1;
    const newCount = violationCountRef.current;
    setState(prev => ({ ...prev, violationCount: newCount }));

    // Insert violation record
    await (supabase.from('proctoring_violations' as any) as any).insert({
      test_id: testId,
      user_id: userId,
      violation_type: violation.type,
      severity: violation.severity,
      description: violation.description,
    });

    // Update test violation count
    await (supabase
      .from('tests' as any) as any)
      .update({ violation_count: newCount } as any)
      .eq('id', testId);

    // Handle based on severity
    if (violation.severity === 'terminal') {
      handleDisqualify(violation.description);
      return;
    }

    if (newCount >= MAX_WARNINGS) {
      handleDisqualify('Maximum violations exceeded');
      return;
    }

    // Show warning toast with correct count
    toast({
      title: violation.severity === 'critical' ? '⚠️ Critical Warning' : '⚠️ Warning',
      description: `${violation.description} (${newCount}/${MAX_WARNINGS} warnings)`,
      variant: 'destructive',
    });
  }, [enabled, testId, userId, toast]);

  const handleDisqualify = useCallback(async (reason: string) => {
    if (isDisqualifiedRef.current) return; // prevent double-fire
    isDisqualifiedRef.current = true;
    setState(prev => ({ ...prev, isDisqualified: true }));

    // We no longer update the test status here, because we want to completely delete
    // the mock test record instead of saving a failed/disqualified result.
    // The parent component's onDisqualify will handle the deletion.

    toast({
      title: '🚫 Exam Terminated',
      description: reason,
      variant: 'destructive',
    });

    // Stop media
    violationManagerRef.current?.stop();
    cameraManager.stop();

    onDisqualify();
  }, [testId, toast, onDisqualify]);

  // Request camera/microphone permissions
  const requestPermissions = useCallback(async () => {
    try {
      const stream = await cameraManager.start();
      
      setState(prev => ({
        ...prev,
        cameraAllowed: true,
        videoStream: stream
      }));

      return true;
    } catch (error) {
      console.error('Permission denied:', error);
      toast({
        title: 'Permissions Required',
        description: 'Camera access is required for mock exams.',
        variant: 'destructive',
      });
      return false;
    }
  }, [toast]);

  // Fullscreen management
  const enterFullscreen = useCallback(async () => {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
      }
      setState(prev => ({ ...prev, isFullscreen: true }));
      return true;
    } catch (error) {
      console.error('Fullscreen failed:', error);
      return false;
    }
  }, []);

  const exitFullscreen = useCallback(() => {
    if (document.fullscreenElement) {
      document.exitFullscreen();
    }
    setState(prev => ({ ...prev, isFullscreen: false }));
  }, []);

  // Set video element reference — CRITICAL: must also wire into cameraManager
  // so that cameraManager.getVideoElement() returns the real element during detection
  const setVideoElement = useCallback(async (element: HTMLVideoElement | null) => {
    videoRef.current = element;

    if (element) {
      // Register element directly with cameraManager so getVideoElement() works in detection loop
      cameraManager.setVideoElement(element);

      if (!violationManagerRef.current) {
        setState(prev => ({ ...prev, isInitializing: true }));
        
        const vm = new ViolationManager({
          onViolation: (v: ViolationEvent) => logViolation({
            type: v.type,
            severity: v.severity,
            description: v.details
          }),
          onStateChange: (aiState) => setState(prev => ({ ...prev, aiState }))
        });
        
        await vm.init(element);
        violationManagerRef.current = vm;
        vm.start();
        
        setState(prev => ({ ...prev, isInitializing: false }));
      }
    }
  }, [logViolation]);

  // Keyboard shortcuts & Context menu protection
  useEffect(() => {
    if (!enabled) return;

    const handleKeydown = (e: KeyboardEvent) => {
      if (
        e.key === 'F12' ||
        (e.ctrlKey && e.shiftKey && (e.key === 'I' || e.key === 'J')) ||
        (e.ctrlKey && e.key === 'u')
      ) {
        e.preventDefault();
        logViolation({
          type: 'devtools',
          severity: 'warning',
          description: 'Attempted to open developer tools',
        });
      }
    };

    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
    };

    const handleFullscreenChange = () => {
      setState(prev => ({ ...prev, isFullscreen: !!document.fullscreenElement }));
    };

    document.addEventListener('keydown', handleKeydown);
    document.addEventListener('contextmenu', handleContextMenu);
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    document.addEventListener('mozfullscreenchange', handleFullscreenChange);

    return () => {
      document.removeEventListener('keydown', handleKeydown);
      document.removeEventListener('contextmenu', handleContextMenu);
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
      document.removeEventListener('mozfullscreenchange', handleFullscreenChange);
    };
  }, [enabled, logViolation]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      violationManagerRef.current?.stop();
      cameraManager.stop();
    };
  }, []);

  return {
    ...state,
    requestPermissions,
    enterFullscreen,
    exitFullscreen,
    setVideoElement,
    logViolation,
    startAI: () => violationManagerRef.current?.start(),
    stopAI: () => violationManagerRef.current?.stop(),
  };
}
