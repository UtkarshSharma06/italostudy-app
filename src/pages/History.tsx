import { useState, useEffect, memo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/integrations/supabase/client';
// EXAMS import removed
import Layout from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  BookOpen,
  Sparkles,
  ArrowRight,
  Clock,
  ShieldX,
  CheckCircle,
  Calendar,
  ChevronRight,
  Target,
  Headphones,
  FileText,
  Mic,
  Award,
  Loader2
} from 'lucide-react';
import { useExam } from '@/context/ExamContext';
import { usePricing } from '@/context/PricingContext';
import { HistorySkeleton } from '@/components/SkeletonLoader';

interface TestResult {
  id: string;
  subject: string;
  topic: string | null;
  difficulty: string;
  total_questions: number;
  score: number | null;
  correct_answers: number | null;
  wrong_answers: number | null;
  skipped_answers: number | null;
  time_taken_seconds: number | null;
  time_limit_minutes: number;
  completed_at: string | null;
  test_type: string | null;
  proctoring_status: string | null;
  status: string;
  date: string;
  type?: string;
  is_manual?: boolean;
  is_full_mock?: boolean;
  overall_band?: number;
  raw_score?: number;
  max_score?: number;
  exam_type?: string;
}

export default function History() {
  const { user, profile, loading } = useAuth();
  const { activeExam, allExams } = useExam();
  const { openPricingModal } = usePricing();
  const navigate = useNavigate();
  const [tests, setTests] = useState<TestResult[]>([]);
  const isIELTS = activeExam?.id === 'ielts-academic';
  const [activeTab, setActiveTab] = useState<string>(isIELTS ? 'writing' : 'practice');

  useEffect(() => {
    if (isIELTS) {
      setActiveTab('writing');
    } else {
      setActiveTab('practice');
    }
  }, [isIELTS]);

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    if (user) {
      fetchTests();
    }
  }, [user, activeExam?.id]);

  const fetchTests = async () => {
    if (!activeExam?.id) return;
    // 1. Fetch from 'tests' table (standard quizzes)
    const examIds = [activeExam.id];
    if (activeExam.id === 'cent-s-prep') examIds.push('cent-s');
    if (activeExam.id === 'imat-prep') examIds.push('imat');

    const { data: testsData } = await (supabase as any)
      .from('tests')
      .select('*, mock_sessions(title)')
      .eq('user_id', user?.id)
      .in('exam_type', examIds)
      .neq('status', 'in_progress') // Exclude in-progress / resumed tests
      .or('proctoring_status.is.null,proctoring_status.not.in.(disqualified,failed)') // Exclude proctoring violations
      .order('completed_at', { ascending: false });

    // 2. Fetch IELTS-specific data only when active exam is IELTS
    let writingData = null;
    let readingData = null;
    let listeningData = null;
    let speakingData = null;
    let mockData = null;

    if (isIELTS) {
      const [writingRes, readingRes, listeningRes, speakingRes, mockRes] = await Promise.all([
        (supabase as any)
          .from('writing_submissions')
          .select('id, content, word_count, created_at, writing_feedback(overall_score)')
          .eq('user_id', user?.id)
          .order('created_at', { ascending: false }),
        (supabase as any)
          .from('reading_submissions')
          .select('*')
          .eq('user_id', user?.id)
          .order('created_at', { ascending: false }),
        (supabase as any)
          .from('listening_submissions')
          .select('*')
          .eq('user_id', user?.id)
          .order('created_at', { ascending: false }),
        (supabase as any)
          .from('speaking_sessions')
          .select('id, started_at, speaking_scores(overall_score)')
          .eq('candidate_id', user?.id)
          .order('started_at', { ascending: false }),
        (supabase as any)
          .from('mock_exam_submissions')
          .select('*, mock_sessions(title), reading_submissions(score, status), listening_submissions(score, status)')
          .eq('user_id', user?.id)
          .order('created_at', { ascending: false })
      ]);
      writingData = writingRes.data;
      readingData = readingRes.data;
      listeningData = listeningRes.data;
      speakingData = speakingRes.data;
      mockData = mockRes.data;
    }

    let unifiedTests: any[] = [];

    if (testsData) {
      const testsWithRawScores = await Promise.all(
        testsData.map(async (t: any) => {
          let rawScore = undefined;
          let maxScore = undefined;
          const examId = t.exam_type;

          // Calculate raw score for all CENT-S and IMAT tests (both practice and mock)
          if (t.exam_type) {
            const examConfig = allExams[t.exam_type] || activeExam || Object.values(allExams)[0];

            if (examConfig) {
              const correct = t.correct_answers || 0;
              const wrong = t.wrong_answers || 0;
              const skipped = t.skipped_answers || 0;
              const total = t.total_questions || (correct + wrong + skipped);

              maxScore = total * examConfig.scoring.correct;
              rawScore = (correct * examConfig.scoring.correct) +
                (wrong * examConfig.scoring.incorrect) +
                (skipped * examConfig.scoring.skipped);
              rawScore = Number(rawScore.toFixed(2));
            }
          }

          // Robust Title Resolution for History
          const examConfig = allExams[t.exam_type] || activeExam || Object.values(allExams)[0];
          const examName = examConfig?.name || t.exam_type?.toUpperCase() || 'Exam';
          let displaySubject = t.subject || 'Test';

          if (t.is_mock) {
            const sessionData = Array.isArray(t.mock_sessions) ? t.mock_sessions[0] : t.mock_sessions;
            const sessionTitle = sessionData?.title;
            if (sessionTitle) {
              const isGenericSubject = !t.subject || 
                                      t.subject === 'All Subjects' || 
                                      t.subject === 'International Mock' ||
                                      t.subject.toLowerCase() === examName.toLowerCase() ||
                                      sessionTitle.toLowerCase().includes(t.subject.toLowerCase());
              
              displaySubject = isGenericSubject ? sessionTitle : `${sessionTitle} - ${t.subject}`;
            } else if (!t.subject || t.subject === 'All Subjects' || t.subject === 'International Mock') {
              displaySubject = `${examName} Mock Test`;
            }
          }

          return {
            ...t,
            subject: displaySubject,
            type: t.is_mock ? 'mock' : (t.test_type || (t.is_manual ? 'Writing' : 'Practice')),
            date: t.completed_at || t.started_at,
            raw_score: rawScore,
            max_score: maxScore,
            exam_type: examId
          };
        })
      );
      unifiedTests = [...unifiedTests, ...testsWithRawScores];
    }

    if (writingData) {
      unifiedTests = [...unifiedTests, ...writingData.map((w: any) => ({
        id: w.id,
        subject: 'IELTS Writing',
        type: 'Writing',
        score: w.writing_feedback?.[0]?.overall_score || null,
        status: w.writing_feedback?.[0] ? 'completed' : 'pending',
        date: w.created_at,
        is_manual: true
      }))];
    }

    if (readingData) {
      unifiedTests = [...unifiedTests, ...readingData.map((r: any) => ({
        id: r.id,
        subject: 'IELTS Reading',
        type: 'Reading',
        score: r.score,
        status: r.status,
        date: r.created_at,
        is_manual: true
      }))];
    }

    if (listeningData) {
      unifiedTests = [...unifiedTests, ...listeningData.map((l: any) => ({
        id: l.id,
        subject: 'IELTS Listening',
        type: 'Listening',
        score: l.score,
        status: l.status,
        date: l.created_at,
        is_manual: true
      }))];
    }

    if (speakingData) {
      unifiedTests = [...unifiedTests, ...speakingData.map((s: any) => ({
        id: s.id,
        subject: 'IELTS Speaking',
        type: 'Speaking',
        score: s.speaking_scores?.[0]
          ? Math.round((parseFloat(s.speaking_scores[0].fluency_score) +
            parseFloat(s.speaking_scores[0].vocabulary_score) +
            parseFloat(s.speaking_scores[0].grammar_score) +
            parseFloat(s.speaking_scores[0].pronunciation_score)) / 4 * 2) / 2
          : null,
        status: s.speaking_scores?.[0] ? 'completed' : 'pending',
        date: s.created_at,
        is_manual: true
      }))];
    }

    if (mockData) {
      unifiedTests = [...unifiedTests, ...mockData.map((m: any) => {
        // Correctly aggregate IELTS mock scores for immediate feedback
        const rScore = m.reading_submissions?.[0]?.score || 0;
        const lScore = m.listening_submissions?.[0]?.score || 0;

        return {
          id: m.id,
          subject: m.mock_sessions?.title || 'IELTS Mock Exam',
          type: 'Full Mock',
          score: m.overall_band || null,
          reading_band: m.reading_band,
          listening_band: m.listening_band,
          writing_band: m.writing_band,
          correct_answers: rScore + lScore, // Combine for IELTS
          status: m.status,
          date: m.started_at,
          is_manual: true,
          is_full_mock: true
        };
      })];
    }

    // 5. Cleanup older history to keep DB healthy (Latest 10 only)
    const cleanupHistory = async () => {
      if (!user?.id) return;

      // Cleanup 'tests'
      const { data: oldTests } = await (supabase as any)
        .from('tests')
        .select('id')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .range(10, 50);

      if (oldTests && oldTests.length > 0) {
        const ids = oldTests.map((t: any) => t.id);
        await (supabase as any).from('questions').delete().in('test_id', ids);
        await (supabase as any).from('tests').delete().in('id', ids);
      }

      // Cleanup 'mock_exam_submissions'
      const { data: oldMocks } = await (supabase as any)
        .from('mock_exam_submissions')
        .select('id')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .range(10, 50);

      if (oldMocks && oldMocks.length > 0) {
        const ids = oldMocks.map((m: any) => m.id);
        await (supabase as any).from('mock_exam_submissions').delete().in('id', ids);
      }
    };

    // Run cleanup silently
    cleanupHistory();

    // ── Deduplicate mock tests: show ONE card per mock session ──────────────────
    // Group by session_id (for live mocks) or by subject (for practice mocks).
    // Keep the attempt that has session_id set (for consistent dropdown), 
    // otherwise keep the latest (first in the already-sorted list).
    const rawMocks = unifiedTests.filter(t => t.type === 'mock' || t.type === 'Full Mock' || (isIELTS && t.subject.includes('IELTS')));
    const dedupedMocks = (() => {
      const seen = new Map<string, any>(); // key → best record to show
      for (const t of rawMocks) {
        // Grouping key: strictly use resolved subject name to combine identical mocks (with/without session_id)
        const key = t.subject || t.id;
        if (!seen.has(key)) {
          seen.set(key, t); // first = latest (list is already newest-first)
        } else {
          // Prefer the record that has session_id (gives full dropdown)
          const existing = seen.get(key)!;
          if (!existing.session_id && t.session_id) {
            seen.set(key, t);
          }
        }
      }
      return Array.from(seen.values());
    })();

    // Limit display to 10 most recent for each main category
    const practicePool = unifiedTests.filter(t => t.type !== 'mock' && t.type !== 'Full Mock' && !t.subject.includes('IELTS')).slice(0, 10);
    const mockPool = dedupedMocks.slice(0, 10);

    const finalTests = [...practicePool, ...mockPool].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    // Apply Free Tier Limitation on top if needed
    const isExplorer = profile?.selected_plan === 'explorer';
    if (isExplorer) {
      if (isIELTS) {
        const reading = finalTests.filter(t => t.type === 'Reading').slice(0, 2);
        const listening = finalTests.filter(t => t.type === 'Listening').slice(0, 2);
        const writing = finalTests.filter(t => t.type === 'Writing').slice(0, 2);
        const speaking = finalTests.filter(t => t.type === 'Speaking').slice(0, 2);
        const mocks = finalTests.filter(t => t.is_full_mock).slice(0, 2);
        setTests([...reading, ...listening, ...writing, ...speaking, ...mocks]);
      } else {
        const practice = finalTests.filter(t => t.type !== 'mock' && !t.subject.includes('IELTS')).slice(0, 2);
        const official = finalTests.filter(t => t.type === 'mock' || t.subject.includes('IELTS')).slice(0, 2);
        setTests([...practice, ...official]);
      }
    } else {
      setTests(finalTests);
    }
  };

  const formatTime = (seconds: number | null) => {
    if (!seconds) return '—';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '—';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const getStatusBadge = (result: any) => {
    if (result.status === 'pending' || result.status === 'evaluating') {
      return (
        <span className="px-2 py-0.5 rounded-full bg-amber-50 text-amber-600 text-[9px] font-black uppercase tracking-widest flex items-center gap-1 border border-amber-100 animate-pulse">
          <Clock className="w-2.5 h-2.5" />
          Evaluating
        </span>
      );
    }
    if (result.status === 'in_progress' || result.status === 'in-progress') {
      return (
        <span className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 text-[9px] font-black uppercase tracking-widest flex items-center gap-1 border border-blue-100">
          <Loader2 className="w-2.5 h-2.5 animate-spin" />
          Active
        </span>
      );
    }
    const isFailed = result.proctoring_status === 'disqualified' || result.proctoring_status === 'failed';

    if (isFailed) {
      return (
        <span className="px-2 py-0.5 rounded-full bg-red-50 text-red-600 text-[9px] font-black uppercase tracking-widest flex items-center gap-1 border border-red-100">
          <ShieldX className="w-2.5 h-2.5" />
          Flagged
        </span>
      );
    }
    return (
      <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-600 text-[9px] font-black uppercase tracking-widest flex items-center gap-1 border border-emerald-100">
        <CheckCircle className="w-2.5 h-2.5" />
        Completed
      </span>
    );
  };

  const practiceTests = tests.filter(t => t.type !== 'mock' && t.type !== 'Full Mock' && !t.subject.includes('IELTS'));
  const officialTests = tests.filter(t => t.type === 'mock' || t.type === 'Full Mock' || (isIELTS && t.subject.includes('IELTS')));

  if (loading) {
    return (
      <Layout isLoading={loading}>
        <div className="container mx-auto px-4 sm:px-6 py-8 sm:py-16 max-w-5xl">
          <HistorySkeleton />
        </div>
      </Layout>
    );
  }

// ─── Memoized sub-components ────────────────────────────────────────────────
// Defined at module level so React memo tracking works correctly.
// These won't re-render unless their specific props change.
const EmptyState = memo(({ icon, title, href, onNavigate }: { icon: any, title: string, href: string, onNavigate: (href: string) => void }) => (
  <div className="text-center py-24 bg-white dark:bg-card rounded-[3rem] border-2 border-slate-100 dark:border-border border-b-[8px] shadow-xl shadow-slate-200/50 w-full">
    <div className="w-20 h-20 bg-slate-50 dark:bg-muted rounded-[2rem] flex items-center justify-center mx-auto mb-8 border border-slate-100 dark:border-border">
      {icon}
    </div>
    <h3 className="text-2xl font-black text-slate-900 dark:text-slate-100 mb-2">{title}</h3>
    <p className="text-slate-400 font-bold mb-10 max-w-xs mx-auto uppercase text-[10px] tracking-widest">No history recorded for this module yet.</p>
    <button onClick={() => onNavigate(href)} className="bg-slate-900 text-white hover:bg-slate-800 font-black px-10 py-4 rounded-2xl h-14">
      Start Practicing
    </button>
  </div>
));
EmptyState.displayName = 'EmptyState';

const TestCard = memo(({ result, onNavigate }: { result: any, onNavigate: (path: string) => void }) => {
    const isFailed = result.proctoring_status === 'disqualified' || result.proctoring_status === 'failed';

    return (
      <div
        className="bg-white dark:bg-card p-5 sm:p-6 rounded-[1.5rem] sm:rounded-[2rem] border-2 border-slate-100 dark:border-border border-b-[6px] shadow-xl shadow-slate-200/50 hover:border-slate-300 hover:-translate-y-1 hover:shadow-2xl active:border-b-2 active:translate-y-1 transition-all duration-200 cursor-pointer group"
        onClick={() => {
          if (result.is_full_mock) {
            onNavigate(`/mock-results/${result.id}`);
            return;
          }
          if (result.is_manual) {
            if (result.type === 'Writing') onNavigate(`/writing/results/${result.id}`);
            if (result.type === 'Reading') onNavigate(`/reading/results/${result.id}`);
            if (result.type === 'Listening') onNavigate(`/listening/results/${result.id}`);
            if (result.type === 'Speaking') onNavigate(`/speaking/${result.id}`);
          } else {
            onNavigate(`/results/${result.id}`);
          }
        }}
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-slate-50 dark:bg-muted rounded-xl sm:rounded-2xl border border-slate-100 dark:border-border flex items-center justify-center text-lg sm:text-xl group-hover:bg-indigo-600 group-hover:text-white transition-all duration-300 shrink-0">
              {result.type === 'mock' || result.is_full_mock || result.subject.includes('Mock') ? '🏆' :
               result.subject.includes('Writing') ? '✍️' :
               result.subject.includes('Reading') ? '📖' :
               result.subject.includes('Listening') ? '🎧' :
               result.subject.includes('Speaking') ? '🗣️' :
               result.subject === 'Biology' ? '🧬' :
               result.subject === 'Chemistry' ? '⚗️' :
               result.subject === 'Physics' ? '⚛️' :
               result.subject === 'Mathematics' ? '📐' :
               result.subject === 'All Subjects' ? '🌍' : '🎯'}
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="font-black text-slate-900 dark:text-slate-100 tracking-tight leading-none uppercase text-xs sm:text-sm truncate">{result.subject}</h3>
                <span className="text-[7px] sm:text-[8px] px-1.5 py-0.5 bg-slate-100 dark:bg-muted rounded-md font-black text-slate-400 uppercase shrink-0">{result.type}</span>
              </div>
              <p className="text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2 mt-1.5">
                <Calendar className="w-3 h-3" /> {formatDate(result.date)}
              </p>
            </div>
          </div>
          <div className="flex items-center justify-between sm:justify-end gap-3 border-t sm:border-0 pt-3 sm:pt-0 border-slate-50">
            {getStatusBadge(result)}
            <div className="w-8 h-8 rounded-full bg-slate-50 dark:bg-muted flex items-center justify-center group-hover:translate-x-1 transition-transform sm:ml-2">
              <ChevronRight className="w-4 h-4 text-slate-300" />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 font-black">
          <div className="bg-slate-50/50 dark:bg-muted/30 p-3 sm:p-4 rounded-xl sm:rounded-2xl border border-slate-50/50 dark:border-border/50">
            <p className="text-[7px] sm:text-[8px] text-slate-300 dark:text-slate-500 uppercase tracking-widest mb-1 sm:mb-1.5 leading-none">
              {result.raw_score !== undefined ? 'Raw Score' : 'Band / Score'}
            </p>
            <p className={`text-base sm:text-lg tracking-tight leading-none ${isFailed
              ? 'text-red-600'
              : (result.score || 0) >= 70 || (result.type === 'Writing' && result.score >= 7)
                ? 'text-emerald-600'
                : 'text-slate-900 dark:text-slate-100'
              }`}>
              {result.status === 'pending' ? '...' : (
                result.score === null ? '—' : (
                  result.raw_score !== undefined && result.max_score !== undefined
                    ? `${result.raw_score} / ${result.max_score}`
                    : `${result.score}${result.is_manual ? '' : '%'}`
                )
              )}
            </p>
            {result.raw_score !== undefined && result.score !== null && (
              <p className="text-[7px] sm:text-[8px] text-slate-400 uppercase tracking-widest mt-1 leading-none">
                {result.score}%
              </p>
            )}
          </div>

          {result.is_full_mock ? (
            <>
              <div className="bg-slate-50/50 dark:bg-muted/30 p-3 sm:p-4 rounded-xl sm:rounded-2xl border border-slate-50/50 dark:border-border/50">
                <p className="text-[7px] sm:text-[8px] text-blue-500 uppercase tracking-widest mb-1 sm:mb-1.5 leading-none">Reading</p>
                <p className="text-sm sm:text-base text-blue-600 leading-none">{result.reading_band || '—'}</p>
              </div>
              <div className="bg-slate-50/50 dark:bg-muted/30 p-3 sm:p-4 rounded-xl sm:rounded-2xl border border-slate-50/50 dark:border-border/50">
                <p className="text-[7px] sm:text-[8px] text-purple-500 uppercase tracking-widest mb-1 sm:mb-1.5 leading-none">Listening</p>
                <p className="text-sm sm:text-base text-purple-600 leading-none">{result.listening_band || '—'}</p>
              </div>
              <div className="bg-slate-50/50 dark:bg-muted/30 p-3 sm:p-4 rounded-xl sm:rounded-2xl border border-slate-50/50 dark:border-border/50">
                <p className="text-[7px] sm:text-[8px] text-orange-500 uppercase tracking-widest mb-1 sm:mb-1.5 leading-none">Writing</p>
                <p className="text-sm sm:text-base text-orange-600 leading-none">{result.writing_band || '—'}</p>
              </div>
            </>
          ) : result.type === 'mock' ? (
            <>
              <div className="bg-slate-50/50 dark:bg-muted/30 p-3 sm:p-4 rounded-xl sm:rounded-2xl border border-slate-50/50 dark:border-border/50">
                <p className="text-[7px] sm:text-[8px] text-emerald-500 uppercase tracking-widest mb-1 sm:mb-1.5 leading-none">Correct</p>
                <p className="text-sm sm:text-base text-emerald-600 leading-none">{result.correct_answers || 0}</p>
              </div>
              <div className="bg-slate-50/50 dark:bg-muted/30 p-3 sm:p-4 rounded-xl sm:rounded-2xl border border-slate-50/50 dark:border-border/50">
                <p className="text-[7px] sm:text-[8px] text-rose-500 uppercase tracking-widest mb-1 sm:mb-1.5 leading-none">Failed</p>
                <p className="text-sm sm:text-base text-rose-600 leading-none">{result.wrong_answers || 0}</p>
              </div>
              <div className="hidden sm:block bg-slate-50/50 dark:bg-muted/30 p-3 sm:p-4 rounded-xl sm:rounded-2xl border border-slate-50/50 dark:border-border/50">
                <p className="text-[7px] sm:text-[8px] text-slate-400 uppercase tracking-widest mb-1 sm:mb-1.5 leading-none">Skipped</p>
                <p className="text-sm sm:text-base text-slate-500 leading-none">{result.skipped_answers || 0}</p>
              </div>
            </>
          ) : (
            <>
              <div className="bg-slate-50/50 dark:bg-muted/30 p-3 sm:p-4 rounded-xl sm:rounded-2xl border border-slate-50/50 dark:border-border/50">
                <p className="text-[7px] sm:text-[8px] text-slate-300 dark:text-slate-500 uppercase tracking-widest mb-1 sm:mb-1.5 leading-none">Metric</p>
                <p className="text-[9px] sm:text-[10px] text-slate-900 dark:text-slate-100 tracking-tight uppercase leading-none truncate">
                  {result.type === 'Writing' ? 'Manual Rev.' :
                    result.type === 'Reading' ? 'Auto Grade' :
                      result.type === 'Listening' ? 'Auto Grade' : 'Smart Analysis'}
                </p>
              </div>
              <div className="bg-slate-50/50 dark:bg-muted/30 p-3 sm:p-4 rounded-xl sm:rounded-2xl border border-slate-50/50 dark:border-border/50 col-span-2 sm:col-span-1">
                <p className="text-[7px] sm:text-[8px] text-slate-300 dark:text-slate-500 uppercase tracking-widest mb-1 sm:mb-1.5 leading-none">ID</p>
                <p className="text-[9px] sm:text-[10px] text-slate-900 dark:text-slate-100 tracking-tight truncate leading-none">{result.id.split('-')[0]}</p>
              </div>
            </>
          )}
        </div>
      </div>
    );
});
TestCard.displayName = 'TestCard';

  return (
    <Layout isLoading={loading}>
      <div className="container mx-auto px-4 sm:px-6 py-8 sm:py-16 max-w-5xl">
        <div className="text-center mb-10 sm:mb-16 space-y-4 animate-in fade-in duration-700">
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-slate-900 dark:text-slate-100 tracking-tighter leading-tight">
            History <span className="text-indigo-600">Logs</span>
          </h1>
          <p className="text-base sm:text-lg text-slate-400 font-bold tracking-tight">Review your evolution through every mission.</p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <div className="flex justify-center mb-8 sm:mb-12">
            <TabsList className="bg-slate-100 dark:bg-muted p-1 sm:p-1.5 rounded-xl sm:rounded-2xl border border-slate-200/50 h-12 sm:h-14 w-full sm:w-auto overflow-x-auto overflow-y-hidden no-scrollbar justify-start sm:justify-center">
              {isIELTS ? (
                <>
                  <TabsTrigger value="reading" className="px-4 sm:px-6 rounded-lg sm:rounded-xl font-black text-[9px] sm:text-[11px] uppercase tracking-widest data-[state=active]:bg-white dark:bg-card data-[state=active]:text-slate-900 dark:text-slate-100 data-[state=active]:shadow-sm flex items-center gap-1.5 sm:gap-2 shrink-0">
                    <BookOpen className="w-3 sm:w-3.5 h-3 sm:h-3.5" /> Reading
                  </TabsTrigger>
                  <TabsTrigger value="listening" className="px-4 sm:px-6 rounded-lg sm:rounded-xl font-black text-[9px] sm:text-[11px] uppercase tracking-widest data-[state=active]:bg-white dark:bg-card data-[state=active]:text-slate-900 dark:text-slate-100 data-[state=active]:shadow-sm flex items-center gap-1.5 sm:gap-2 shrink-0">
                    <Headphones className="w-3 sm:w-3.5 h-3 sm:h-3.5" /> Listening
                  </TabsTrigger>
                  <TabsTrigger value="writing" className="px-4 sm:px-6 rounded-lg sm:rounded-xl font-black text-[9px] sm:text-[11px] uppercase tracking-widest data-[state=active]:bg-white dark:bg-card data-[state=active]:text-slate-900 dark:text-slate-100 data-[state=active]:shadow-sm flex items-center gap-1.5 sm:gap-2 shrink-0">
                    <FileText className="w-3 sm:w-3.5 h-3 sm:h-3.5" /> Writing
                  </TabsTrigger>
                  <TabsTrigger value="speaking" className="px-4 sm:px-6 rounded-lg sm:rounded-xl font-black text-[9px] sm:text-[11px] uppercase tracking-widest data-[state=active]:bg-white dark:bg-card data-[state=active]:text-slate-900 dark:text-slate-100 data-[state=active]:shadow-sm flex items-center gap-1.5 sm:gap-2 shrink-0">
                    <Mic className="w-3 sm:w-3.5 h-3 sm:h-3.5" /> Speaking
                  </TabsTrigger>
                  <TabsTrigger value="mock-exams" className="px-4 sm:px-6 rounded-lg sm:rounded-xl font-black text-[9px] sm:text-[11px] uppercase tracking-widest data-[state=active]:bg-white dark:bg-card data-[state=active]:text-slate-900 dark:text-slate-100 data-[state=active]:shadow-sm flex items-center gap-1.5 sm:gap-2 shrink-0">
                    <Award className="w-3 sm:w-3.5 h-3 sm:h-3.5" /> Mock
                  </TabsTrigger>
                </>
              ) : (
                <>
                  <TabsTrigger value="practice" className="px-6 sm:px-8 rounded-lg sm:rounded-xl font-black text-[10px] sm:text-[11px] uppercase tracking-widest data-[state=active]:bg-white dark:bg-card data-[state=active]:text-slate-900 dark:text-slate-100 data-[state=active]:shadow-sm shrink-0">
                    Practice ({practiceTests.length})
                  </TabsTrigger>
                  <TabsTrigger value="mock" className="px-6 sm:px-8 rounded-lg sm:rounded-xl font-black text-[10px] sm:text-[11px] uppercase tracking-widest data-[state=active]:bg-white dark:bg-card data-[state=active]:text-slate-900 dark:text-slate-100 data-[state=active]:shadow-sm shrink-0">
                    Mock Simulations ({officialTests.length})
                  </TabsTrigger>
                </>
              )}
            </TabsList>
          </div>

          {isIELTS ? (
            <>
              <TabsContent value="reading" className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="grid gap-4 sm:gap-6">
                  {tests.filter(t => t.type === 'Reading').length > 0 ? (
                    tests.filter(t => t.type === 'Reading').map(test => (
                      <TestCard key={test.id} result={test} onNavigate={navigate} />
                    ))
                  ) : (
                    <EmptyState icon={<BookOpen className="w-8 h-8 text-slate-200" />} title="No Reading Sessions" href="/practice" onNavigate={navigate} />
                  )}
                </div>
              </TabsContent>
              <TabsContent value="listening" className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="grid gap-4 sm:gap-6">
                  {tests.filter(t => t.type === 'Listening').length > 0 ? (
                    tests.filter(t => t.type === 'Listening').map(test => (
                      <TestCard key={test.id} result={test} onNavigate={navigate} />
                    ))
                  ) : (
                    <EmptyState icon={<Headphones className="w-8 h-8 text-slate-200" />} title="No Listening Sessions" href="/practice" onNavigate={navigate} />
                  )}
                </div>
              </TabsContent>
              <TabsContent value="writing" className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="grid gap-4 sm:gap-6">
                  {tests.filter(t => t.type === 'Writing').length > 0 ? (
                    tests.filter(t => t.type === 'Writing').map(test => (
                      <TestCard key={test.id} result={test} onNavigate={navigate} />
                    ))
                  ) : (
                    <EmptyState icon={<FileText className="w-8 h-8 text-slate-200" />} title="No Writing Evaluations" href="/writing/lobby" onNavigate={navigate} />
                  )}
                </div>
              </TabsContent>
              <TabsContent value="speaking" className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="grid gap-4 sm:gap-6">
                  {tests.filter(t => t.type === 'Speaking').length > 0 ? (
                    tests.filter(t => t.type === 'Speaking').map(test => (
                      <TestCard key={test.id} result={test} onNavigate={navigate} />
                    ))
                  ) : (
                    <EmptyState icon={<Mic className="w-8 h-8 text-slate-200" />} title="No Speaking Sessions" href="/speaking" onNavigate={navigate} />
                  )}
                </div>
              </TabsContent>
              <TabsContent value="mock-exams" className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="grid gap-4 sm:gap-6">
                  {tests.filter(t => t.is_full_mock).length > 0 ? (
                    tests.filter(t => t.is_full_mock).map(test => (
                      <TestCard key={test.id} result={test} onNavigate={navigate} />
                    ))
                  ) : (
                    <EmptyState icon={<Award className="w-8 h-8 text-slate-200" />} title="No Mock Exams" href="/mock-exams" onNavigate={navigate} />
                  )}
                </div>
              </TabsContent>
            </>
          ) : (
            <>
              <TabsContent value="practice" className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                {practiceTests.length > 0 ? (
                  <div className="grid gap-4 sm:gap-6">
                    {practiceTests.map(test => (
                      <TestCard key={test.id} result={test} onNavigate={navigate} />
                    ))}
                  </div>
                ) : (
                  <EmptyState icon={<Target className="w-8 h-8 text-slate-200" />} title="No Practice Missions" href="/practice" onNavigate={navigate} />
                )}
              </TabsContent>

              <TabsContent value="mock" className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                {officialTests.length > 0 ? (
                  <div className="grid gap-4 sm:gap-6">
                    {officialTests.map(test => (
                      <TestCard key={test.id} result={test} onNavigate={navigate} />
                    ))}
                  </div>
                ) : (
                  <EmptyState icon={<FileText className="w-8 h-8 text-slate-200" />} title="No Mock Simulations" href="/mock-exams" onNavigate={navigate} />
                )}
              </TabsContent>
            </>
          )}
        </Tabs>

        {/* Free Tier Upgrade Prompt */}
        {profile?.selected_plan === 'explorer' && (
          <div className="mt-12 p-8 sm:p-12 rounded-[3rem] bg-indigo-600 shadow-2xl shadow-indigo-200 relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
            <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-8">
              <div className="text-center md:text-left space-y-4">
                <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/10 rounded-full border border-white/20">
                  <Sparkles className="w-3.5 h-3.5 text-indigo-200" />
                  <span className="text-[10px] font-black text-white uppercase tracking-widest leading-none">Unlock Full Logs</span>
                </div>
                <h3 className="text-2xl sm:text-3xl font-black text-white tracking-tight uppercase leading-none">
                  Viewing Limited <span className="text-indigo-200 text-lg sm:text-xl"> (2 Recent)</span>
                </h3>
                <p className="text-sm font-medium text-indigo-100 max-w-sm leading-relaxed">
                  Upgrade to Exam Prep or Global plan to see your entire performance history across all subjects.
                </p>
              </div>
              <Button
                onClick={openPricingModal}
                className="h-16 px-10 rounded-2xl bg-white text-indigo-600 hover:bg-slate-50 font-black text-xs uppercase tracking-widest shadow-xl group/btn shrink-0"
              >
                Upgrade Now
                <ArrowRight className="w-4 h-4 ml-2 group-hover/btn:translate-x-1 transition-transform" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
