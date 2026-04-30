/**
 * Browser Monitoring Module
 * Uses: Browser Visibility API + focused window monitoring
 * - Tab switching detection (document.hidden)
 * - Window/focus loss detection — DEBOUNCED to avoid false positives
 * - Fullscreen exit detection
 */

export type BrowserViolationType = 'tab_switch' | 'focus_lost';

export interface BrowserMonitorCallbacks {
  onViolation: (type: BrowserViolationType, details: string) => void;
  onFocusChange?: (isFocused: boolean) => void;
}

export class BrowserMonitor {
  private active = false;
  private blurTimer: ReturnType<typeof setTimeout> | null = null;
  private readonly BLUR_GRACE_MS = 3000; // Increased to 3s to prevent false positives from OS notifications

  constructor(private callbacks: BrowserMonitorCallbacks) {}

  start() {
    if (this.active) return;
    this.active = true;

    document.addEventListener('visibilitychange', this.handleVisibilityChange);
    window.addEventListener('blur', this.handleBlur);
    window.addEventListener('focus', this.handleFocus);
  }

  stop() {
    this.active = false;
    if (this.blurTimer) clearTimeout(this.blurTimer);
    document.removeEventListener('visibilitychange', this.handleVisibilityChange);
    window.removeEventListener('blur', this.handleBlur);
    window.removeEventListener('focus', this.handleFocus);
  }

  private handleVisibilityChange = () => {
    if (document.hidden) {
      this.callbacks.onViolation('tab_switch', 'User switched tabs or minimized browser');
      this.callbacks.onFocusChange?.(false);
    } else {
      this.callbacks.onFocusChange?.(true);
    }
  };

  private handleFocus = () => {
    // Cancel pending blur violation
    if (this.blurTimer) {
      clearTimeout(this.blurTimer);
      this.blurTimer = null;
    }
    this.callbacks.onFocusChange?.(true);
  };

  private handleBlur = () => {
    // Use a grace period: only fire if still blurred after 1.5s
    // This prevents false positives from internal element focus changes
    this.blurTimer = setTimeout(() => {
      // Double-check: if document is still visible and we're still blurred, it's real
      if (!document.hidden && document.hasFocus() === false) {
        this.callbacks.onViolation('focus_lost', 'User clicked outside the exam window');
        this.callbacks.onFocusChange?.(false);
      }
    }, this.BLUR_GRACE_MS);
  };
}
