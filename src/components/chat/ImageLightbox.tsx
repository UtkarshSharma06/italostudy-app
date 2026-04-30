import React, { useState, useEffect } from 'react';
import { X, ChevronLeft, ChevronRight, Download, ZoomIn, ZoomOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getOptimizedImageUrl } from '@/lib/image-optimizer';

interface ImageLightboxProps {
    images: string[];
    initialIndex: number;
    onClose: () => void;
}

export function ImageLightbox({ images, initialIndex, onClose }: ImageLightboxProps) {
    const [currentIndex, setCurrentIndex] = useState(initialIndex);
    const [zoom, setZoom] = useState(1);

    useEffect(() => {
        const handleKeyPress = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
            if (e.key === 'ArrowLeft') goToPrevious();
            if (e.key === 'ArrowRight') goToNext();
        };

        document.addEventListener('keydown', handleKeyPress);
        return () => document.removeEventListener('keydown', handleKeyPress);
    }, [currentIndex]);

    const goToNext = () => {
        if (currentIndex < images.length - 1) {
            setCurrentIndex(currentIndex + 1);
            setZoom(1);
        }
    };

    const goToPrevious = () => {
        if (currentIndex > 0) {
            setCurrentIndex(currentIndex - 1);
            setZoom(1);
        }
    };

    const handleDownload = () => {
        const link = document.createElement('a');
        link.href = images[currentIndex];
        link.download = `image-${currentIndex + 1}.jpg`;
        link.click();
    };

    return (
        <div className="fixed inset-0 z-[200] bg-black/95 flex items-center justify-center animate-in fade-in duration-200">
            {/* Header */}
            <div className="absolute top-0 left-0 right-0 p-4 flex items-center justify-between bg-gradient-to-b from-black/80 to-transparent z-10">
                <div className="text-white text-sm font-medium">
                    {currentIndex + 1} / {images.length}
                </div>
                <div className="flex items-center gap-2">
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setZoom(Math.max(0.5, zoom - 0.25))}
                        className="text-white hover:bg-white/10"
                    >
                        <ZoomOut className="w-5 h-5" />
                    </Button>
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setZoom(Math.min(3, zoom + 0.25))}
                        className="text-white hover:bg-white/10"
                    >
                        <ZoomIn className="w-5 h-5" />
                    </Button>
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={handleDownload}
                        className="text-white hover:bg-white/10"
                    >
                        <Download className="w-5 h-5" />
                    </Button>
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={onClose}
                        className="text-white hover:bg-white/10"
                    >
                        <X className="w-5 h-5" />
                    </Button>
                </div>
            </div>

            {/* Image */}
            <div className="relative w-full h-full flex items-center justify-center p-16">
                <img
                    src={getOptimizedImageUrl(images[currentIndex], 1600)}
                    alt={`Image ${currentIndex + 1}`}
                    className="max-w-full max-h-full object-contain transition-transform duration-200"
                    style={{ transform: `scale(${zoom})` }}
                />
            </div>

            {/* Navigation Arrows */}
            {currentIndex > 0 && (
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={goToPrevious}
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-white hover:bg-white/10 h-12 w-12"
                >
                    <ChevronLeft className="w-8 h-8" />
                </Button>
            )}
            {currentIndex < images.length - 1 && (
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={goToNext}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-white hover:bg-white/10 h-12 w-12"
                >
                    <ChevronRight className="w-8 h-8" />
                </Button>
            )}

            {/* Click overlay to close */}
            <div
                className="absolute inset-0 -z-10"
                onClick={onClose}
            />
        </div>
    );
}
