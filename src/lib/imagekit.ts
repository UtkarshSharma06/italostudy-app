import { supabase } from '@/integrations/supabase/client';

const PUBLIC_KEY = import.meta.env.VITE_IMAGEKIT_PUBLIC_KEY;
const URL_ENDPOINT = import.meta.env.VITE_IMAGEKIT_URL_ENDPOINT;

export interface ImageKitUploadResponse {
    fileId: string;
    name: string;
    url: string;
    thumbnailUrl: string;
    height: number;
    width: number;
    size: number;
    fileType: string;
    filePath: string;
}

/**
 * secureUploadToImageKit
 * 1. Fetches an auth signature from our Supabase Edge Function
 * 2. Uploads the file directly to ImageKit via their REST API
 */
export async function secureUploadToImageKit(file: File): Promise<string> {
    if (!PUBLIC_KEY || !URL_ENDPOINT) {
        throw new Error("ImageKit configuration missing. Please check your .env variables.");
    }

    try {
        // 1. Get Authentication Signature from Supabase Edge Function
        const { data: auth, error: authError } = await supabase.functions.invoke('imagekit-auth');

        if (authError || !auth) {
            console.error("Auth Error:", authError);
            throw new Error("Failed to get ImageKit authentication signature.");
        }

        const { signature, expire, token } = auth;

        // 2. Prepare Form Data for ImageKit
        const formData = new FormData();
        formData.append("file", file);
        formData.append("fileName", file.name);
        formData.append("publicKey", PUBLIC_KEY);
        formData.append("signature", signature);
        formData.append("expire", expire.toString());
        formData.append("token", token);
        formData.append("useUniqueFileName", "true");
        formData.append("folder", "/question-media");

        // 3. Upload to ImageKit REST API
        const response = await fetch("https://upload.imagekit.io/api/v1/files/upload", {
            method: "POST",
            body: formData,
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Upload failed: ${errorText}`);
        }

        const data: ImageKitUploadResponse = await response.json();
        return data.url;
    } catch (error: any) {
        console.error("ImageKit Upload Error:", error);
        throw error;
    }
}
