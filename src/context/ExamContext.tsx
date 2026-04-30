import React, { createContext, useContext, useState, useEffect } from 'react';
import { ExamConfig, EXAMS } from '../config/exams';
import { useAuth } from '../lib/auth';
import { supabase } from '@/integrations/supabase/client';

interface ExamContextType {
    activeExam: ExamConfig | null;
    setActiveExam: (examId: string) => Promise<void>;
    allExams: Record<string, ExamConfig>;
    isLoading: boolean;
    refreshExams: () => Promise<Record<string, ExamConfig>>;
}

const ExamContext = createContext<ExamContextType | undefined>(undefined);

// ─── Exam Cache ──────────────────────────────────────────────────────────────
// Exam structure (sections, scoring, syllabus) almost never changes.
// Cache it in localStorage for 1 hour to eliminate a Supabase call on every navigation.
const EXAM_CACHE_KEY = 'italostudy_exams_cache';
const EXAM_CACHE_TTL = 1000 * 60 * 60; // 1 hour

function readExamCache(): Record<string, ExamConfig> | null {
    try {
        const raw = localStorage.getItem(EXAM_CACHE_KEY);
        if (!raw) return null;
        const { data, cachedAt } = JSON.parse(raw);
        if (Date.now() - cachedAt > EXAM_CACHE_TTL) {
            localStorage.removeItem(EXAM_CACHE_KEY);
            return null;
        }
        return data;
    } catch {
        return null;
    }
}

function writeExamCache(data: Record<string, ExamConfig>) {
    try {
        localStorage.setItem(EXAM_CACHE_KEY, JSON.stringify({ data, cachedAt: Date.now() }));
    } catch { /* quota full — silent fail */ }
}

export const ExamProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { profile, loading: authLoading } = useAuth();
    const [allExams, setAllExams] = useState<Record<string, ExamConfig>>({});
    const [activeExam, setActiveExamState] = useState<ExamConfig | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    const fetchAllExams = async (bypassCache = false) => {
        // Serve from cache if fresh and not forced
        if (!bypassCache) {
            const cached = readExamCache();
            if (cached && Object.keys(cached).length > 0) {
                setAllExams(cached);
                return cached;
            }
        }

        try {
            const { data, error } = await supabase.from('exams').select('*');
            if (error) throw error;

            const examsMap: Record<string, ExamConfig> = {};
            data?.forEach(exam => {
                examsMap[exam.slug] = {
                    id: exam.slug,
                    name: exam.name,
                    durationMinutes: exam.duration_minutes,
                    totalQuestions: exam.total_questions,
                    proctored: exam.proctored,
                    scoring: exam.scoring as any,
                    sections: exam.sections as any,
                    syllabus: exam.syllabus as any,
                    isLive: exam.is_live,
                    isSoon: exam.is_soon,
                    bgGradient: (exam as any).bg_gradient
                } as any;
            });
            setAllExams(examsMap);
            writeExamCache(examsMap); // Persist for next visit
            return examsMap;
        } catch (error) {
            console.error('Error fetching exams:', error);
            return {};
        }
    };

    // Initial Sync from Profile or LocalStorage
    useEffect(() => {
        const init = async () => {
            const examsMap = await fetchAllExams();

            if (!authLoading) {
                const savedExamId = localStorage.getItem('activeExamId');
                const profileExamId = profile?.selected_exam;

                // Priority: Profile > LocalStorage > Default
                const targetExamId = profileExamId || savedExamId || 'cent-s-prep';

                if (examsMap[targetExamId]) {
                    setActiveExamState(examsMap[targetExamId]);
                } else if (Object.keys(examsMap).length > 0) {
                    setActiveExamState(Object.values(examsMap)[0]);
                }
                setIsLoading(false);
            }
        };
        init();
    }, [authLoading, profile?.selected_exam]);

    const setActiveExam = async (examId: string) => {
        if (allExams[examId]) {
            setActiveExamState(allExams[examId]);
            localStorage.setItem('activeExamId', examId);

            if (profile?.id) {
                await supabase
                    .from('profiles')
                    .update({ selected_exam: examId })
                    .eq('id', profile.id);
            }
        }
    };

    return (
        <ExamContext.Provider value={{
            activeExam,
            setActiveExam,
            allExams,
            isLoading: isLoading || authLoading,
            refreshExams: () => fetchAllExams(true) // Always bypass cache on manual refresh
        }}>
            {children}
        </ExamContext.Provider>
    );
};

export const useExam = () => {
    const context = useContext(ExamContext);
    if (context === undefined) {
        throw new Error('useExam must be used within an ExamProvider');
    }
    return context;
};
