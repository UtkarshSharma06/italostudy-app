import { useState, useRef, useEffect, CSSProperties } from 'react';
import { getOptimizedImageUrl } from '@/lib/image-optimizer';
import { cn } from '@/lib/utils';

interface OptimizedImageProps {
  src: string | null | undefined;
  alt: string;
  width?: number;
  height?: number;
  quality?: number;
  className?: string;
  style?: CSSProperties;
  // If true, renders a responsive srcset for multiple viewport sizes
  responsive?: boolean;
  // Shows a shimmer skeleton while loading
  skeleton?: boolean;
  // Fill parent container (like CSS object-fit: cover)
  fill?: boolean;
  // Priority: if true, skips lazy loading (use for LCP hero images only)
  priority?: boolean;
  onError?: () => void;
  onClick?: () => void;
}

/**
 * OptimizedImage — A production-grade image component with:
 *  - Automatic ImageKit URL optimization (resize + quality + WebP)
 *  - Native lazy loading (IntersectionObserver)
 *  - Blur-up progressive loading (tiny placeholder → full image)
 *  - Responsive srcset for different viewport sizes
 *  - Skeleton shimmer placeholder
 *  - No render-blocking, zero dependencies
 */
export function OptimizedImage({
  src,
  alt,
  width = 800,
  height,
  quality = 80,
  className,
  style,
  responsive = true,
  skeleton = true,
  fill = false,
  priority = false,
  onError,
  onClick,
}: OptimizedImageProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isInView, setIsInView] = useState(priority); // priority images load immediately
  const [hasError, setHasError] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

  // IntersectionObserver: only load the full image when near the viewport
  useEffect(() => {
    if (priority || isInView) return;
    
    const el = imgRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
          observer.disconnect();
        }
      },
      { rootMargin: '200px' } // Start loading 200px before entering viewport
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [priority, isInView]);

  if (!src) {
    return (
      <div
        className={cn(
          'bg-slate-100 dark:bg-slate-800 rounded-lg flex items-center justify-center',
          fill && 'absolute inset-0',
          className
        )}
        style={style}
      >
        <span className="text-[10px] font-black uppercase text-slate-300 tracking-widest">No Image</span>
      </div>
    );
  }

  // Generate the optimized URL for the primary size
  const optimizedSrc = getOptimizedImageUrl(src, width, height, quality);

  // Generate a tiny blur placeholder (32px wide) for blur-up effect
  const placeholderSrc = getOptimizedImageUrl(src, 32, undefined, 20);

  // Generate responsive srcset (if enabled)
  const srcSet = responsive
    ? [
        `${getOptimizedImageUrl(src, 400, undefined, quality)} 400w`,
        `${getOptimizedImageUrl(src, 800, undefined, quality)} 800w`,
        `${getOptimizedImageUrl(src, 1200, undefined, quality)} 1200w`,
        `${getOptimizedImageUrl(src, 1600, undefined, quality)} 1600w`,
      ].join(', ')
    : undefined;

  const handleLoad = () => setIsLoaded(true);
  const handleError = () => {
    setHasError(true);
    onError?.();
  };

  return (
    <div
      className={cn(
        'relative overflow-hidden',
        fill ? 'absolute inset-0' : '',
        !fill && height ? '' : 'w-full',
        className
      )}
      style={!fill && height ? { aspectRatio: `${width}/${height}`, ...style } : style}
      onClick={onClick}
    >
      {/* Skeleton shimmer shown before image loads */}
      {skeleton && !isLoaded && !hasError && (
        <div className="absolute inset-0 bg-slate-100 dark:bg-slate-800 animate-pulse">
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full animate-[shimmer_1.5s_infinite]" />
        </div>
      )}

      {/* Blur placeholder (visible while main image loads) */}
      {!isLoaded && !hasError && isInView && (
        <img
          src={placeholderSrc}
          alt=""
          aria-hidden="true"
          className="absolute inset-0 w-full h-full object-cover blur-md scale-110 transition-opacity duration-300"
          style={{ opacity: isLoaded ? 0 : 1 }}
        />
      )}

      {/* Main image — only starts loading when in view */}
      <img
        ref={imgRef}
        src={isInView ? optimizedSrc : undefined}
        srcSet={isInView && responsive ? srcSet : undefined}
        sizes={responsive ? '(max-width: 400px) 400px, (max-width: 800px) 800px, (max-width: 1200px) 1200px, 1600px' : undefined}
        alt={alt}
        loading={priority ? 'eager' : 'lazy'}
        decoding="async"
        onLoad={handleLoad}
        onError={handleError}
        className={cn(
          'w-full h-full object-cover transition-opacity duration-500',
          isLoaded ? 'opacity-100' : 'opacity-0'
        )}
      />

      {/* Error fallback */}
      {hasError && (
        <div className="absolute inset-0 bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
          <span className="text-[10px] font-black uppercase text-slate-300 tracking-widest">Failed</span>
        </div>
      )}
    </div>
  );
}

export default OptimizedImage;
