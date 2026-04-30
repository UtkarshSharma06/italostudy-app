import React, { useState, useCallback } from 'react';
import Cropper from 'react-easy-crop';
import { Button } from './button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from './dialog';
import { Slider } from './slider';
import { Loader2, ZoomIn, RotateCcw } from 'lucide-react';

interface ImageCropperProps {
    image: string;
    onCropComplete: (croppedImage: Blob) => void;
    onCancel: () => void;
    aspect?: number;
    circular?: boolean;
}

export function ImageCropper({ image, onCropComplete, onCancel, aspect = 1, circular = false }: ImageCropperProps) {
    const [crop, setCrop] = useState({ x: 0, y: 0 });
    const [zoom, setZoom] = useState(1);
    const [croppedAreaPixels, setCroppedAreaPixels] = useState<any>(null);
    const [isProcessing, setIsProcessing] = useState(false);

    const onCropChange = (crop: { x: number; y: number }) => {
        setCrop(crop);
    };

    const onZoomChange = (zoom: number) => {
        setZoom(zoom);
    };

    const onCropCompleteInternal = useCallback((_croppedArea: any, croppedAreaPixels: any) => {
        setCroppedAreaPixels(croppedAreaPixels);
    }, []);

    const createImage = (url: string): Promise<HTMLImageElement> =>
        new Promise((resolve, reject) => {
            const image = new Image();
            image.addEventListener('load', () => resolve(image));
            image.addEventListener('error', (error) => reject(error));
            image.setAttribute('crossOrigin', 'anonymous');
            image.src = url;
        });

    const getCroppedImg = async (
        imageSrc: string,
        pixelCrop: any
    ): Promise<Blob | null> => {
        const image = await createImage(imageSrc);
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');

        if (!ctx) return null;

        canvas.width = pixelCrop.width;
        canvas.height = pixelCrop.height;

        ctx.drawImage(
            image,
            pixelCrop.x,
            pixelCrop.y,
            pixelCrop.width,
            pixelCrop.height,
            0,
            0,
            pixelCrop.width,
            pixelCrop.height
        );

        return new Promise((resolve) => {
            canvas.toBlob((blob) => {
                resolve(blob);
            }, 'image/jpeg');
        });
    };

    const handleSave = async () => {
        if (!croppedAreaPixels) return;
        setIsProcessing(true);
        try {
            const croppedBlob = await getCroppedImg(image, croppedAreaPixels);
            if (croppedBlob) {
                onCropComplete(croppedBlob);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <Dialog open={true} onOpenChange={(open) => !open && onCancel()}>
            <DialogContent className="sm:max-w-[500px] p-0 overflow-hidden bg-slate-900 border-slate-800">
                <DialogHeader className="p-6 bg-slate-900/50 border-b border-slate-800">
                    <DialogTitle className="text-white">Crop Photo</DialogTitle>
                </DialogHeader>

                <div className="relative h-[400px] bg-black">
                    <Cropper
                        image={image}
                        crop={crop}
                        zoom={zoom}
                        aspect={aspect}
                        cropShape={circular ? 'round' : 'rect'}
                        showGrid={false}
                        onCropChange={onCropChange}
                        onCropComplete={onCropCompleteInternal}
                        onZoomChange={onZoomChange}
                    />
                </div>

                <div className="p-6 space-y-6">
                    <div className="space-y-4">
                        <div className="flex items-center gap-4">
                            <ZoomIn className="w-4 h-4 text-slate-400" />
                            <Slider
                                value={[zoom]}
                                min={1}
                                max={3}
                                step={0.1}
                                onValueChange={(value) => setZoom(value[0])}
                                className="flex-1"
                            />
                        </div>
                    </div>

                    <div className="flex justify-end gap-3">
                        <Button
                            variant="ghost"
                            onClick={onCancel}
                            className="text-slate-400 hover:text-white hover:bg-slate-800"
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={handleSave}
                            disabled={isProcessing}
                            className="bg-[#00a884] hover:bg-[#008f6f] text-white min-w-[100px]"
                        >
                            {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save'}
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
