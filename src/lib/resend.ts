import { supabase } from "@/integrations/supabase/client";

export interface SendEmailPayload {
    from?: string;
    to: string | string[];
    subject: string;
    html: string;
    cc?: string | string[];
    bcc?: string | string[];
    reply_to?: string;
    attachments?: Array<{
        filename: string;
        content: string; // Base64 or string content
    }>;
}

export const sendEmail = async (payload: SendEmailPayload) => {
    const { data, error } = await supabase.functions.invoke('send-email', {
        body: payload
    });

    if (error) {
        console.error("Error calling send-email function:", error);
        throw new Error(error.message || "Failed to send email via edge function");
    }

    return data;
};
