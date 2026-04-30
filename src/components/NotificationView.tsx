import { Check, Bell, X } from 'lucide-react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { useLocation, useNavigate } from 'react-router-dom';

// VisuallyHidden component for accessibility
const VisuallyHidden = ({ children }: { children: React.ReactNode }) => (
    <span className="sr-only">{children}</span>
);

interface NotificationViewProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    content: string;
    content_type?: 'html' | 'image';
    image_url?: string;
    created_at?: string;
    short_description?: string;
    show_minimal?: boolean;
    button_label?: string | null;
    link_url?: string | null;
    link_type?: string | null;
}

export default function NotificationView({
    isOpen,
    onClose,
    title,
    content,
    content_type = 'html',
    image_url,
    created_at,
    show_minimal = false,
    button_label,
    link_url,
    link_type = 'internal'
}: NotificationViewProps) {
    const { pathname } = useLocation();
    const navigate = useNavigate();
    const isMockTest = pathname.includes('/test/') || pathname.includes('/mock-guidelines');

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className={cn(
                "max-w-[440px] w-[95%] p-0 overflow-hidden border border-slate-100 dark:border-border bg-white dark:bg-card rounded-lg shadow-[0_24px_64px_-12px_rgba(0,0,0,0.08)] flex flex-col max-h-[85vh] [&>button]:hidden",
                isMockTest 
                    ? "top-[50%] translate-y-[-50%]" 
                    : "top-auto bottom-6 translate-y-0"
            )}>
                <VisuallyHidden>
                    <DialogTitle>{title || 'Notification'}</DialogTitle>
                </VisuallyHidden>

                <motion.div
                    initial={{ opacity: 0, scale: 0.98, y: 15 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
                    className="flex flex-col h-auto max-h-full overflow-hidden"
                >
                    <div className={cn(
                        "flex flex-col h-auto max-h-full w-full overflow-hidden",
                        show_minimal ? "p-0" : "pt-2 px-2 pb-2 md:pt-3 md:px-4 md:pb-4"
                    )}>
                        {/* 1. Header Section - Fixed & Centered */}
                        {!show_minimal && title && (
                            <div className="shrink-0 mb-6 mt-0 w-full flex justify-center">
                                <div className="relative w-full flex items-center justify-between gap-3 px-5 py-4 bg-white dark:bg-slate-900 rounded-2xl shadow-[0_15px_45px_-10px_rgba(0,0,0,0.15),inset_0_-8px_12px_rgba(0,0,0,0.04),0_1px_2px_rgba(0,0,0,0.05)] border border-slate-50 dark:border-border group overflow-hidden">
                                    <div className="absolute inset-0 bg-gradient-to-br from-white via-indigo-50/30 to-slate-50/60 dark:from-slate-900 dark:via-indigo-900/10 dark:to-slate-900 rounded-2xl" />
                                    <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-indigo-200/50 to-transparent opacity-50" />

                                    <div className="relative flex flex-col gap-0.5 flex-1 min-w-0">
                                        <h3 className="text-lg md:text-2xl font-[1000] text-slate-900 dark:text-slate-100 tracking-tighter leading-tight uppercase truncate">
                                            {title}
                                        </h3>
                                        {created_at && (
                                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none">
                                                {format(new Date(created_at), 'MMMM d, yyyy')}
                                            </p>
                                        )}
                                    </div>

                                    <button
                                        onClick={onClose}
                                        className="relative shrink-0 p-2 bg-indigo-50 dark:bg-indigo-900/20 rounded-full border border-indigo-100/50 dark:border-indigo-500/20 shadow-sm hover:bg-indigo-100 dark:hover:bg-indigo-900/40 transition-colors group/close"
                                    >
                                        <X className="w-4 h-4 text-indigo-600 group-hover:rotate-90 transition-transform duration-300" />
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* 2. Content Section - Scrollable */}
                        <div className={cn(
                            "flex-1 overflow-y-auto custom-scrollbar min-h-0 w-full",
                            show_minimal ? "" : "px-0 pb-4"
                        )}>
                            {content_type === 'image' && image_url ? (
                                <div className="w-full relative min-h-[100px] flex items-center justify-center bg-slate-50/30 rounded-3xl overflow-hidden mb-2">
                                    <img
                                        src={image_url}
                                        alt={title || "Notification"}
                                        className="w-full h-auto rounded-3xl shadow-xl mx-auto block object-contain animate-in fade-in duration-500"
                                        onLoad={(e) => (e.currentTarget.parentElement!.style.minHeight = '0')}
                                    />
                                </div>
                            ) : (
                                <div
                                    className={cn(
                                        "w-full overflow-x-hidden break-words",
                                        !show_minimal && "prose prose-sm dark:prose-invert prose-headings:font-black prose-p:text-slate-600 prose-img:rounded-3xl prose-img:mx-auto prose-strong:text-indigo-600 font-bold leading-relaxed text-center px-1"
                                    )}
                                    dangerouslySetInnerHTML={{ __html: content }}
                                />
                            )}
                        </div>

                        {/* 3. Action Section - Pinned Bottom */}
                        <div className={`shrink-0 w-full flex flex-col gap-1.5 justify-center ${show_minimal ? 'pb-3 pt-1' : 'pt-2 mt-2 border-t border-slate-50/30'}`}>
                            {button_label && link_url ? (
                                <button
                                    onClick={() => {
                                        if (link_type === 'external') {
                                            window.open(link_url, '_blank');
                                        } else {
                                            navigate(link_url);
                                            onClose();
                                        }
                                    }}
                                    className="cssbuttons-io-button mx-auto"
                                >
                                    {button_label}
                                    <div className="icon">
                                        <svg height="24" width="24" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                            <path d="M0 0h24v24H0z" fill="none"></path>
                                            <path d="M16.172 11l-5.364-5.364 1.414-1.414L20 12l-7.778 7.778-1.414-1.414L16.172 13H4v-2z" fill="currentColor"></path>
                                        </svg>
                                    </div>
                                </button>
                            ) : (
                                <button
                                    onClick={onClose}
                                    className="cssbuttons-io-button mx-auto"
                                >
                                    Understood
                                    <div className="icon">
                                        <svg height="24" width="24" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                            <path d="M0 0h24v24H0z" fill="none"></path>
                                            <path d="M16.172 11l-5.364-5.364 1.414-1.414L20 12l-7.778 7.778-1.414-1.414L16.172 13H4v-2z" fill="currentColor"></path>
                                        </svg>
                                    </div>
                                </button>
                            )}

                            {button_label && link_url && (
                                <button
                                    onClick={onClose}
                                    className="w-full md:w-fit mx-auto px-6 py-1.5 text-[9px] font-black text-rose-500/70 hover:text-rose-600 uppercase tracking-[0.2em] transition-all hover:bg-rose-50/30 rounded-lg active:scale-95"
                                >
                                    Dismiss
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Always Visible Close Button (Top Right) */}
                    <button
                        onClick={onClose}
                        className="absolute top-4 right-4 p-2.5 bg-white/90 dark:bg-slate-800/90 backdrop-blur-md rounded-full border border-slate-200 dark:border-slate-700 shadow-xl hover:bg-white dark:hover:bg-slate-700 transition-all z-[100] group/close flex items-center justify-center active:scale-90"
                    >
                        <X className="w-5 h-5 text-slate-500 group-hover:rotate-90 transition-transform duration-300" />
                    </button>
                </motion.div>
            </DialogContent>
        </Dialog>
    );
}
