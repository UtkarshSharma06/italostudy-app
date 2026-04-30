import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import Layout from '@/components/Layout';
import { Loader2 } from 'lucide-react';
import ReadingTest from './reading/ReadingTest';
import ListeningTest from './listening/ListeningTest';
import WritingTest from './writing/WritingTest';
import { Button } from '@/components/ui/button';
import { Device } from '@capacitor/device';
import MobileIELTSPlayer from '@/mobile/pages/MobileIELTSPlayer';

type IELTSStep = 'loading' | 'listening' | 'reading' | 'writing' | 'finished';

interface MockSession {
    id: string;
    title: string;
    config: {
        reading_test_id?: string;
        listening_test_id?: string;
        writing_task1_id?: string;
        writing_task2_id?: string;
    };
}

export default function IELTSFlow() {
    const { sessionId } = useParams();
    const navigate = useNavigate();
    const [step, setStep] = useState<IELTSStep>('loading');
    const [session, setSession] = useState<MockSession | null>(null);
    const [mockSubmissionId, setMockSubmissionId] = useState<string | null>(null);
    const [isMobile, setIsMobile] = useState(false);

    useEffect(() => {
        const checkMobile = async () => {
            const info = await Device.getInfo();
            setIsMobile(info.platform !== 'web');
        };
        checkMobile();
    }, []);

    useEffect(() => {
        if (sessionId) {
            fetchSession();
        }
    }, [sessionId]);

    const fetchSession = async () => {
        const { data, error } = await (supabase as any)
            .from('mock_sessions')
            .select('*')
            .eq('id', sessionId)
            .single();

        if (data) {
            setSession(data);

            // Create mock_exam_submission record
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                const { data: mockSubmission, error: submissionError } = await (supabase as any)
                    .from('mock_exam_submissions')
                    .insert({
                        user_id: user.id,
                        session_id: sessionId,
                        status: 'pending',
                        started_at: new Date().toISOString()
                    })
                    .select()
                    .single();

                if (mockSubmission) {
                    setMockSubmissionId((mockSubmission as any).id);
                }
            }

            setStep('listening');
        } else {
            navigate('/mock-exams');
        }
    };

    const handleStepComplete = () => {
        // Transitioning to next assessment phase
        if (step === 'listening') setStep('reading');
        else if (step === 'reading') setStep('writing');
        else if (step === 'writing') setStep('finished');
    };

    if (step === 'loading') {
        return (
            <Layout>
                <div className="flex h-[80vh] items-center justify-center">
                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                </div>
            </Layout>
        );
    }

    if (step === 'finished') {
        return (
            <Layout>
                <div className="flex flex-col items-center justify-center h-[80vh] text-center space-y-6">
                    <div className="w-20 h-20 bg-amber-100 rounded-full flex items-center justify-center text-amber-600 mb-4 text-4xl">
                        ⏳
                    </div>
                    <h1 className="text-4xl font-black">IELTS Mock Exam Submitted!</h1>
                    <p className="text-muted-foreground text-lg max-w-md">
                        Your writing section is being sent to our expert examiners for evaluation. You'll receive your complete band scores within 2 business days.
                    </p>
                    <div className="bg-slate-50 dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 max-w-md">
                        <p className="text-sm text-slate-600 dark:text-slate-400">
                            <strong className="text-slate-900 dark:text-slate-100">What happens next:</strong><br />
                            • Reading & Listening scores are calculated automatically<br />
                            • Writing tasks are reviewed by certified IELTS examiners<br />
                            • You'll be notified when your results are ready
                        </p>
                    </div>
                    <Button
                        size="lg"
                        onClick={() => navigate('/history')}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white px-12 h-14 rounded-2xl font-bold"
                    >
                        View My Mock Exams
                    </Button>
                </div>
            </Layout>
        );
    }

    return (
        <div className="min-h-screen bg-background">
            {step === 'listening' && session?.config.listening_test_id && (
                isMobile ? (
                    <MobileIELTSPlayer
                        overrideId={session.config.listening_test_id}
                        isMockSession={true}
                        mockSubmissionId={mockSubmissionId}
                        onComplete={handleStepComplete}
                    />
                ) : (
                    <ListeningTest
                        // @ts-ignore
                        overrideId={session.config.listening_test_id}
                        onComplete={handleStepComplete}
                        isMockSession={true}
                        mockSubmissionId={mockSubmissionId}
                    />
                )
            )}
            {step === 'reading' && session?.config.reading_test_id && (
                isMobile ? (
                    <MobileIELTSPlayer
                        overrideId={session.config.reading_test_id}
                        isMockSession={true}
                        mockSubmissionId={mockSubmissionId}
                        onComplete={handleStepComplete}
                    />
                ) : (
                    <ReadingTest
                        // @ts-ignore
                        overrideId={session.config.reading_test_id}
                        onComplete={handleStepComplete}
                        isMockSession={true}
                        mockSubmissionId={mockSubmissionId}
                    />
                )
            )}
            {step === 'writing' && session?.config.writing_task1_id && (
                isMobile ? (
                    <MobileIELTSPlayer
                        overrideId={session.config.writing_task1_id}
                        overrideId2={session.config.writing_task2_id}
                        isMockSession={true}
                        mockSubmissionId={mockSubmissionId}
                        onComplete={handleStepComplete}
                    />
                ) : (
                    <WritingTest
                        // @ts-ignore
                        overrideId={session.config.writing_task1_id}
                        overrideId2={session.config.writing_task2_id}
                        onComplete={handleStepComplete}
                        isMockSession={true}
                        mockSubmissionId={mockSubmissionId}
                    />
                )
            )}
        </div>
    );
}
