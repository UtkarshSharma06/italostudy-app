import type * as cocoSsdType from '@tensorflow-models/coco-ssd';

/**
 * Object Detection Module
 * Uses: TensorFlow COCO-SSD (MobileNetV2)
 * Detects: cell phone, book, person, tablet, laptop
 * Returns bounding boxes for visual overlay
 */

export interface DetectedObject {
  label: string;
  score: number;
  bbox: [number, number, number, number]; // [x, y, width, height] in px
}

export interface ObjectDetectionResult {
  phoneDetected: boolean;
  personCount: number;
  bookDetected: boolean;
  detections: DetectedObject[];
}

export class ObjectDetection {
  private model: cocoSsdType.ObjectDetection | null = null;
  private phoneConfirmationCount = 0;
  private readonly CONFIRMATION_THRESHOLD = 1; // Instant detection
  private initialized = false;

  async init() {
    if (this.initialized) return;

    // Sequential import to ensure base TFJS is ready before backend/model
    // This avoids "ReferenceError: Cannot access 'X' before initialization" in some bundled environments
    const tf = await import('@tensorflow/tfjs');
    const { setWasmPaths } = await import('@tensorflow/tfjs-backend-wasm');
    const cocoSsd = await import('@tensorflow-models/coco-ssd');

    // Use WASM backend. WebGL freezes the entire Chrome tab on some GPUs.
    setWasmPaths('https://cdn.jsdelivr.net/npm/@tensorflow/tfjs-backend-wasm@4.22.0/dist/');
    await tf.setBackend('wasm');
    await tf.ready();

    this.model = await cocoSsd.load({ base: 'lite_mobilenet_v2' });
    this.initialized = true;
    console.log('[AI] COCO-SSD loaded (WASM backend, lite model)');
  }

  async detectObjects(videoElement: HTMLVideoElement): Promise<ObjectDetectionResult> {
    const empty: ObjectDetectionResult = { phoneDetected: false, personCount: 0, bookDetected: false, detections: [] };
    if (!this.model) return empty;

    // CRITICAL GUARD: TensorFlow crashes with "texture size [0x0]" if video not ready
    if (
      !videoElement ||
      videoElement.videoWidth === 0 ||
      videoElement.videoHeight === 0 ||
      videoElement.readyState < 2 ||
      videoElement.paused ||
      videoElement.ended
    ) {
      return empty;
    }

    const predictions = await this.model.detect(videoElement);

    // Build detection results with bounding boxes
    const detections: DetectedObject[] = predictions
      .filter(p => p.score > 0.15) // Lowered global threshold for more sensitivity
      .map(p => ({
        label: p.class,
        score: p.score,
        bbox: p.bbox as [number, number, number, number],
      }));

    // Phone / Device Detection
    const phoneClasses = ['cell phone', 'phone', 'tablet', 'laptop', 'remote'];
    // Lowered phone threshold down to 0.15 as requested for "100% quick" detection even in poor conditions
    const phoneRaw = detections.some(d => phoneClasses.includes(d.label) && d.score > 0.15);

    if (phoneRaw) {
      this.phoneConfirmationCount = Math.min(this.phoneConfirmationCount + 1, 5);
    } else {
      this.phoneConfirmationCount = Math.max(this.phoneConfirmationCount - 1, 0);
    }

    // Book / Notes Detection
    const bookDetected = detections.some(d => d.label === 'book' && d.score > 0.3);

    // Background Person Detection (separate from main candidate)
    const personCount = detections.filter(d => d.label === 'person' && d.score > 0.45).length;

    return {
      phoneDetected: this.phoneConfirmationCount >= this.CONFIRMATION_THRESHOLD,
      personCount,
      bookDetected,
      detections,
    };
  }

  resetConfirmation() {
    this.phoneConfirmationCount = 0;
  }
}
