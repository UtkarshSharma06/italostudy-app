import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Calendar, X } from 'lucide-react';

interface SeriesScheduleModalProps {
    isOpen: boolean;
    onClose: () => void;
    series: {
        title: string;
        schedule_info: string;
    } | null;
}

export const SeriesScheduleModal: React.FC<SeriesScheduleModalProps> = ({ isOpen, onClose, series }) => {
    return (
        <AnimatePresence>
            {isOpen && series && (
                <motion.div 
                    initial={{ opacity: 0 }} 
                    animate={{ opacity: 1 }} 
                    exit={{ opacity: 0 }} 
                    className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md" 
                    onClick={onClose}
                >
                    <motion.div 
                        initial={{ scale: 0.9, y: 20 }} 
                        animate={{ scale: 1, y: 0 }} 
                        exit={{ scale: 0.9, y: 20 }} 
                        className="bg-white dark:bg-slate-900 w-full max-w-2xl mx-auto rounded-3xl sm:rounded-[2.5rem] shadow-2xl overflow-hidden" 
                        onClick={e => e.stopPropagation()}
                    >
                        <div className="p-6 sm:p-8 border-b border-slate-50 dark:border-slate-800 flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-900/20 flex items-center justify-center text-indigo-600">
                                    <Calendar className="w-5 h-5 sm:w-6 sm:h-6" />
                                </div>
                                <div>
                                    <h2 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight">Series Schedule</h2>
                                    <p className="text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-widest">{series.title}</p>
                                </div>
                            </div>
                            <Button variant="ghost" size="icon" onClick={onClose}>
                                <X className="w-5 h-5" />
                            </Button>
                        </div>
                        <div className="p-6 sm:p-10 max-h-[70vh] sm:max-h-[60vh] overflow-y-auto custom-scrollbar">
                            <div 
                                className="prose prose-slate dark:prose-invert max-w-none prose-p:text-sm prose-p:leading-relaxed prose-li:text-sm overflow-x-auto" 
                                dangerouslySetInnerHTML={{ __html: series.schedule_info }} 
                            />
                        </div>
                        <div className="p-8 bg-slate-50 dark:bg-slate-800/50 flex justify-end">
                            <Button onClick={onClose} className="bg-slate-900 text-white rounded-2xl px-8 h-12 text-xs font-black uppercase tracking-widest">
                                Close Schedule
                            </Button>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};
