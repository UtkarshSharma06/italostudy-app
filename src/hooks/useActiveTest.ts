import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { useExam } from '@/context/ExamContext';
import { EXAMS } from '@/config/exams';

interface ActiveTest {
    id: string;
    subject: string;
    time_remaining_seconds: number;
    total_questions: number;
    exam_type: string;
    is_mock: boolean;
    started_at: string;
    current_section?: number;
}

export function useActiveTest() {
    const { user } = useAuth();
    const { activeExam } = useExam();
    const [activeTest, setActiveTest] = useState<ActiveTest | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    const checkActiveTest = useCallback(async () => {
        if (!user) return;

        const { data, error } = await supabase
            .from('tests')
            .select('*, mock_sessions:session_id(title)')
            .eq('user_id', user.id)
            .eq('status', 'in_progress')
            .or('is_mock.eq.true,test_type.eq.mock') // Only allow resuming mock tests
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();

        if (error) {
            console.error('Error fetching active test:', error);
            setIsLoading(false);
            return;
        }

        if (data) {
            // Allow resume for:
            // 1. Past mock sessions (Mock Mode)
            // 2. Standard Practice tests (not Proctored, not Ranked Live)
            const isProctored = (data as any).is_proctored;
            const isLive = (data as any).is_ranked;
            const isMock = data.is_mock;

            // Strict protection for Proctored exams
            if (isProctored) {
                // Never show proctored tests in resume list (security requirement)
                setActiveTest(null);
                setIsLoading(false);
                return;
            }

            // Exclude Live Ranked tests if they require strict session integrity
            if (isLive) {
                setActiveTest(null);
                setIsLoading(false);
                return;
            }

            // If it's not a mock, and not proctored, it's a standard practice or normal test.
            // We allow resumption for everything that isn't security-restricted.

            // Check if expired
            const startTime = new Date(data.started_at).getTime();
            const timeLimitMs = (data.time_limit_minutes || 0) * 60 * 1000;
            const now = Date.now();

            // Determine if time is up. 
            // If time_remaining_seconds exists, we use it as the source of truth to support pausing.
            // Fallback to wall-clock calculation if it's missing.
            const isTimeUp = data.time_remaining_seconds !== null
                ? data.time_remaining_seconds <= 0
                : (now > startTime + timeLimitMs);

            if (isTimeUp) {
                await autoSubmitTest(data);
                setActiveTest(null);
            } else {
                const sessionTitle = (data as any).mock_sessions?.title;
                const testData = data as any;
                
                // Prioritize session title, then descriptive mock title, then subject fallback
                const examType = testData.exam_type?.toUpperCase() || 'Exam';
                const examName = examType === 'IMAT' ? 'IMAT' : (examType === 'CENT-S' ? 'CENT-S' : examType);
                
                let resolvedTitle = sessionTitle || testData.subject || 'All Subjects';
                
                if (testData.is_mock) {
                    if (sessionTitle) {
                        const isGenericSubject = !testData.subject || 
                                                testData.subject === 'All Subjects' || 
                                                testData.subject.toLowerCase() === examName.toLowerCase() ||
                                                sessionTitle.toLowerCase().includes(testData.subject.toLowerCase());
                        
                        resolvedTitle = isGenericSubject ? sessionTitle : `${sessionTitle} - ${testData.subject}`;
                    } else if (!testData.subject || testData.subject === 'All Subjects') {
                        resolvedTitle = `${examName} Mock Test`;
                    }
                }

                setActiveTest({
                    id: testData.id,
                    subject: resolvedTitle,
                    time_remaining_seconds: testData.time_remaining_seconds ?? Math.max(0, Math.floor((startTime + timeLimitMs - now) / 1000)),
                    total_questions: testData.total_questions,
                    exam_type: testData.exam_type,
                    is_mock: testData.is_mock,
                    started_at: testData.started_at,
                    current_section: testData.current_section ? parseInt(String(testData.current_section)) : 1
                });
            }
        } else {
            setActiveTest(null);
        }
        setIsLoading(false);
    }, [user]);

    const autoSubmitTest = async (testData: any) => {
        try {
            // Use the secure server-side RPC to complete and score the test
            const { error } = await (supabase as any).rpc('complete_test_secure', {
                p_test_id: testData.id
            });

            if (error) throw error;
        } catch (error) {
            console.error('Auto-submit failed:', error);
        }
    };

    useEffect(() => {
        checkActiveTest();

        // Polling for status updates (optional, but good for dashboard accuracy)
        const interval = setInterval(checkActiveTest, 60000); // Check every 60s
        return () => clearInterval(interval);
    }, [checkActiveTest]);

    return { activeTest, isLoading, refreshActiveTest: checkActiveTest };
}
