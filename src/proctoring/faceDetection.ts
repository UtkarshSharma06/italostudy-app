import { FaceDetector, FilesetResolver, FaceLandmarker } from '@mediapipe/tasks-vision';

/**
 * Face Detection Module
 * Responsibilities:
 * - Detect face presence
 * - Estimate head pose (yaw/pitch)
 * - Track "face not detected" duration
 * - Track "looking away" duration
 */

export interface FaceDetectionResult {
  facePresent: boolean;
  lookingAway: boolean;
  yaw: number;
  pitch: number;
  faceCount: number;
  isBlinking: boolean;
}

export class FaceDetection {
  private detector: FaceLandmarker | null = null;
  private faceNotDetectedStart: number | null = null;
  private lookingAwayStart: number | null = null;

  async init() {
    const vision = await FilesetResolver.forVisionTasks(
      "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm"
    );
    this.detector = await FaceLandmarker.createFromOptions(vision, {
      baseOptions: {
        modelAssetPath: "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task",
        delegate: "CPU"  // CPU is more reliable in browser; GPU requires valid WebGL context
      },
      runningMode: "VIDEO",
      numFaces: 2,
    });
  }

  detect(videoElement: HTMLVideoElement): { facePresent: boolean; lookingAway: boolean; yaw: number; pitch: number; faceCount: number; isBlinking: boolean } {
    if (!this.detector) {
      return { facePresent: false, lookingAway: false, yaw: 0, pitch: 0, faceCount: 0, isBlinking: false };
    }

    // CRITICAL GUARD: MediaPipe crashes with "roi width/height must be > 0"
    // if the video element has no dimensions yet (not playing, or stream not ready)
    if (
      !videoElement ||
      videoElement.videoWidth === 0 ||
      videoElement.videoHeight === 0 ||
      videoElement.readyState < 2 ||  // HAVE_CURRENT_DATA minimum
      videoElement.paused ||
      videoElement.ended
    ) {
      return { facePresent: false, lookingAway: false, yaw: 0, pitch: 0, faceCount: 0, isBlinking: false };
    }

    const timestamp = performance.now();
    const result = this.detector.detectForVideo(videoElement, timestamp);
    const faceCount = result.faceLandmarks ? result.faceLandmarks.length : 0;

    if (faceCount === 0) {
      return { facePresent: false, lookingAway: false, yaw: 0, pitch: 0, faceCount: 0, isBlinking: false };
    }

    const landmarks = result.faceLandmarks[0];
    
    // 1. Head Pose Estimation (Yaw/Pitch)
    const nose = landmarks[1];
    const leftEye = landmarks[33];
    const rightEye = landmarks[263];

    const yaw = (rightEye.z - leftEye.z) * 1000;
    const pitch = (nose.y - (leftEye.y + rightEye.y) / 2) * 500;

    const lookingAway = Math.abs(yaw) > 20 || Math.abs(pitch) > 15;

    // 2. Blink Detection (Vertical Eye Aperture)
    const leftTop = landmarks[159].y;
    const leftBottom = landmarks[145].y;
    const rightTop = landmarks[386].y;
    const rightBottom = landmarks[374].y;

    const leftVerticalDist = Math.abs(leftBottom - leftTop);
    const rightVerticalDist = Math.abs(rightBottom - rightTop);
    
    const isBlinking = leftVerticalDist < 0.012 && rightVerticalDist < 0.012;

    return {
      facePresent: true,
      lookingAway,
      yaw,
      pitch,
      faceCount,
      isBlinking
    };
  }

  getFaceNotDetectedDuration(): number {
    if (this.faceNotDetectedStart === null) return 0;
    return (Date.now() - this.faceNotDetectedStart) / 1000;
  }

  updateFaceDetectionStatus(present: boolean) {
    if (present) {
      this.faceNotDetectedStart = null;
    } else if (this.faceNotDetectedStart === null) {
      this.faceNotDetectedStart = Date.now();
    }
  }

  updateLookingAwayStatus(lookingAway: boolean) {
    if (!lookingAway) {
      this.lookingAwayStart = null;
    } else if (this.lookingAwayStart === null) {
      this.lookingAwayStart = Date.now();
    }
  }

  getLookingAwayDuration(): number {
    if (this.lookingAwayStart === null) return 0;
    return (Date.now() - this.lookingAwayStart) / 1000;
  }
}
