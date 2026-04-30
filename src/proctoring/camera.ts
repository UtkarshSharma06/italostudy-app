/**
 * Camera utility for proctoring
 * Responsibilities:
 * - Manage webcam stream
 * - Provide frames for AI detection
 * - Optimize resolution (320x240)
 */

export interface CameraConfig {
  width: number;
  height: number;
  fps: number;
}

const DEFAULT_CONFIG: CameraConfig = {
  width: 320,
  height: 240,
  fps: 10, // Increased for "Real" instant detection
};

export class ProctorCamera {
  private stream: MediaStream | null = null;
  private videoElement: HTMLVideoElement | null = null;
  private canvas: HTMLCanvasElement | null = null;
  private ctx: CanvasRenderingContext2D | null = null;

  constructor(private config: CameraConfig = DEFAULT_CONFIG) {
    this.canvas = document.createElement('canvas');
    this.canvas.width = this.config.width;
    this.canvas.height = this.config.height;
    this.ctx = this.canvas.getContext('2d', { willReadFrequently: true });
  }

  async start(videoRef?: HTMLVideoElement): Promise<MediaStream> {
    try {
      if (!this.stream) {
          this.stream = await navigator.mediaDevices.getUserMedia({
            video: {
              width: { ideal: this.config.width },
              height: { ideal: this.config.height },
              frameRate: { ideal: this.config.fps, max: 15 }, // Capped at 15fps — AI reads ~2fps, no need for 30fps
            },
            audio: false,
          });
        }

      if (videoRef) {
        this.videoElement = videoRef;
        if (this.videoElement.srcObject !== this.stream) {
          this.videoElement.srcObject = this.stream;
        }
        await this.videoElement.play();
      }

      return this.stream;
    } catch (error) {
      console.error('Failed to start proctor camera:', error);
      throw error;
    }
  }

  stop() {
    if (this.stream) {
      this.stream.getTracks().forEach(track => {
        track.stop();
        track.enabled = false;
      });
      this.stream = null;
    }
    if (this.videoElement) {
      this.videoElement.srcObject = null;
      this.videoElement = null;
    }
  }

  captureFrame(): ImageData | null {
    if (!this.videoElement || !this.ctx || !this.canvas) return null;

    // Draw current video frame to canvas
    this.ctx.drawImage(
      this.videoElement,
      0, 0, this.config.width, this.config.height
    );

    return this.ctx.getImageData(0, 0, this.config.width, this.config.height);
  }

  getStream(): MediaStream | null {
    return this.stream;
  }

  getVideoElement(): HTMLVideoElement | null {
    return this.videoElement;
  }

  // Directly register a video element (e.g., after stream already started)
  setVideoElement(element: HTMLVideoElement) {
    this.videoElement = element;
    if (this.stream && element.srcObject !== this.stream) {
      element.srcObject = this.stream;
    }
  }

  getCanvas(): HTMLCanvasElement | null {
    return this.canvas;
  }
}

export const cameraManager = new ProctorCamera();
