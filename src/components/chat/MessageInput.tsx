import { useState, useRef, ChangeEvent } from "react";
import { Send, Paperclip, X, Loader2, FileIcon, Image as ImageIcon, Plus, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ImageCropper } from "@/components/ui/ImageCropper";

interface MessageInputProps {
    onSend: (content: string | null, files: File[]) => Promise<void>;
    replyTo: { id: string; user: string; content: string } | null;
    onCancelReply: () => void;
    disabled?: boolean;
}

export function MessageInput({ onSend, replyTo, onCancelReply, disabled }: MessageInputProps) {
    const [content, setContent] = useState("");
    const [files, setFiles] = useState<File[]>([]);
    const [isSending, setIsSending] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Cropper State
    const [selectedImage, setSelectedImage] = useState<string | null>(null);
    const [isCropperOpen, setIsCropperOpen] = useState(false);
    const [croppingIndex, setCroppingIndex] = useState<number | null>(null);

    const handleFileSelect = (e: ChangeEvent<HTMLInputElement>) => {
        const selectedFiles = Array.from(e.target.files || []);
        if (selectedFiles.length > 0) {
            setFiles(prev => [...prev, ...selectedFiles]);
            // Clear input to allow re-selection
            if (fileInputRef.current) fileInputRef.current.value = "";
        }
    };

    const handleCropClick = (index: number) => {
        const file = files[index];
        if (file && file.type.startsWith('image/')) {
            const reader = new FileReader();
            reader.onload = () => {
                setSelectedImage(reader.result as string);
                setCroppingIndex(index);
                setIsCropperOpen(true);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleCropComplete = (croppedBlob: Blob) => {
        if (croppingIndex !== null) {
            const croppedFile = new File([croppedBlob], files[croppingIndex].name, { type: "image/jpeg" });
            setFiles(prev => {
                const newFiles = [...prev];
                newFiles[croppingIndex] = croppedFile;
                return newFiles;
            });
        }
        setIsCropperOpen(false);
        setSelectedImage(null);
        setCroppingIndex(null);
    };

    const handleSend = async () => {
        if ((!content.trim() && files.length === 0) || isSending) return;

        setIsSending(true);
        try {
            await onSend(content.trim() || null, files);
            setContent("");
            setFiles([]);
            if (fileInputRef.current) fileInputRef.current.value = "";
        } finally {
            setIsSending(false);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    return (
        <div className="w-full">
            {/* Reply Context */}
            {replyTo && (
                <div className="mx-2 mb-2 p-2 bg-white dark:bg-slate-900 rounded-lg border-l-4 border-indigo-500 shadow-sm flex items-center justify-between animate-in slide-in-from-bottom-2">
                    <div className="flex flex-col text-xs min-w-0 px-2">
                        <span className="font-bold text-indigo-600">{replyTo.user}</span>
                        <span className="truncate text-slate-500">{replyTo.content}</span>
                    </div>
                    <Button variant="ghost" size="icon" className="h-6 w-6 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800" onClick={onCancelReply}>
                        <X className="h-3 w-3" />
                    </Button>
                </div>
            )}

            {/* File Previews */}
            {files.length > 0 && (
                <div className="mx-2 mb-2 p-3 bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 flex flex-wrap gap-3 animate-in fade-in slide-in-from-bottom-2">
                    {files.map((f, index) => (
                        <div key={`${f.name}-${index}`} className="relative group w-20 h-20 rounded-xl overflow-hidden bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 shadow-sm transition-all hover:border-indigo-500">
                            {f.type.startsWith('image/') ? (
                                <div
                                    className="w-full h-full cursor-pointer"
                                    onClick={() => handleCropClick(index)}
                                >
                                    <img
                                        src={URL.createObjectURL(f)}
                                        alt="preview"
                                        className="w-full h-full object-cover"
                                        onLoad={(e) => {
                                            // Handle memory cleanup if needed, but for now this is fine for small number of previews
                                        }}
                                    />
                                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                        <div className="p-1 rounded bg-white/20 backdrop-blur-sm">
                                            <Pencil className="w-4 h-4 text-white" />
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="w-full h-full flex flex-col items-center justify-center p-2 text-center overflow-hidden">
                                    <FileIcon className="h-6 w-6 text-indigo-500 mb-1" />
                                    <p className="text-[10px] font-bold text-slate-500 truncate w-full px-1">{f.name}</p>
                                </div>
                            )}
                            <button
                                onClick={() => {
                                    setFiles(prev => prev.filter((_, i) => i !== index));
                                }}
                                className="absolute top-1 right-1 h-5 w-5 rounded-full bg-slate-900/80 text-white flex items-center justify-center hover:bg-red-500 transition-colors z-10"
                            >
                                <X className="h-3 w-3" />
                            </button>
                        </div>
                    ))}

                    {/* Add more button */}
                    <button
                        onClick={() => fileInputRef.current?.click()}
                        className="w-20 h-20 rounded-xl border-2 border-dashed border-slate-200 dark:border-slate-700 flex flex-col items-center justify-center text-slate-400 hover:border-indigo-400 hover:text-indigo-500 transition-all active:scale-95"
                    >
                        <Plus className="w-6 h-6 mb-1" />
                        <span className="text-[10px] font-black uppercase tracking-widest">More</span>
                    </button>
                </div>
            )}

            <div className="flex items-end gap-2 px-2 py-1">
                <input
                    type="file"
                    multiple
                    ref={fileInputRef}
                    className="hidden"
                    onChange={handleFileSelect}
                    accept="image/*,.pdf,.doc,.docx"
                />

                <Button
                    variant="ghost"
                    size="icon"
                    className="shrink-0 h-10 w-10 rounded-full text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={disabled || isSending}
                >
                    <Paperclip className="h-5 w-5" />
                </Button>

                <div className="flex-1 bg-white dark:bg-slate-900 rounded-2xl border border-white dark:border-slate-800 shadow-sm focus-within:ring-1 focus-within:ring-indigo-500/30 flex items-center min-h-[40px]">
                    <Textarea
                        value={content}
                        onChange={(e) => setContent(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder={files.length > 0 ? "Add a caption..." : "Type a message..."}
                        className="flex-1 min-h-[40px] max-h-32 py-2.5 px-4 resize-none border-0 shadow-none focus-visible:ring-0 bg-transparent text-slate-800 dark:text-slate-100 placeholder:text-slate-400 text-[15px] leading-6"
                        disabled={disabled || isSending}
                        rows={1}
                    />
                </div>

                <Button
                    onClick={handleSend}
                    disabled={(!content.trim() && files.length === 0) || isSending || disabled}
                    className={`shrink-0 h-10 w-10 rounded-full transition-all duration-200 ${(!content.trim() && files.length === 0)
                        ? 'bg-slate-200 dark:bg-slate-800 text-slate-400'
                        : 'bg-[#00a884] hover:bg-[#008f6f] text-white shadow-md hover:shadow-lg transform hover:scale-105 active:scale-95'}`}
                >
                    {isSending ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5 ml-0.5" />}
                </Button>
            </div>

            {isCropperOpen && selectedImage && (
                <ImageCropper
                    image={selectedImage}
                    onCropComplete={handleCropComplete}
                    onCancel={() => {
                        setIsCropperOpen(false);
                        setSelectedImage(null);
                        setCroppingIndex(null);
                    }}
                />
            )}
        </div>
    );
}
