import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useExam } from '@/context/ExamContext';

export function useGamification(userId: string | undefined) {
    const [xp, setXp] = useState(0); // XP maps to total questions solved
    const [stars, setStars] = useState(0); // Stars maps to mock exams taken
    const [streak, setStreak] = useState(0); // Real streak based on active dates
    const { activeExam } = useExam();

    useEffect(() => {
        if (!userId || !activeExam?.id) return;
        
        let isMounted = true;
        const abortController = new AbortController();
        
        async function fetchRealStats() {
            try {
                const [summaryStatsRes, mockSubmissionsRes, testsRes, learningProgressRes] = await Promise.all([
                    (supabase as any).rpc('get_student_summary_stats_secure', {
                        user_uuid: String(userId),
                        exam_type_id: String(activeExam.id)
                    }),
                    supabase.from('mock_exam_submissions').select('id').eq('user_id', userId).abortSignal(abortController.signal),
                    supabase.from('tests').select('created_at').eq('exam_type', activeExam.id).eq('user_id', userId).abortSignal(abortController.signal),
                    supabase.from('learning_progress').select('last_accessed_at').eq('user_id', userId).abortSignal(abortController.signal)
                ]);

                if (!isMounted) return;

                // XP (Solved Questions)
                const totalSolved = (summaryStatsRes.data as any)?.total_questions_solved || 0;
                setXp(totalSolved);

                // Stars (Mock Exams)
                const mockExamsCount = mockSubmissionsRes.data?.length || 0;
                setStars(mockExamsCount);

                // Streak Computation (Exact match with Dashboard logic)
                const getUTCDateString = (date: Date) => date.toISOString().split('T')[0];
                const activeDatesSet = new Set([
                    ...(testsRes.data || []).map((t: any) => getUTCDateString(new Date(t.created_at))),
                    ...(learningProgressRes.data || []).map((p: any) => getUTCDateString(new Date(p.last_accessed_at)))
                ]);

                let currentStreak = 0;
                const now = new Date();
                const today = getUTCDateString(now);
                const yesterdayDate = new Date(now);
                yesterdayDate.setUTCDate(yesterdayDate.getUTCDate() - 1);
                const yesterday = getUTCDateString(yesterdayDate);

                if (activeDatesSet.has(today)) {
                    let check = new Date(now);
                    while (activeDatesSet.has(getUTCDateString(check))) {
                        currentStreak++;
                        check.setUTCDate(check.getUTCDate() - 1);
                    }
                } else if (activeDatesSet.has(yesterday)) {
                    let check = new Date(yesterdayDate);
                    while (activeDatesSet.has(getUTCDateString(check))) {
                        currentStreak++;
                        check.setUTCDate(check.getUTCDate() - 1);
                    }
                }
                
                setStreak(currentStreak);

            } catch (error) {
                console.error("Failed to fetch real gamification stats", error);
            }
        }
        
        fetchRealStats();
        
        return () => {
            isMounted = false;
            abortController.abort();
        };
    }, [userId, activeExam?.id]);

    const level = Math.floor(xp / 100) + 1;
    const currentLevelXp = xp % 100;
    const nextLevelTotalXp = level * 100; // e.g. Level 2 needs 200 total XP
    const progressPercent = (currentLevelXp / 100) * 100;

    const addXp = (amount: number) => {
        // Optimistic local update
        setXp(prev => prev + amount);
    };

    return { xp, stars, streak, level, currentLevelXp, nextLevelTotalXp, progressPercent, addXp };
}

