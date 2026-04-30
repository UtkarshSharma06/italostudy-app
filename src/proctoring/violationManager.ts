import { cameraManager } from './camera';
import { BrowserMonitor, BrowserViolationType } from './browserMonitor';
import { ObjectDetection, DetectedObject } from './objectDetection';
// AudioMonitor removed — mic permission is not needed

/**
 * Violation Manager — Optimized
 * - Dynamic detection interval: slows down if inference is heavy
 * - Debounced state notifications: only fires when state actually changes
 * - Minimal console logging (only violations + errors)
 * - Skips loop when tab is hidden (saves CPU instantly)
 */

export interface ViolationEvent {
  type: string;
  details: string;
  severity: 'warning' | 'critical' | 'terminal';
}

export interface ProctoringState {
  warnings: number;
  facePresent: boolean;
  lookingAway: boolean;
  phoneDetected: boolean;
  faceCount: number;
  isBlinking: boolean;
  lastBlinkTime: number;
  screenFocused: boolean;
  detections: DetectedObject[]; // bounding boxes for UI overlay
  isInitialized: boolean;
}

export class ViolationManager {
  private browserMonitor: BrowserMonitor;
  private objectDetection: ObjectDetection;
  // AudioMonitor removed
  private loopHandle: any = null;
  private isProcessing = false;
  private _noPersonStartTime: number | null = null;

  // Debounce: track last emitted values to avoid redundant React re-renders
  private _lastFacePresent: boolean | null = null;
  private _lastPhoneDetected: boolean | null = null;
  private _lastFaceCount: number | null = null;

  private state: ProctoringState = {
    warnings: 0,
    facePresent: false,
    lookingAway: false,
    phoneDetected: false,
    faceCount: 0,
    isBlinking: false,
    lastBlinkTime: Date.now(),
    screenFocused: true,
    detections: [],
    isInitialized: false,
  };

  private readonly MAX_WARNINGS = 5;
  // Dynamic interval: starts at 400ms, backs off to 800ms if inference is heavy
  private currentInterval = 400;
  private readonly MIN_INTERVAL = 400;
  private readonly MAX_INTERVAL = 800;

  constructor(private callbacks: {
    onViolation: (event: ViolationEvent) => void;
    onStateChange: (state: ProctoringState) => void;
  }) {
    this.browserMonitor = new BrowserMonitor({
      onViolation: (type, details) => this.handleBrowserViolation(type, details),
      onFocusChange: (isFocused) => {
        this.state.screenFocused = isFocused;
        this.callbacks.onStateChange({ ...this.state });
      }
    });

    this.objectDetection = new ObjectDetection();
  }

  async init(videoElement: HTMLVideoElement) {
    if (this.state.isInitialized) return;
    await this.objectDetection.init();
    this.state.isInitialized = true;
    this.state.lastBlinkTime = Date.now();
    this.callbacks.onStateChange({ ...this.state });
  }

  start() {
    this.browserMonitor.start();
    this.scheduleNextLoop();
  }

  stop() {
    this.browserMonitor.stop();
    if (this.loopHandle) {
      clearTimeout(this.loopHandle);
      this.loopHandle = null;
    }
    cameraManager.stop();
  }

  /** Schedule next detection cycle dynamically based on last inference time */
  private scheduleNextLoop() {
    this.loopHandle = setTimeout(async () => {
      await this.runDetectionLoop();
      this.scheduleNextLoop(); // re-schedule after completion
    }, this.currentInterval);
  }

  private async runDetectionLoop() {
    // Skip if already running OR tab is hidden (saves CPU when user switches tab)
    if (this.isProcessing || document.hidden) return;

    const video = cameraManager.getVideoElement();
    if (!video || !this.state.isInitialized) return;

    this.isProcessing = true;
    const startTime = performance.now();

    try {
      const objectResults = await this.objectDetection.detectObjects(video);

      const newFacePresent = objectResults.personCount > 0;
      const newPhoneDetected = objectResults.phoneDetected;
      const newFaceCount = objectResults.personCount;

      // Only update state + re-render if something meaningful changed
      const stateChanged =
        this._lastFacePresent !== newFacePresent ||
        this._lastPhoneDetected !== newPhoneDetected ||
        this._lastFaceCount !== newFaceCount;

      this.state.facePresent = newFacePresent;
      this.state.faceCount = newFaceCount;
      this.state.phoneDetected = newPhoneDetected;
      this.state.detections = objectResults.detections;
      this.state.lookingAway = false;
      this.state.isBlinking = false;

      if (stateChanged) {
        this._lastFacePresent = newFacePresent;
        this._lastPhoneDetected = newPhoneDetected;
        this._lastFaceCount = newFaceCount;
        this.callbacks.onStateChange({ ...this.state });
      }

      // --- Violation checks ---
      if (newFaceCount > 1) {
        this.triggerViolation('multi_face', 'Multiple persons detected in frame', 'critical');
      }

      if (newFacePresent) {
        this._noPersonStartTime = null;
      } else {
        if (!this._noPersonStartTime) {
          this._noPersonStartTime = Date.now();
        } else if (Date.now() - this._noPersonStartTime > 5000) {
          this.triggerViolation('no_face', 'Person not detected in frame for over 5 seconds', 'critical');
          this._noPersonStartTime = null;
        }
      }

      if (newPhoneDetected) {
        this.triggerViolation('phone_detected', 'Mobile phone or tablet detected in frame', 'critical');
        this.objectDetection.resetConfirmation();
      }

      if (objectResults.bookDetected) {
        this.triggerViolation('unauthorized_material', 'Potential unauthorized materials detected', 'warning');
      }

      // Dynamic interval: slow down if inference was heavy (>300ms), else keep fast
      const duration = performance.now() - startTime;
      if (duration > 300) {
        this.currentInterval = Math.min(this.currentInterval + 100, this.MAX_INTERVAL);
      } else {
        this.currentInterval = Math.max(this.currentInterval - 50, this.MIN_INTERVAL);
      }

    } catch (error) {
      console.error('[Proctor] Detection error:', error);
    } finally {
      this.isProcessing = false;
    }
  }

  private handleBrowserViolation(type: BrowserViolationType, details: string) {
    const severity = type === 'tab_switch' ? 'critical' : 'warning';
    this.triggerViolation(type, details, severity);
  }

  private triggerViolation(type: string, details: string, severity: 'warning' | 'critical' | 'terminal') {
    this.state.warnings++;
    if (this.state.warnings >= this.MAX_WARNINGS || severity === 'terminal') {
      this.callbacks.onViolation({ type, details, severity: 'terminal' });
    } else {
      this.callbacks.onViolation({ type, details, severity });
    }
    this.callbacks.onStateChange({ ...this.state });
  }

  getState() {
    return this.state;
  }
}
