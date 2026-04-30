import { DocumentUploader } from "@/components/concierge/DocumentUploader";
import { AlertCircle } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

interface StepDocumentsProps {
    applicationId: string;
    // We don't need data/onChange here as documents are handled separately via their own table
}

export function StepDocuments({ applicationId }: StepDocumentsProps) {

    const requiredDocs = [
        { id: 'passport', label: 'Passport (or Government ID)' },
        { id: 'academic_transcripts', label: 'Academic Transcripts (latest available)' },
        { id: 'degree_certificate', label: 'Degree Certificate / Provisional Certificate' },
        { id: 'cv', label: 'Resume / Curriculum Vitae (CV)' },
        { id: 'english_proficiency', label: 'English Proficiency Test Score (IELTS/TOEFL/PTE)' },
        { id: 'sop', label: 'Statement of Purpose (SOP)' },
    ];

    const [uploadedDocs, setUploadedDocs] = useState<Record<string, string>>({});

    useEffect(() => {
        const fetchDocuments = async () => {
            const { data, error } = await supabase
                .from('admission_documents')
                .select('document_type, file_name')
                .eq('application_id', applicationId);

            if (error) {
                console.error('Error fetching docs:', error);
            }

            if (data) {
                // Documents retrieved successfully
                const docs: Record<string, string> = {};
                data.forEach((doc: any) => {
                    docs[doc.document_type] = doc.file_name;
                });
                setUploadedDocs(docs);
            }
        };

        fetchDocuments();
    }, [applicationId]);

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900 p-4 rounded-xl flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-indigo-600 dark:text-indigo-400 mt-0.5" />
                <p className="text-sm text-indigo-700 dark:text-indigo-300">
                    Upload clear, scanned copies of your original documents. You can come back and add more documents later from the dashboard.
                </p>
            </div>

            <div className="grid gap-4">
                {requiredDocs.map((doc) => (
                    <DocumentUploader
                        key={doc.id}
                        applicationId={applicationId}
                        documentType={doc.id}
                        label={doc.label}
                        currentFile={uploadedDocs[doc.id]}
                        onComplete={() => {
                            // Refresh list
                            const fetchDocuments = async () => {
                                const { data } = await supabase
                                    .from('admission_documents')
                                    .select('document_type, file_name')
                                    .eq('application_id', applicationId);
                                if (data) {
                                    const docs: Record<string, string> = {};
                                    data.forEach((doc: any) => {
                                        docs[doc.document_type] = doc.file_name;
                                    });
                                    setUploadedDocs(docs);
                                }
                            };
                            fetchDocuments();
                        }}
                    />
                ))}
            </div>
        </div>
    );
}
