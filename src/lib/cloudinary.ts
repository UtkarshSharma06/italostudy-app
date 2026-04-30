
/**
 * Cloudinary Upload Utility
 * Handles file uploads to Cloudinary to reduce Supabase storage egress
 */

interface CloudinaryUploadResponse {
    public_id: string;
    secure_url: string;
}

/**
 * Upload a file to Cloudinary
 * @param file - The file to upload
 * @param folder - The folder path in Cloudinary (e.g., "admission-docs/user123")
 * @returns Promise with public_id and secure_url
 */
export async function uploadToCloudinary(
    file: File,
    folder: string
): Promise<CloudinaryUploadResponse> {
    const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
    const uploadPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;

    if (!cloudName || !uploadPreset) {
        throw new Error('Cloudinary credentials are not configured in Vercel. Supabase storage fallback is disabled to prevent Cached Egress charges. Please add VITE_CLOUDINARY_CLOUD_NAME and VITE_CLOUDINARY_UPLOAD_PRESET to your Vercel project environment variables.');
    }

    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', uploadPreset);
    formData.append('folder', folder);

    // Explicitly set resource_type for better accuracy and to match allowed params
    const fileExt = file.name.split('.').pop()?.toLowerCase();
    const isImage = file.type.startsWith('image/') || ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'pdf'].includes(fileExt || '');
    const resourceType = isImage ? 'image' : 'raw';

    console.log(`[Cloudinary] Protocol: Uploading ${file.name} as ${resourceType} (${(file.size / 1024).toFixed(1)} KB)`);

    try {
        const response = await fetch(
            `https://api.cloudinary.com/v1_1/${cloudName}/${resourceType}/upload`,
            {
                method: 'POST',
                body: formData,
            }
        );

        if (!response.ok) {
            const errorData = await response.json();
            const errorMessage = errorData.error?.message || response.statusText;
            console.error('[Cloudinary] API Failure:', errorData);
            throw new Error(`Cloudinary upload failed: ${errorMessage}`);
        }

        const data = await response.json();

        return {
            public_id: data.public_id,
            secure_url: data.secure_url,
        };
    } catch (error) {
        console.error('Cloudinary upload error:', error);
        throw error;
    }
}
