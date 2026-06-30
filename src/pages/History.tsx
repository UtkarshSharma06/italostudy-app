import { useState, useEffect, memo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/integrations/supabase/client';
// EXAMS import removed
import Layout from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
  Loader2,
  Crown,
  Filter,
  ChevronDown
} from 'lucide-react';
import { useExam } from '@/context/ExamContext';
import { usePricing } from '@/context/PricingContext';
import { HistorySkeleton } from '@/components/SkeletonLoader';
import { SubjectIcon, getSubjectColorClass } from '@/components/ui/SubjectIcon';

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
  const [selectedSubject, setSelectedSubject] = useState<string>('All Subjects');
  const isIELTS = activeExam?.id === 'ielts-academic';
  const [activeTab, setActiveTab] = useState<string>(isIELTS ? 'writing' : 'practice');
  const [page, setPage] = useState(0);
  const PAGE_SIZE = 10;

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
    if (activeExam.id === 'til-i-prep') examIds.push('til-i');

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

    // Cleanup history logic removed to keep all historical tests


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

    // Keep all historical tests instead of limiting to 10
    const practicePool = unifiedTests.filter(t => t.type !== 'mock' && t.type !== 'Full Mock' && !t.subject.includes('IELTS'));
    const mockPool = dedupedMocks;

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

  const uniqueSubjects = Array.from(new Set(tests.filter(t => t.type !== 'mock' && t.type !== 'Full Mock' && !t.subject.includes('IELTS')).map(t => t.subject))).filter(Boolean);
  const filteredTests = selectedSubject === 'All Subjects' ? tests : tests.filter(t => t.subject === selectedSubject);

  const practiceTests = filteredTests.filter(t => t.type !== 'mock' && t.type !== 'Full Mock' && !t.subject.includes('IELTS'));
  const officialTests = filteredTests.filter(t => t.type === 'mock' || t.type === 'Full Mock' || (isIELTS && t.subject.includes('IELTS')));

  const renderPaginatedList = (list: TestResult[]) => {
    const totalPages = Math.ceil(list.length / PAGE_SIZE);
    const paged = list.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

    return (
      <div className="grid gap-4 sm:gap-6 pb-8">
        {paged.map(test => (
          <TestCard key={test.id} result={test} onNavigate={navigate} />
        ))}
        
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-4 mt-8">
              <button
                  onClick={() => setPage(p => Math.max(0, p - 1))}
                  disabled={page === 0}
                  className="px-6 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all disabled:opacity-30 disabled:cursor-not-allowed bg-slate-100 text-slate-500 hover:bg-slate-900 hover:text-white"
              >
                  ← Prev
              </button>
              <span className="text-[11px] font-black text-slate-400 uppercase tracking-widest">
                  Page {page + 1} of {totalPages}
              </span>
              <button
                  onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                  disabled={page >= totalPages - 1}
                  className="px-6 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all disabled:opacity-30 disabled:cursor-not-allowed bg-slate-900 text-white hover:bg-indigo-600"
              >
                  Next →
              </button>
          </div>
        )}
      </div>
    );
  };

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
    const isPending = result.status === 'pending' || result.status === 'evaluating';
    const scoreText = isPending ? '...' : (
      result.score === null ? '—' : (
        result.raw_score !== undefined && result.max_score !== undefined
          ? `${result.raw_score}/${result.max_score}`
          : `${result.score}${result.is_manual ? '' : '%'}`
      )
    );
    const accuracyText = result.score !== null ? `${result.score}%` : '—';
    const formattedDate = new Date(result.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    const formattedTime = new Date(result.date).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    
    // Extract border color dynamically from subject color class
    const subjectColor = getSubjectColorClass(result.subject).match(/text-[a-z]+-[0-9]+/)?.[0]?.replace('text-', 'border-t-') || 'border-t-purple-600';

    return (
      <div
        className={`bg-white dark:bg-card p-5 sm:p-6 rounded-[1.5rem] border border-slate-200 dark:border-slate-800 border-t-[3px] ${subjectColor} shadow-sm hover:shadow-xl hover:-translate-y-0.5 transition-all duration-300 cursor-pointer flex flex-col md:flex-row items-start md:items-center gap-6 group mb-4 relative overflow-hidden`}
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
        <div className="flex-1 w-full flex flex-col sm:flex-row items-start gap-4 sm:gap-6 min-w-0">
          <div className={`w-14 h-14 sm:w-16 sm:h-16 rounded-[1.25rem] flex items-center justify-center shrink-0 transition-transform group-hover:scale-105 ${getSubjectColorClass(result.subject)}`}>
            <SubjectIcon subjectName={result.subject} className="w-7 h-7 sm:w-8 sm:h-8" />
          </div>
          
          <div className="flex-1 min-w-0 space-y-3">
            <div>
              <div className="flex flex-wrap items-center gap-2 sm:gap-3 mb-1">
                <h3 className="font-black text-lg sm:text-xl text-slate-900 dark:text-slate-100 tracking-tight leading-none truncate max-w-full">
                  {result.subject.length > 25 ? result.subject.substring(0, 25) + '...' : result.subject}
                </h3>
                <span className="px-2.5 py-0.5 rounded-full bg-purple-100 dark:bg-purple-500/20 text-purple-700 dark:text-purple-300 text-[10px] font-bold uppercase tracking-widest shrink-0">{result.type}</span>
              </div>
              <p className="text-[12px] sm:text-[13px] font-semibold text-slate-500 flex items-center gap-2">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                {formattedDate} <span className="text-slate-300">•</span> {formattedTime}
              </p>
            </div>

            <div className="grid grid-cols-2 sm:flex sm:items-center gap-6 sm:gap-12 pt-1">
              {result.is_full_mock ? (
                <>
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 sm:mb-2">Reading</p>
                    <p className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tighter">{result.reading_band || '—'}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 sm:mb-2">Listening</p>
                    <p className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tighter">{result.listening_band || '—'}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 sm:mb-2">Writing</p>
                    <p className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tighter">{result.writing_band || '—'}</p>
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 sm:mb-2">Score</p>
                    <p className={`text-xl sm:text-2xl font-black tracking-tighter ${isFailed ? 'text-red-600' : 'text-slate-900 dark:text-white'}`}>{scoreText}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 sm:mb-2">Accuracy</p>
                    <p className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tighter">{accuracyText}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 sm:mb-2">Time Taken</p>
                    <p className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tighter">{result.time_taken_seconds ? `${Math.floor(result.time_taken_seconds/60)}m ${result.time_taken_seconds%60}s` : '—'}</p>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4 shrink-0 justify-between md:justify-end border-t border-slate-100 dark:border-slate-800 md:border-0 pt-4 md:pt-0 w-full md:w-auto mt-2 md:mt-0">
          {/* We'll handle the status badge outside getStatusBadge to match the exact design if needed, or rely on it */}
          {result.status === 'completed' && !isFailed ? (
             <span className="px-4 py-2 rounded-full bg-emerald-50 text-emerald-600 text-[11px] font-bold tracking-wide flex items-center gap-2 border border-emerald-100">
               <CheckCircle className="w-3.5 h-3.5" /> Completed
             </span>
          ) : (
             <div className="scale-110 origin-left">{getStatusBadge(result)}</div>
          )}
          
          <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-[12px] border border-slate-200 dark:border-slate-700 flex items-center justify-center group-hover:bg-purple-600 group-hover:border-purple-600 transition-colors shrink-0 bg-white dark:bg-slate-800 shadow-sm">
            <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5 text-purple-600 group-hover:text-white transition-colors" />
          </div>
        </div>
      </div>
    );
});
TestCard.displayName = 'TestCard';

  // Derived Stats
  const totalCompleted = tests.filter(t => t.status === 'completed').length;
  const totalTimeSeconds = tests.reduce((acc, t) => acc + (t.time_taken_seconds || 0), 0);
  const totalTimeHours = Math.floor(totalTimeSeconds / 3600);
  const totalTimeMins = Math.floor((totalTimeSeconds % 3600) / 60);
  const totalTimeStr = totalTimeHours > 0 ? `${totalTimeHours}h ${totalTimeMins}m` : `${totalTimeMins}m`;
  
  const testsWithScores = tests.filter(t => t.score !== null && !t.is_manual);
  const avgScore = testsWithScores.length > 0 
      ? Math.round(testsWithScores.reduce((acc, t) => acc + t.score, 0) / testsWithScores.length)
      : 0;
  
  const totalMocks = tests.filter(t => t.is_full_mock || t.type === 'mock' || t.type === 'Full Mock').length;

  return (
    <Layout isLoading={loading}>
      <div className="container mx-auto px-4 sm:px-6 py-2 sm:py-4 max-w-[1000px]">
        
        {/* Header Section */}
        <div className="flex flex-col md:flex-row items-center justify-between mb-6 sm:mb-8 gap-4 animate-in fade-in duration-700">
          <div className="space-y-1 text-center md:text-left">
            <div className="inline-flex items-center px-4 py-1.5 rounded-full bg-purple-50 text-indigo-600 text-xs sm:text-sm font-bold tracking-tight mb-2">
              Your Journey
            </div>
            <h1 className="text-4xl sm:text-5xl font-black text-[#0f172a] dark:text-white tracking-tighter">
              History
            </h1>
            <p className="text-base sm:text-lg text-slate-500 font-medium tracking-tight">
              Track your performance and every step you've taken.
            </p>
          </div>
          <div className="hidden md:block shrink-0 relative">
            <div className="absolute inset-0 bg-purple-200/50 blur-3xl rounded-full" />
            <img src="/clock.webp" alt="History Clock" className="w-[180px] h-[180px] object-contain relative z-10 drop-shadow-2xl hover:scale-105 transition-transform duration-500" />
          </div>
        </div>

        {/* Statistics Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-100 dark:border-slate-800 flex items-center gap-4 shadow-sm">
                <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                    <CheckCircle className="w-6 h-6" />
                </div>
                <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Completed</p>
                    <p className="text-xl font-black text-slate-900 dark:text-white leading-none">{totalCompleted}</p>
                </div>
            </div>
            
            <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-100 dark:border-slate-800 flex items-center gap-4 shadow-sm">
                <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                    <Target className="w-6 h-6" />
                </div>
                <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Avg Score</p>
                    <p className="text-xl font-black text-slate-900 dark:text-white leading-none">{avgScore}%</p>
                </div>
            </div>

            <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-100 dark:border-slate-800 flex items-center gap-4 shadow-sm">
                <div className="w-12 h-12 rounded-2xl bg-orange-50 text-orange-600 flex items-center justify-center shrink-0">
                    <Clock className="w-6 h-6" />
                </div>
                <div className="min-w-0">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Time Spent</p>
                    <p className="text-lg font-black text-slate-900 dark:text-white leading-tight truncate">{totalTimeStr}</p>
                </div>
            </div>

            <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-100 dark:border-slate-800 flex items-center gap-4 shadow-sm">
                <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                    <Award className="w-6 h-6" />
                </div>
                <div className="min-w-0">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Mocks</p>
                    <p className="text-xl font-black text-slate-900 dark:text-white leading-tight truncate">{totalMocks}</p>
                </div>
            </div>
        </div>

        <Tabs value={activeTab} onValueChange={(v) => { setActiveTab(v); setPage(0); }} className="w-full">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 border-b border-slate-200 dark:border-slate-800/50">
            <TabsList className="bg-transparent p-0 border-0 h-auto justify-start w-full sm:w-auto gap-4 sm:gap-8 overflow-x-auto no-scrollbar">
              {isIELTS ? (
                <>
                  <TabsTrigger value="reading" className="relative pb-4 px-1 sm:px-2 rounded-none data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:text-indigo-600 text-slate-500 font-bold text-[13px] sm:text-[15px] tracking-tight hover:text-slate-700 dark:hover:text-slate-300">
                    Reading <span className="ml-2 bg-slate-100 dark:bg-slate-800 text-slate-500 data-[state=active]:bg-indigo-600 data-[state=active]:text-white rounded-full px-2 py-0.5 text-[10px] font-black">{tests.filter(t => t.type === 'Reading').length}</span>
                    <div className="absolute bottom-0 left-0 right-0 h-[3px] bg-indigo-600 rounded-t-md opacity-0 data-[state=active]:opacity-100 transition-opacity" />
                  </TabsTrigger>
                  <TabsTrigger value="listening" className="relative pb-4 px-1 sm:px-2 rounded-none data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:text-indigo-600 text-slate-500 font-bold text-[13px] sm:text-[15px] tracking-tight hover:text-slate-700 dark:hover:text-slate-300">
                    Listening <span className="ml-2 bg-slate-100 dark:bg-slate-800 text-slate-500 data-[state=active]:bg-indigo-600 data-[state=active]:text-white rounded-full px-2 py-0.5 text-[10px] font-black">{tests.filter(t => t.type === 'Listening').length}</span>
                    <div className="absolute bottom-0 left-0 right-0 h-[3px] bg-indigo-600 rounded-t-md opacity-0 data-[state=active]:opacity-100 transition-opacity" />
                  </TabsTrigger>
                  <TabsTrigger value="writing" className="relative pb-4 px-1 sm:px-2 rounded-none data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:text-indigo-600 text-slate-500 font-bold text-[13px] sm:text-[15px] tracking-tight hover:text-slate-700 dark:hover:text-slate-300">
                    Writing <span className="ml-2 bg-slate-100 dark:bg-slate-800 text-slate-500 data-[state=active]:bg-indigo-600 data-[state=active]:text-white rounded-full px-2 py-0.5 text-[10px] font-black">{tests.filter(t => t.type === 'Writing').length}</span>
                    <div className="absolute bottom-0 left-0 right-0 h-[3px] bg-indigo-600 rounded-t-md opacity-0 data-[state=active]:opacity-100 transition-opacity" />
                  </TabsTrigger>
                  <TabsTrigger value="speaking" className="relative pb-4 px-1 sm:px-2 rounded-none data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:text-indigo-600 text-slate-500 font-bold text-[13px] sm:text-[15px] tracking-tight hover:text-slate-700 dark:hover:text-slate-300">
                    Speaking <span className="ml-2 bg-slate-100 dark:bg-slate-800 text-slate-500 data-[state=active]:bg-indigo-600 data-[state=active]:text-white rounded-full px-2 py-0.5 text-[10px] font-black">{tests.filter(t => t.type === 'Speaking').length}</span>
                    <div className="absolute bottom-0 left-0 right-0 h-[3px] bg-indigo-600 rounded-t-md opacity-0 data-[state=active]:opacity-100 transition-opacity" />
                  </TabsTrigger>
                  <TabsTrigger value="mock-exams" className="relative pb-4 px-1 sm:px-2 rounded-none data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:text-indigo-600 text-slate-500 font-bold text-[13px] sm:text-[15px] tracking-tight hover:text-slate-700 dark:hover:text-slate-300">
                    Mock <span className="ml-2 bg-slate-100 dark:bg-slate-800 text-slate-500 data-[state=active]:bg-indigo-600 data-[state=active]:text-white rounded-full px-2 py-0.5 text-[10px] font-black">{tests.filter(t => t.is_full_mock).length}</span>
                    <div className="absolute bottom-0 left-0 right-0 h-[3px] bg-indigo-600 rounded-t-md opacity-0 data-[state=active]:opacity-100 transition-opacity" />
                  </TabsTrigger>
                </>
              ) : (
                <>
                  <TabsTrigger value="practice" className="relative pb-4 px-1 sm:px-2 rounded-none data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:text-indigo-600 text-slate-500 font-bold text-[13px] sm:text-[15px] tracking-tight hover:text-slate-700 dark:hover:text-slate-300">
                    Practice Tests
                    <span className={`ml-2 rounded-full px-2.5 py-0.5 text-[10px] font-black transition-colors ${activeTab === 'practice' ? 'bg-indigo-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'}`}>
                      {practiceTests.length}
                    </span>
                    <div className="absolute bottom-0 left-0 right-0 h-[3px] bg-indigo-600 rounded-t-md opacity-0 data-[state=active]:opacity-100 transition-opacity" />
                  </TabsTrigger>
                  <TabsTrigger value="mock" className="relative pb-4 px-1 sm:px-2 rounded-none data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:text-indigo-600 text-slate-500 font-bold text-[13px] sm:text-[15px] tracking-tight hover:text-slate-700 dark:hover:text-slate-300">
                    Mock Simulations
                    <span className={`ml-2 rounded-full px-2.5 py-0.5 text-[10px] font-black transition-colors ${activeTab === 'mock' ? 'bg-indigo-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'}`}>
                      {officialTests.length}
                    </span>
                    <div className="absolute bottom-0 left-0 right-0 h-[3px] bg-indigo-600 rounded-t-md opacity-0 data-[state=active]:opacity-100 transition-opacity" />
                  </TabsTrigger>
                </>
              )}
            </TabsList>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="hidden sm:flex rounded-xl border-slate-200 dark:border-slate-800 mb-4 font-bold text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-900 shadow-sm hover:bg-slate-50">
                  <Filter className="w-4 h-4 mr-2 text-slate-400" /> {selectedSubject} <ChevronDown className="w-4 h-4 ml-2 text-slate-400" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48 rounded-xl">
                <DropdownMenuItem onClick={() => { setSelectedSubject('All Subjects'); setPage(0); }} className="font-bold cursor-pointer rounded-lg">
                  All Subjects
                </DropdownMenuItem>
                {uniqueSubjects.map(sub => (
                  <DropdownMenuItem key={sub} onClick={() => { setSelectedSubject(sub); setPage(0); }} className="font-bold cursor-pointer rounded-lg">
                    {sub}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {isIELTS ? (
            <>
              <TabsContent value="reading" className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                {tests.filter(t => t.type === 'Reading').length > 0 ? (
                  renderPaginatedList(tests.filter(t => t.type === 'Reading'))
                ) : (
                  <EmptyState icon={<BookOpen className="w-8 h-8 text-slate-200" />} title="No Reading Sessions" href="/practice" onNavigate={navigate} />
                )}
              </TabsContent>
              <TabsContent value="listening" className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                {tests.filter(t => t.type === 'Listening').length > 0 ? (
                  renderPaginatedList(tests.filter(t => t.type === 'Listening'))
                ) : (
                  <EmptyState icon={<Headphones className="w-8 h-8 text-slate-200" />} title="No Listening Sessions" href="/practice" onNavigate={navigate} />
                )}
              </TabsContent>
              <TabsContent value="writing" className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                {tests.filter(t => t.type === 'Writing').length > 0 ? (
                  renderPaginatedList(tests.filter(t => t.type === 'Writing'))
                ) : (
                  <EmptyState icon={<FileText className="w-8 h-8 text-slate-200" />} title="No Writing Evaluations" href="/writing/lobby" onNavigate={navigate} />
                )}
              </TabsContent>
              <TabsContent value="speaking" className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                {tests.filter(t => t.type === 'Speaking').length > 0 ? (
                  renderPaginatedList(tests.filter(t => t.type === 'Speaking'))
                ) : (
                  <EmptyState icon={<Mic className="w-8 h-8 text-slate-200" />} title="No Speaking Sessions" href="/speaking" onNavigate={navigate} />
                )}
              </TabsContent>
              <TabsContent value="mock-exams" className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                {tests.filter(t => t.is_full_mock).length > 0 ? (
                  renderPaginatedList(tests.filter(t => t.is_full_mock))
                ) : (
                  <EmptyState icon={<Award className="w-8 h-8 text-slate-200" />} title="No Mock Exams" href="/mock-exams" onNavigate={navigate} />
                )}
              </TabsContent>
            </>
          ) : (
            <>
              <TabsContent value="practice" className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                {practiceTests.length > 0 ? (
                  renderPaginatedList(practiceTests)
                ) : (
                  <EmptyState icon={<Target className="w-8 h-8 text-slate-200" />} title="No Practice Missions" href="/practice" onNavigate={navigate} />
                )}
              </TabsContent>

              <TabsContent value="mock" className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                {officialTests.length > 0 ? (
                  renderPaginatedList(officialTests)
                ) : (
                  <EmptyState icon={<FileText className="w-8 h-8 text-slate-200" />} title="No Mock Simulations" href="/mock-exams" onNavigate={navigate} />
                )}
              </TabsContent>
            </>
          )}
        </Tabs>

        {/* Free Tier Upgrade Prompt */}
        {profile?.selected_plan === 'explorer' && (
          <div className="mt-8 p-6 sm:p-8 rounded-[1.5rem] bg-gradient-to-r from-[#2B1B76] via-[#3F2B96] to-[#2B1B76] shadow-xl relative overflow-hidden group flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="absolute inset-0 bg-white/5 opacity-50 bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:16px_16px]" />
            <div className="relative z-10 flex flex-col sm:flex-row items-center gap-6 text-center sm:text-left">
              <div className="w-16 h-16 rounded-full bg-indigo-500/20 flex items-center justify-center shrink-0 border border-indigo-400/30">
                <Crown className="w-8 h-8 text-indigo-300" />
              </div>
              <div className="space-y-1">
                <h3 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                  Unlock Full History
                </h3>
                <p className="text-sm font-medium text-indigo-200/80 max-w-lg leading-relaxed">
                  Upgrade to Italo Premium and get complete access to your test history, advanced analytics, and smart insights.
                </p>
              </div>
            </div>
            <Button
              onClick={openPricingModal}
              className="relative z-10 h-14 px-8 rounded-xl bg-white text-[#2B1B76] hover:bg-slate-50 font-bold text-sm shadow-xl group/btn shrink-0 w-full md:w-auto"
            >
              Upgrade Now
              <ArrowRight className="w-4 h-4 ml-2 group-hover/btn:translate-x-1 transition-transform" />
            </Button>
          </div>
        )}
      </div>
    </Layout>
  );
}
