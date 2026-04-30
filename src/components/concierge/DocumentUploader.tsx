import { useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import {
    Upload,
    X,
    Check,
    File,
    Loader2
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { uploadToCloudinary } from "@/lib/cloudinary";

interface DocumentUploaderProps {
    applicationId: string;
    documentType: string;
    label: string;
    onComplete?: () => void;
    currentFile?: string;
}

export function DocumentUploader({
    applicationId,
    documentType,
    label,
    onComplete,
    currentFile
}: DocumentUploaderProps) {
    const { user } = useAuth();
    const { toast } = useToast();
    const [isUploading, setIsUploading] = useState(false);
    const [progress, setProgress] = useState(0);
    const [file, setFile] = useState<File | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selected = e.target.files?.[0];
        if (selected) {
            if (selected.size > 10 * 1024 * 1024) { // 10MB limit
                toast({
                    title: "File too large",
                    description: "Please upload documents smaller than 10MB.",
                    variant: "destructive"
                });
                return;
            }
            setFile(selected);
        }
    };

    const handleUpload = async () => {
        if (!file || !user) return;

        setIsUploading(true);
        setProgress(0);

        try {
            // Upload to Cloudinary instead of Supabase Storage
            const folder = `admission-docs/${user.id}/${applicationId}`;
            const uploadResult = await uploadToCloudinary(file, folder);

            // Save metadata to database with Cloudinary URL
            const { error: dbError } = await supabase
                .from('admission_documents')
                .insert({
                    application_id: applicationId,
                    // user_id removed as it's not in the type definition (likely inferred from application_id)
                    document_type: documentType,
                    file_path: uploadResult.secure_url, // Store Cloudinary URL
                    file_name: file.name
                });

            if (dbError) throw dbError;

            toast({
                title: "Upload Successful",
                description: `${label} has been registered securely.`,
            });

            setFile(null);
            if (onComplete) onComplete();
        } catch (error: any) {
            console.error('Upload Error:', error);
            toast({
                title: "Upload Failed",
                description: error.message || "Something went wrong during the upload protocol.",
                variant: "destructive"
            });
        } finally {
            setIsUploading(false);
            setProgress(0);
        }
    };

    return (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 transition-all hover:bg-slate-50 dark:hover:bg-slate-800 group shadow-sm">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-slate-100 dark:bg-slate-800 rounded-xl flex items-center justify-center border border-slate-200 dark:border-slate-700">
                        {file ? <File className="w-5 h-5 text-indigo-600 dark:text-indigo-400" /> : <Upload className="w-5 h-5 text-slate-400 dark:text-slate-500" />}
                    </div>
                    <div>
                        {/* Changed text-white to text-slate-900 for visibility */}
                        <p className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-tight">{label}</p>
                        <p className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mt-1">
                            {file ? `${(file.size / 1024 / 1024).toFixed(2)} MB` : (currentFile ? currentFile : 'Required Document')}
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-3 w-full sm:w-auto">
                    <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileSelect}
                        className="hidden"
                        accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                    />

                    {file ? (
                        <div className="flex items-center gap-2 w-full sm:w-auto">
                            <Button
                                onClick={handleUpload}
                                disabled={isUploading}
                                className="flex-1 sm:flex-none bg-emerald-600 hover:bg-emerald-700 text-white font-black text-[9px] uppercase tracking-widest rounded-xl h-10 px-6 shadow-lg shadow-emerald-900/20"
                            >
                                {isUploading ? <Loader2 className="w-3 h-3 animate-spin mr-2" /> : <Check className="w-3 h-3 mr-2" />}
                                Confirm
                            </Button>
                            <Button
                                variant="ghost"
                                onClick={() => setFile(null)}
                                className="w-10 h-10 p-0 text-slate-400 hover:text-rose-500"
                            >
                                <X className="w-4 h-4" />
                            </Button>
                        </div>
                    ) : (
                        <Button
                            onClick={() => fileInputRef.current?.click()}
                            className="w-full sm:w-auto bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-900 dark:text-white font-black text-[9px] uppercase tracking-widest rounded-xl h-10 px-8 border border-slate-200 dark:border-slate-700 shadow-sm"
                        >
                            Select File
                        </Button>
                    )}
                </div>
            </div>

            {isUploading && (
                <div className="mt-4 h-1 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div
                        className="h-full bg-indigo-600 transition-all duration-300"
                        style={{ width: `${progress}%` }}
                    />
                </div>
            )}
        </div>
    );
}
