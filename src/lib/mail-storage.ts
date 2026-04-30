import { supabase } from "@/integrations/supabase/client";
import { uploadToCloudinary } from "@/lib/cloudinary";

/**
 * Uploads email content (HTML/Text) to Supabase Storage
 */
export const uploadEmailContent = async (key: string, content: string, contentType: string = 'text/html') => {
    try {
        const file = new File([content], key, { type: contentType });
        const result = await uploadToCloudinary(file, 'emails');
        return result.secure_url;
    } catch (error) {
        console.error("Error uploading to Cloudinary:", error);
        throw error;
    }
};

/**
 * Retrieves email content from Supabase Storage
 */
export const fetchEmailContent = async (key: string) => {
    const { data, error } = await supabase.storage
        .from('email-content')
        .download(key);

    if (error) {
        console.error("Error fetching from Supabase Storage:", error);
        throw error;
    }

    return await data.text();
};

/**
 * Generates a public URL for the email content (if the bucket is public)
 */
export const getEmailContentUrl = (key: string) => {
    const { data } = supabase.storage
        .from('email-content')
        .getPublicUrl(key);

    return data.publicUrl;
};
