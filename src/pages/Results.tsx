import { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import DiagramRenderer from '@/components/DiagramRenderer';
import QuestionMedia from '@/components/QuestionMedia';
import { MediaContent, DiagramData } from '@/types/test';
import Layout from '@/components/Layout';
import {
  ArrowLeft,
  CheckCircle,
  XCircle,
  MinusCircle,
  Clock,
  RotateCcw,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  Loader2,
  AlertTriangle,
  CheckCircle2,
  Target,
  X,
  ShieldCheck,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useExam } from '@/context/ExamContext';
import { usePlanAccess } from '@/hooks/usePlanAccess';
import { MathText } from '@/components/MathText';
import { UpgradeModal } from '@/components/UpgradeModal';
import { ReportQuestionDialog } from '@/components/ReportQuestionDialog';
import TrustpilotReviewModal from '@/components/TrustpilotReviewModal';
import SolutionsViewer from '@/components/SolutionsViewer';
import { generateResultReportPDF } from '@/utils/resultReportGenerator';
import { cn } from '@/lib/utils';

interface Question {
  id: string;
  question_number: number;
  question_text: string;
  options: string[];
  correct_index: number;
  user_answer: number | null;
  explanation: string | null;
  topic: string | null;
  difficulty: string;
  diagram: DiagramData | null;
  media?: MediaContent | null;
  time_spent_seconds: number | null;
  section_name?: string | null;
  subject?: string | null;
  master_question_id?: string;
  practice_question_id?: string | null;
  session_question_id?: string | null;
  source_table?: string;
  is_reported?: boolean;
  passage?: string;
}

interface TestResult {
  id: string;
  subject: string;
  topic: string | null;
  difficulty: string;
  total_questions: number;
  score: number;
  correct_answers: number;
  wrong_answers: number;
  skipped_answers: number;
  time_taken_seconds: number;
  time_limit_minutes: number;
  completed_at: string;
  test_type: string | null;
  exam_type: string | null;
  proctoring_status: string | null;
  violation_count: number | null;
  is_ranked?: boolean;
  is_mock?: boolean;
  session_id?: string | null;
}

const formatTime = (seconds: number) => {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}:${String(s).padStart(2, '0')}`.replace(/:\d+$/, `:${String(s).padStart(2, '0')}`);
};

const formatHMS = (seconds: number) => {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
};

// ─── Circular Score Ring ──────────────────────────────────────────────────────
function ScoreRing({ score, max, color = '#6366f1' }: { score: number; max: number; color?: string }) {
  const pct = max > 0 ? Math.min(score / max, 1) : 0;
  const r = 28;
  const circ = 2 * Math.PI * r;
  return (
    <div className="relative w-16 h-16 flex items-center justify-center">
      <svg width="64" height="64" viewBox="0 0 64 64" className="-rotate-90">
        <circle cx="32" cy="32" r={r} fill="none" stroke="#e2e8f0" strokeWidth="5" />
        <circle
          cx="32" cy="32" r={r} fill="none" stroke={color} strokeWidth="5"
          strokeDasharray={circ}
          strokeDashoffset={circ * (1 - pct)}
          strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 1s ease' }}
        />
      </svg>
      <span className="absolute text-sm font-black text-slate-800 dark:text-slate-100">{score}</span>
    </div>
  );
}



// ─── Main Component ───────────────────────────────────────────────────────────
export default function Results({ hideLayout = false }: { hideLayout?: boolean }) {
  const { testId, id } = useParams<{ testId?: string; id?: string }>();
  const effectiveTestId = testId || id;
  const { user } = useAuth();
  const navigate = useNavigate();
  const { activeExam, allExams } = useExam();
  const { toast } = useToast();
  const { hasPremiumAccess } = usePlanAccess();

  const [test, setTest] = useState<TestResult | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [rawScore, setRawScore] = useState<number | null>(null);
  const [testConfig, setTestConfig] = useState<any>(null);
  const [rankings, setRankings] = useState<{ user_rank: number; total_participants: number; leaderboard: any[] } | null>(null);
  const [userAttempts, setUserAttempts] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'summary' | 'leaderboard'>('summary');
  const [showSolutions, setShowSolutions] = useState(false);
  const [canViewExplanations, setCanViewExplanations] = useState(false);
  const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isSessionLive, setIsSessionLive] = useState(false);
  const [bookmarkedIds, setBookmarkedIds] = useState<Set<string>>(new Set());
  const [avgData, setAvgData] = useState<{ correct: number; incorrect: number; skipped: number; score: number } | null>(null);
  const [sessionTitle, setSessionTitle] = useState<string | null>(null);

  useEffect(() => {
    if (effectiveTestId) fetchResults();
  }, [effectiveTestId]);

  // Real-time leaderboard polling every 30 seconds
  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | null = null;
    if (!test || !(test.test_type === 'mock' || test.is_mock)) return;
    const fetchRankings = async () => {
      try {
        // Always pass p_session_id (null = exam-wide) to avoid PostgreSQL overload ambiguity
        const rpcParams = { p_exam_type: test.exam_type, p_session_id: test.session_id || null };
        const { data: lbData, error: lbError } = await (supabase as any)
          .rpc('get_mock_leaderboard', rpcParams);
        if (!lbError && lbData && Array.isArray(lbData) && lbData.length > 0) {
          const myEntry = lbData.find((e) => e.user_id === (user ? user.id : ''));
          setRankings({
            user_rank: myEntry ? myEntry.rank : 0,
            total_participants: lbData.length,
            leaderboard: lbData,
          });
        }
      } catch (e) {
        console.warn('Rankings poll error:', e);
      }
    };
    interval = setInterval(fetchRankings, 30000);
    return () => { if (interval) clearInterval(interval); };
  }, [test, user]);

  useEffect(() => {
    const checkExpertAccess = async () => {
      if (!user) { setCanViewExplanations(false); return; }
      const { data } = await (supabase as any).rpc('can_view_expert_explanations', { user_uuid: user.id });
      if (data && data.length > 0) setCanViewExplanations(data[0].allowed);
    };
    checkExpertAccess();
  }, [user]);

  const checkReviewEligibility = async () => {
    if (!user) return;
    try {
      const { data: tracking } = await (supabase as any).from('user_review_tracking').select('*').eq('user_id', user.id).maybeSingle();
      const now = Date.now();
      const thirty = 30 * 24 * 60 * 60 * 1000;
      if (tracking) {
        if (tracking.last_review_prompt_at && now - new Date(tracking.last_review_prompt_at).getTime() < thirty) return;
        if (tracking.last_review_submitted_at && now - new Date(tracking.last_review_submitted_at).getTime() < thirty) return;
      }
      const { count } = await supabase.from('tests').select('*', { count: 'exact', head: true }).eq('user_id', user.id).eq('status', 'completed');
      if (count && count >= 3) setShowReviewModal(true);
    } catch {
      const last = localStorage.getItem('trustpilot_last_prompt');
      if (!last || Date.now() - parseInt(last) > 30 * 24 * 60 * 60 * 1000) setShowReviewModal(true);
    }
  };

  const fetchResults = async () => {
    if (!effectiveTestId) return;
    setLoading(true);
    setIsSessionLive(false);
    setSessionTitle(null);
    setRankings(null);
    setAvgData(null);
    const { data: testData } = await (supabase as any)
      .from('tests').select('*').eq('id', effectiveTestId).maybeSingle();

    if (!testData) { setLoading(false); return; }
    setTest(testData as TestResult);

    const examConfig = allExams[testData.exam_type] || activeExam || Object.values(allExams)[0];
    setTestConfig(examConfig);

    // Fetch rankings for mock/ranked tests
    const isMockTest = testData.test_type === 'mock' || testData.is_mock;
    
    // Fetch user attempts for dropdown — all attempts of same mock (live + practice)
    // Scope by session_id (best), or fallback to subject match, or show only this test.
    let attemptsData: any[] = [];
    if (isMockTest) {
      let attemptsQuery = (supabase as any)
        .from('tests')
        .select('id, completed_at, score, correct_answers, is_ranked, session_id, subject')
        .eq('user_id', user?.id)
        .eq('exam_type', testData.exam_type)
        .eq('status', 'completed')
        .or('test_type.eq.mock,is_mock.eq.true');

      if (testData.session_id) {
        // Best: scope strictly to this session — shows ALL live + practice attempts of same mock
        attemptsQuery = attemptsQuery.eq('session_id', testData.session_id);
      } else if (testData.subject && testData.subject !== 'All Subjects' && testData.subject !== 'International Mock') {
        // Fallback: match by mock subject name
        attemptsQuery = attemptsQuery.eq('subject', testData.subject);
      } else {
        // Last resort: only show this single attempt
        attemptsQuery = attemptsQuery.eq('id', effectiveTestId);
      }

      const { data: attempts } = await attemptsQuery.order('completed_at', { ascending: false });
      if (attempts) attemptsData = attempts;
    }
    setUserAttempts(attemptsData);

    if (effectiveTestId && isMockTest) {
      try {
        // ── Rankings via SECURITY DEFINER function (bypasses RLS) ──
        // Scope to specific mock session if available
        // Always pass p_session_id (null = exam-wide) to avoid PostgreSQL overload ambiguity
        const rpcParams = { p_exam_type: testData.exam_type, p_session_id: testData.session_id || null };
        const { data: lbData, error: lbError } = await (supabase as any)
          .rpc('get_mock_leaderboard', rpcParams);
        
        if (lbError) {
          console.warn('Leaderboard RPC error:', lbError);
        } else if (lbData && Array.isArray(lbData) && lbData.length > 0) {
          const myEntry = lbData.find((e: any) => e.user_id === user?.id);
          setRankings({
            user_rank: myEntry?.rank || 0,
            total_participants: lbData.length,
            leaderboard: lbData,
          });
          // Compute global average from all participants' best attempts
          const cnt = lbData.length;
          if (cnt > 0) {
            setAvgData({
              correct: Math.round(lbData.reduce((s: number, t: any) => s + (t.correct_answers || 0), 0) / cnt),
              incorrect: Math.round(lbData.reduce((s: number, t: any) => s + (t.wrong_answers || 0), 0) / cnt),
              skipped: Math.round(lbData.reduce((s: number, t: any) => s + (t.skipped_answers || 0), 0) / cnt),
              score: Math.round(lbData.reduce((s: number, t: any) => s + (t.score || 0), 0) / cnt * 10) / 10,
            });
          }
        }
      } catch (e) {
        console.warn('Rankings fetch error:', e);
      }

      // Compute Average from leaderboard (all students' best attempts, bypasses RLS)
      // This is set inside the lbData block above (from get_mock_leaderboard)
    }

    // Robust Title Resolution
    let resolvedTitle = testData.subject || 'Test';
    const isMock = testData.test_type === 'mock' || testData.is_mock;
    const examName = examConfig?.name || testData.exam_type?.toUpperCase() || 'Exam';

    if (isMock && testData.session_id) {
      // Fetch session title if not already present
      const { data: session, error: sErr } = await (supabase as any)
        .from('mock_sessions')
        .select('is_active, title, start_time, end_time')
        .eq('id', testData.session_id)
        .maybeSingle();
      
      if (sErr) console.warn('Session check error:', sErr);
      if (session) {
        const now = new Date();
        const start = session.start_time ? new Date(session.start_time) : null;
        const end = session.end_time ? new Date(session.end_time) : null;
        const isCurrentlyLive = start && end && now >= start && now <= end;
        
        // Strictly use time window if available, otherwise fallback to is_active BUT ensure not past end time
        const isPast = end && now > end;
        if (!isPast && (isCurrentlyLive || session.is_active)) setIsSessionLive(true);
        if (session.title) {
          // If subject is "All Subjects" or matches the exam name/title, just use session title
          const isGenericSubject = !testData.subject ||
                                  testData.subject === 'All Subjects' ||
                                  testData.subject === 'International Mock' ||
                                  testData.subject.toLowerCase() === examName.toLowerCase() ||
                                  session.title.toLowerCase().includes(testData.subject.toLowerCase());
          
          resolvedTitle = isGenericSubject ? session.title : `${session.title} - ${testData.subject}`;
        }
      }
    } else if (isMock) {
      // Fallback for practice mocks or mocks without session title
      resolvedTitle = (!testData.subject || testData.subject === 'All Subjects')
        ? `${examName} Mock Test` 
        : testData.subject;
    }

    setSessionTitle(resolvedTitle);

    // Fetch questions
    const { data: questionsData } = await (supabase as any)
      .from('questions').select('*').eq('test_id', effectiveTestId).order('question_number');

    if (questionsData) {
      let finalQs = questionsData;
      const isMock = testData.test_type === 'mock' || testData.is_mock;

      if (isMock && testData.exam_type) {
        const cfg = allExams[testData.exam_type] || activeExam || Object.values(allExams)[0];
        if (cfg?.sections) {
          const sectionOrder = cfg.sections.map((s: any) => s.name.toLowerCase());
          const getName = (q: any) => {
            let name = (q.section_name || q.subject || q.topic || '').toLowerCase().trim();
            if (!name && cfg.sections) {
              const qNum = q.question_number || (questionsData.indexOf(q) + 1);
              let cum = 0;
              for (const sec of cfg.sections) {
                cum += sec.questionCount;
                if (qNum <= cum) { name = sec.name.toLowerCase(); break; }
              }
            }
            if (name.includes('math')) return 'mathematics';
            if (name.includes('logic') || name.includes('reasoning') || name.includes('texts')) return 'reasoning on texts and data';
            if (name.includes('bio')) return 'biology';
            if (name.includes('chem')) return 'chemistry';
            if (name.includes('phys')) return 'physics';
          };
          
          // Strict enforcement for cent-s-prep distribution
          if (testData.exam_type === 'cent-s-prep') {
            const mathQs = questionsData.filter(q => getName(q) === 'mathematics');
            const reasoningQs = questionsData.filter(q => getName(q) === 'reasoning on texts and data');
            const bioQs = questionsData.filter(q => getName(q) === 'biology');
            const chemQs = questionsData.filter(q => getName(q) === 'chemistry');
            const physQs = questionsData.filter(q => getName(q) === 'physics');
            
            // Re-order based on requested distribution: 15, 15, 10, 10, 5
            finalQs = [
              ...mathQs.sort((a,b) => (a.question_number || 0) - (b.question_number || 0)).slice(0, 15),
              ...reasoningQs.sort((a,b) => (a.question_number || 0) - (b.question_number || 0)).slice(0, 15),
              ...bioQs.sort((a,b) => (a.question_number || 0) - (b.question_number || 0)).slice(0, 10),
              ...chemQs.sort((a,b) => (a.question_number || 0) - (b.question_number || 0)).slice(0, 10),
              ...physQs.sort((a,b) => (a.question_number || 0) - (b.question_number || 0)).slice(0, 5)
            ];

            // If some questions weren't matched by getName, add them at the end
            const usedIds = new Set(finalQs.map(q => q.id));
            const remaining = questionsData.filter(q => !usedIds.has(q.id));
            finalQs = [...finalQs, ...remaining];
          }
        }
      }

      const mapped = finalQs.map((q: any, idx: number) => ({
        ...q, question_number: idx + 1, options: q.options as string[], diagram: q.diagram as DiagramData | null,
      }));
      setQuestions(mapped);

      // Fallback media fetch - ensure IDs are valid to prevent 400 errors
      const missing = mapped
        .filter((q: any) => (!q.passage || !q.media) && (q.master_question_id || q.practice_question_id || q.session_question_id))
        .map((q: any) => q.master_question_id || q.practice_question_id || q.session_question_id)
        .filter(Boolean);

      if (missing.length > 0) {
        // Chunk fetches to avoid URL length limits (400 errors)
        const batchSize = 30;
        let allExtra: any[] = [];
        for (let i = 0; i < missing.length; i += batchSize) {
          const batch = missing.slice(i, i + batchSize);
          const [pr, sr, lr] = await Promise.all([
            (supabase as any).from('practice_questions').select('id, passage, media, diagram').in('id', batch),
            (supabase as any).from('session_questions').select('id, passage, media, diagram').in('id', batch),
            (supabase as any).from('learning_quiz_questions').select('id').in('id', batch),
          ]);
          [pr, sr, lr].forEach(r => r.data?.forEach((m: any) => { if (m.passage || m.media || m.diagram) allExtra.push(m); }));
        }

        if (allExtra.length > 0) {
          const mm = new Map<string, any>();
          allExtra.forEach(m => mm.set(m.id, m));
          setQuestions(prev => prev.map(q => {
            const mid = q.master_question_id || q.practice_question_id || q.session_question_id;
            const master = mid ? mm.get(mid) : null;
            return master ? { ...q, passage: q.passage || master.passage, media: q.media || master.media, diagram: q.diagram || master.diagram } : q;
          }));
        }
      }

      // Compute raw score
      if (examConfig) {
        let raw = 0;
        mapped.forEach((q: any) => {
          if (q.user_answer === null) raw += examConfig.scoring.skipped;
          else if (q.user_answer === q.correct_index) raw += examConfig.scoring.correct;
          else raw += examConfig.scoring.incorrect;
        });
        setRawScore(Number(raw.toFixed(1)));
      }

      // Fetch reports
      if (user) {
        const mids = mapped.map((q: any) => q.master_question_id || q.id).filter(Boolean);
        if (mids.length > 0) {
          const { data: reps } = await (supabase as any).from('question_reports').select('master_question_id').eq('user_id', user.id).in('master_question_id', mids);
          if (reps) {
            const repSet = new Set(reps.map((r: any) => r.master_question_id));
            setQuestions(prev => prev.map(q => ({ ...q, is_reported: repSet.has(q.master_question_id || q.id) })));
          }
        }
      }

      if (testData.score >= 60 && testData.proctoring_status !== 'disqualified') checkReviewEligibility();
      
      // Fetch bookmarks
      if (user) {
        const { data: bks } = await (supabase as any).from('bookmarked_questions').select('question_id').eq('user_id', user.id);
        if (bks) setBookmarkedIds(new Set(bks.map((b: any) => b.question_id)));
      }
    }
    setLoading(false);
  };

  const handleBookmark = async (question: Question) => {
    if (!user) return;
    const isBookmarked = bookmarkedIds.has(question.id);
    try {
      if (isBookmarked) {
        await (supabase as any).from('bookmarked_questions').delete().eq('user_id', user.id).eq('question_id', question.id);
        setBookmarkedIds(prev => {
          const next = new Set(prev);
          next.delete(question.id);
          return next;
        });
        toast({ title: 'Bookmark Removed' });
      } else {
        await (supabase as any).from('bookmarked_questions').insert({
          user_id: user.id,
          question_id: question.id,
          master_question_id: question.master_question_id || question.id,
          source_table: question.source_table || (test?.test_type === 'practice' ? 'practice_questions' : 'session_questions'),
          exam_type: test?.exam_type || 'standard'
        });
        setBookmarkedIds(prev => {
          const next = new Set(prev);
          next.add(question.id);
          return next;
        });
        toast({ title: 'Question Bookmarked' });
      }
    } catch {
      toast({ title: 'Operation Failed', variant: 'destructive' });
    }
  };

  const handleReport = async (question: Question, reason: string, details?: string) => {
    if (!user) return;
    try {
      const { error } = await (supabase as any).from('question_reports').insert({
        user_id: user.id, question_id: question.id,
        master_question_id: question.master_question_id || question.id,
        reason, details, source_table: question.source_table || 'practice_questions',
      });
      if (error) throw error;
      
      // Auto bookmark on report (only if not already bookmarked)
      if (!bookmarkedIds.has(question.id)) {
        await handleBookmark(question);
      }

      toast({ title: 'Report Submitted', description: 'Question bookmarked for tracking.' });
      setQuestions(prev => prev.map(q => q.id === question.id ? { ...q, is_reported: true } : q));
    } catch {
      toast({ title: 'Report Failed', variant: 'destructive' });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
      </div>
    );
  }
  if (!test) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-slate-500">Result not found.</p>
      </div>
    );
  }

  const isMock = test.test_type === 'mock' || test.is_mock;
  const isPractice = !isMock;
  const totalQs = test.total_questions || questions.length;
  const attempted = test.correct_answers + test.wrong_answers;
  const accuracy = attempted > 0 ? Math.round((test.correct_answers / attempted) * 100) : 0;
  const completedPct = totalQs > 0 ? ((attempted / totalQs) * 100).toFixed(2) : '0.00';
  const marksObtained = rawScore !== null ? rawScore : test.score;
  const marksLost = testConfig ? Number((test.wrong_answers * Math.abs(testConfig.scoring.incorrect)).toFixed(1)) : 0;
  const marksSkipped = test.skipped_answers;
  const maxMarks = testConfig ? Number((totalQs * testConfig.scoring.correct).toFixed(0)) : totalQs;
  const topperEntry = rankings?.leaderboard?.[0];

  const handleDownloadReport = async () => {
    await generateResultReportPDF({
      test,
      sessionTitle,
      user,
      marksObtained: marksObtained as number,
      maxMarks,
      accuracy,
      completedPct,
      rankings,
      avgData,
      sectionPerf,
      isSessionLive,
    });
  };

  // Section-wise performance
  const sectionPerf = (() => {
    if (!testConfig?.sections) return [];
    let start = 0;
    return testConfig.sections.map((sec: any) => {
      const sqs = questions.slice(start, start + sec.questionCount);
      start += sec.questionCount;
      const correct = sqs.filter(q => q.user_answer === q.correct_index).length;
      const incorrect = sqs.filter(q => q.user_answer !== null && q.user_answer !== q.correct_index).length;
      const skipped = sqs.filter(q => q.user_answer === null).length;
      const acc = sqs.length > 0 ? Math.round((correct / sqs.length) * 100) : 0;
      const totalTime = sqs.reduce((s, q) => s + (q.time_spent_seconds || 0), 0);
      const rawSec = testConfig ? Number((correct * testConfig.scoring.correct + incorrect * testConfig.scoring.incorrect).toFixed(1)) : correct;
      return { name: sec.name, score: rawSec, correct, incorrect, skipped, accuracy: acc, timeSecs: totalTime };
    });
  })();

  return (
    <>
      {showSolutions && (
        <SolutionsViewer
          questions={questions}
          bookmarkedIds={bookmarkedIds}
          canViewExplanations={canViewExplanations}
          isPremium={hasPremiumAccess}
          onClose={() => setShowSolutions(false)}
          onBookmark={handleBookmark}
          onReport={handleReport}
          onUpgrade={() => setIsUpgradeModalOpen(true)}
        />
      )}
      {hideLayout ? (
        <div className="min-h-screen bg-background overflow-x-hidden">
          {/* Main content directly */}
          <div className="max-w-6xl mx-auto px-1 sm:px-4 py-1 sm:py-8 overflow-x-hidden">
            <ResultsContent />
          </div>
        </div>
      ) : (
        <Layout>
          <div className="min-h-screen bg-background pb-12 overflow-x-hidden">
            <div className="max-w-6xl mx-auto px-3 sm:px-4 py-4 sm:py-8">
              <ResultsContent />
            </div>
          </div>
        </Layout>
      )}
    </>
  );

  function ResultsContent() {
    return (
      <>

          {/* ── Header Card ─────────────────────────────────────────── */}
          <div className="bg-white dark:bg-card rounded-2xl border border-slate-200 dark:border-border shadow-sm p-3 sm:p-5 mb-4 relative overflow-hidden">
            <div className="absolute right-0 top-0 w-48 h-full opacity-10 pointer-events-none">
              <svg viewBox="0 0 200 120" className="w-full h-full" fill="none">
                <circle cx="160" cy="20" r="80" fill="#6366f1" />
              </svg>
            </div>
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 relative z-10">
              <div>
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <button onClick={() => navigate(-1)} className="p-1.5 rounded-lg hover:bg-slate-100 transition-colors">
                    <ArrowLeft className="w-4 h-4 text-slate-500" />
                  </button>
                  <h1 className="text-base sm:text-xl font-black text-slate-900 dark:text-white">
                    {sessionTitle || test.subject || test.exam_type?.toUpperCase() || 'Test'}
                    {rankings && (
                      <span className={cn(
                        "ml-2 text-xs font-bold px-2 py-0.5 rounded-full border",
                        isSessionLive 
                          ? "text-rose-600 bg-rose-50 border-rose-100 animate-pulse" 
                          : test.is_ranked 
                            ? "text-indigo-600 bg-indigo-50 border-indigo-100 dark:bg-indigo-900/20 dark:border-indigo-900/50"
                            : "text-slate-500 bg-slate-50 border-slate-200 dark:bg-slate-800 dark:border-slate-700"
                      )}>
                        {isSessionLive 
                          ? '🔴 Live Mock Test' 
                          : test.is_ranked 
                            ? 'Took in Live' 
                            : 'Practice Mock Test'}
                      </span>
                    )}
                  </h1>
                </div>
                
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] sm:text-xs text-slate-500 font-medium sm:ml-8 mt-1.5 sm:mt-1">
                  <span className="flex items-center gap-1.5">
                    <span className="text-orange-500">⊙</span> {totalQs} Qs • {maxMarks} Marks
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5" /> {testConfig?.durationMinutes || test.time_limit_minutes || Math.round((test.time_taken_seconds || 0) / 60)}m
                  </span>
                  {test.completed_at && (
                    <span className="flex items-center gap-1.5">
                      <span>📅</span> {new Date(test.completed_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0 self-start sm:self-auto">
                <select 
                  className="text-xs font-semibold border border-slate-200 dark:border-border rounded-lg px-3 py-2 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-300"
                  value={effectiveTestId}
                  onChange={(e) => navigate(`/results/${e.target.value}`)}
                >
                  {userAttempts.map((att, i) => {
                    const bestAttempt = [...userAttempts].sort((a, b) => (b.correct_answers || 0) - (a.correct_answers || 0))[0];
                    const isBest = att.id === bestAttempt?.id;
                    const mode = att.is_ranked ? '[Live]' : '[Practice]';
                    return (
                      <option key={att.id} value={att.id}>
                        {isBest ? '⭐ ' : ''}Attempt {userAttempts.length - i} {mode} ({new Date(att.completed_at).toLocaleDateString()})
                      </option>
                    );
                  })}
                  {userAttempts.length === 0 && <option value={testId}>Attempt 1</option>}
                </select>
              </div>
            </div>
            <div className="flex flex-wrap gap-2 sm:gap-3 mt-4 sm:mt-5 sm:ml-8 border-t border-slate-50 pt-3 sm:pt-0 sm:border-0 overflow-x-auto sm:overflow-visible pb-1 sm:pb-0">
               <Button
                variant="outline"
                size="sm"
                className="bg-emerald-600 hover:bg-emerald-700 text-white border-none font-black text-[10px] sm:text-xs gap-2 px-3 sm:px-4 shadow-sm shrink-0"
                onClick={handleDownloadReport}
              >
                <span>📥</span> Download
              </Button>

              <Button
                size="sm"
                onClick={() => setShowSolutions(true)}
                className="text-[10px] sm:text-xs font-black bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl shadow-sm shrink-0"
              >
                View Solutions
              </Button>
            </div>
          </div>

          {/* ── Tabs ────────────────────────────────────────────────── */}
          <div className="flex gap-1 bg-white dark:bg-card border border-slate-200 dark:border-border rounded-2xl p-1 mb-4 w-fit shadow-sm overflow-x-auto max-w-full">
            {['summary', ...(isMock ? ['leaderboard'] : [])].map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab as any)}
                className={cn(
                  'px-5 py-2 rounded-xl text-sm font-bold transition-all capitalize',
                  activeTab === tab
                    ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm border border-slate-200 dark:border-border'
                    : 'text-slate-400 hover:text-slate-700 dark:text-slate-500 dark:hover:text-slate-300'
                )}
              >
                {tab === 'summary' ? 'Result Summary' : 'Leaderboard'}
              </button>
            ))}
          </div>

          {/* ═══════════════════════════════════════════════════════════
              RESULT SUMMARY TAB
          ══════════════════════════════════════════════════════════════ */}
          {activeTab === 'summary' && (
            <div className="space-y-4">

              {/* ── Score + Rank Row ──────────────────────────────────── */}
              <div className={cn('grid gap-4', isMock ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-1 max-w-sm')}>
                {/* Score card */}
                <div className="bg-white dark:bg-card rounded-2xl border border-slate-200 dark:border-border shadow-sm p-5">
                  <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">SCORE</p>
                  <p className="text-4xl font-black text-slate-900 dark:text-white leading-none">
                    {marksObtained}
                    <span className="text-base font-bold text-slate-400">/{maxMarks}</span>
                  </p>
                  <p className="text-xs text-slate-400 mt-1 font-medium">
                    Percentile: <span className="font-bold text-slate-700 dark:text-slate-300">
                      {rankings?.user_rank && rankings.total_participants
                        ? (((rankings.total_participants - rankings.user_rank + 1) / rankings.total_participants) * 100).toFixed(1)
                        : '—'}
                    </span>
                  </p>
                </div>

                {/* Rank card - only for mock */}
                {isMock && (
                  <div className="bg-emerald-50 dark:bg-emerald-900/10 rounded-2xl border border-emerald-200 dark:border-emerald-900/50 shadow-sm p-5 relative overflow-hidden">
                    <div className="absolute right-3 bottom-2 opacity-20 text-5xl">🏆</div>
                    <p className="text-xs font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-widest mb-1">RANK <span className="lowercase font-bold opacity-80">(best attempt)</span></p>
                    <p className="text-4xl font-black text-emerald-700 dark:text-emerald-300 leading-none">
                      {rankings?.user_rank ?? '—'}
                    </p>
                    <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-1 font-medium">
                      {rankings ? `of ${rankings.total_participants} students` : 'Applying ranking updates...'}
                    </p>
                  </div>
                )}
              </div>

              {/* ── Your Progress ─────────────────────────────────────── */}
              <div className="bg-white dark:bg-card rounded-2xl border border-slate-200 dark:border-border shadow-sm p-5">
                <h3 className="text-sm font-black text-slate-700 dark:text-slate-200 mb-4">Your Progress</h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  {/* Row 1 */}
                  <div>
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
                      <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Correct</span>
                    </div>
                    <p className="text-sm font-black text-slate-900 dark:text-white">{test.correct_answers}/{totalQs}</p>
                    <div className="h-0.5 bg-emerald-500 mt-1.5 rounded-full" style={{ width: `${(test.correct_answers / totalQs) * 100}%` }} />
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <XCircle className="w-3.5 h-3.5 text-red-500" />
                      <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Incorrect</span>
                    </div>
                    <p className="text-sm font-black text-slate-900 dark:text-white">{test.wrong_answers}/{totalQs}</p>
                    <div className="h-0.5 bg-red-400 mt-1.5 rounded-full" style={{ width: `${(test.wrong_answers / totalQs) * 100}%` }} />
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <MinusCircle className="w-3.5 h-3.5 text-slate-400" />
                      <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Skipped</span>
                    </div>
                    <p className="text-sm font-black text-slate-900 dark:text-white">{test.skipped_answers}/{totalQs}</p>
                    <div className="h-0.5 bg-slate-300 mt-1.5 rounded-full" style={{ width: `${(test.skipped_answers / totalQs) * 100}%` }} />
                  </div>
                  {/* Row 2 */}
                  <div>
                    <p className="text-xs text-slate-400 font-medium mb-0.5">Marks Obtained</p>
                    <p className="text-sm font-black text-emerald-600">+{rawScore ?? marksObtained}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-400 font-medium mb-0.5">Marks Lost</p>
                    <p className="text-sm font-black text-red-500">-{marksLost}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-400 font-medium mb-0.5">Marks Skipped</p>
                    <p className="text-sm font-black text-slate-500">{marksSkipped}</p>
                  </div>
                  {/* Row 3 */}
                  <div>
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <span className="text-indigo-500 text-xs">◎</span>
                      <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Accuracy</span>
                    </div>
                    <p className="text-sm font-black text-slate-900 dark:text-white">{accuracy}%</p>
                    <div className="h-0.5 bg-indigo-400 mt-1.5 rounded-full" style={{ width: `${accuracy}%` }} />
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <span className="text-emerald-500 text-xs">✓</span>
                      <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Completed</span>
                    </div>
                    <p className="text-sm font-black text-slate-900 dark:text-white">{completedPct}%</p>
                    <div className="h-0.5 bg-emerald-300 mt-1.5 rounded-full" style={{ width: `${completedPct}%` }} />
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Time Taken</span>
                    </div>
                    <p className="text-sm font-black text-slate-900 dark:text-white">{formatHMS(test.time_taken_seconds)}</p>
                  </div>
                </div>
              </div>

                            {/* ── Section Wise Performance ─────────────────── */}
              {sectionPerf.length > 0 && (
                <div className="bg-white dark:bg-card rounded-2xl border border-slate-200 dark:border-border shadow-sm p-5">
                  <h3 className="text-sm font-black text-slate-700 dark:text-slate-200 mb-4">Section Wise Performance</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs sm:text-sm">
                      <thead>
                        <tr className="text-slate-400 font-black uppercase tracking-widest text-[10px] border-b border-slate-50 dark:border-slate-800">
                          <th className="pb-3 pr-4 font-black">Section</th>
                          <th className="pb-3 pr-4 font-black">Score</th>
                          <th className="pb-3 pr-4 font-black text-emerald-500">Correct</th>
                          <th className="pb-3 pr-4 font-black text-red-500">Incorrect</th>
                          <th className="pb-3 pr-4 font-black text-slate-400">Skipped</th>
                          <th className="pb-3 pr-4 font-black">Accuracy</th>
                          <th className="pb-3 font-black">Time</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                        {sectionPerf.map((sec, i) => (
                          <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                            <td className="py-2 pr-4 font-semibold text-slate-800 dark:text-slate-200 whitespace-nowrap">{sec.name}</td>
                            <td className="py-2 pr-4 text-slate-600 dark:text-slate-400 font-bold">{sec.score}</td>
                            <td className="py-2 pr-4 text-slate-700 dark:text-slate-300 font-medium">{sec.correct}</td>
                            <td className="py-2 pr-4 text-slate-700 dark:text-slate-300">{sec.incorrect}</td>
                            <td className="py-2 pr-4 text-slate-700 dark:text-slate-300">{sec.skipped}</td>
                            <td className="py-2 pr-4 text-slate-700 dark:text-slate-300">{sec.accuracy}%</td>
                            <td className="py-2 text-slate-600 dark:text-slate-400 whitespace-nowrap">{formatHMS(sec.timeSecs)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="mt-5 flex justify-center">
                    <Button
                      onClick={() => navigate(`${hideLayout ? '/mobile' : ''}/detailed-analysis/${effectiveTestId}`)}
                      className="bg-indigo-600 hover:bg-indigo-500 text-white font-black text-xs rounded-xl px-6 shadow-sm"
                    >
                      Detailed Analysis <ChevronRight className="w-4 h-4 ml-1" />
                    </Button>
                  </div>
                </div>
              )}

              {(rankings || avgData) && ( <div> <h3 className="text-sm font-black text-slate-700 dark:text-slate-200 mb-3">Performance Comparison</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {/* You */}
                    <div className="bg-white dark:bg-card rounded-2xl border border-slate-200 dark:border-border shadow-sm p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <p className="font-black text-slate-800 dark:text-slate-200 text-sm">{user?.user_metadata?.display_name || user?.email?.split('@')[0] || 'You'}</p>
                          <p className="text-xs text-slate-400 font-medium">
                            {isMock ? 'Live Mock Test' : test.subject}
                          </p>
                        </div>
                        <span className="text-2xl">🧑‍💻</span>
                      </div>
                      <div className="flex items-center gap-3 mb-3">
                        <ScoreRing score={marksObtained as number} max={maxMarks} color="#6366f1" />
                        <div>
                          <p className="text-xs text-slate-400 font-medium">Score</p>
                          <p className="text-xs text-slate-500">Out of {maxMarks}</p>
                        </div>
                      </div>
                      <div className="space-y-2 text-xs">
                        {[
                          { label: 'Correct', val: `${test.correct_answers}/${totalQs}`, color: 'bg-emerald-500' },
                          { label: 'Incorrect', val: `${test.wrong_answers}/${totalQs}`, color: 'bg-red-400' },
                          { label: 'Skipped', val: `${test.skipped_answers}/${totalQs}`, color: 'bg-slate-300' },
                          { label: 'Accuracy', val: `${accuracy}%`, color: 'bg-indigo-400' },
                        ].map(({ label, val, color }) => (
                          <div key={label}>
                            <div className="flex justify-between text-slate-500 dark:text-slate-400 font-medium mb-0.5">
                              <span>{label}</span><span className="font-bold text-slate-700 dark:text-slate-200">{val}</span>
                            </div>
                            <div className="h-0.5 bg-slate-100 dark:bg-slate-800 rounded-full"><div className={`h-full ${color} rounded-full`} style={{ width: label === 'Accuracy' ? `${accuracy}%` : `${(parseInt(val) / totalQs) * 100}%` }} /></div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Topper */}
                    <div className="bg-white dark:bg-card rounded-2xl border border-slate-200 dark:border-border shadow-sm p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <p className="font-black text-slate-800 dark:text-slate-200 text-sm">Topper</p>
                          <p className="text-xs text-slate-400 font-medium">Exam Stats</p>
                        </div>
                        <span className="text-2xl">🥇</span>
                      </div>
                      {topperEntry ? (() => {
                        const tScore = testConfig
                          ? Number(((topperEntry.correct_answers || 0) * testConfig.scoring.correct + (topperEntry.wrong_answers || 0) * testConfig.scoring.incorrect).toFixed(1))
                          : topperEntry.score;
                        const tCorrect = topperEntry.correct_answers || 0;
                        const tIncorrect = topperEntry.wrong_answers || 0;
                        const tSkipped = topperEntry.skipped_answers || 0;
                        const tAcc = (tCorrect + tIncorrect) > 0 ? Math.round((tCorrect / (tCorrect + tIncorrect)) * 100) : 0;
                        return (
                          <>
                            <div className="flex items-center gap-3 mb-3">
                              <ScoreRing score={tScore} max={maxMarks} color="#f59e0b" />
                              <div>
                                <p className="text-xs text-slate-400 font-medium">Score</p>
                                <p className="text-xs text-slate-500">Out of {maxMarks}</p>
                              </div>
                            </div>
                            <div className="space-y-2 text-xs">
                              {[
                                { label: 'Correct', val: `${tCorrect}/${totalQs}`, pct: tCorrect / totalQs * 100, color: 'bg-emerald-500' },
                                { label: 'Incorrect', val: `${tIncorrect}/${totalQs}`, pct: tIncorrect / totalQs * 100, color: 'bg-red-400' },
                                { label: 'Skipped', val: `${tSkipped}/${totalQs}`, pct: tSkipped / totalQs * 100, color: 'bg-slate-300' },
                                { label: 'Accuracy', val: `${tAcc}%`, pct: tAcc, color: 'bg-amber-400' },
                              ].map(({ label, val, pct, color }) => (
                                <div key={label}>
                                  <div className="flex justify-between text-slate-500 dark:text-slate-400 font-medium mb-0.5">
                                    <span>{label}</span><span className="font-bold text-slate-700 dark:text-slate-200">{val}</span>
                                  </div>
                                  <div className="h-0.5 bg-slate-100 dark:bg-slate-800 rounded-full"><div className={`h-full ${color} rounded-full`} style={{ width: `${pct}%` }} /></div>
                                </div>
                              ))}
                            </div>
                          </>
                        );
                      })() : <p className="text-xs text-slate-400 mt-4">No data yet</p>}
                    </div>

                    {/* Average */}
                    <div className="bg-white dark:bg-card rounded-2xl border border-slate-200 dark:border-border shadow-sm p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <p className="font-black text-slate-800 dark:text-slate-200 text-sm">Average</p>
                          <p className="text-xs text-slate-400 font-medium">Exam Stats</p>
                        </div>
                        <span className="text-2xl">👥</span>
                      </div>
                      {avgData ? (() => {
                        const aScore = testConfig
                          ? Number((avgData.correct * testConfig.scoring.correct + avgData.incorrect * testConfig.scoring.incorrect).toFixed(1))
                          : avgData.score;
                        const aAcc = (avgData.correct + avgData.incorrect) > 0 ? Math.round(avgData.correct / (avgData.correct + avgData.incorrect) * 100) : 0;
                        return (
                          <>
                            <div className="flex items-center gap-3 mb-3">
                              <ScoreRing score={aScore} max={maxMarks} color="#10b981" />
                              <div>
                                <p className="text-xs text-slate-400 font-medium">Score</p>
                                <p className="text-xs text-slate-500">Out of {maxMarks}</p>
                              </div>
                            </div>
                            <div className="space-y-2 text-xs">
                              {[
                                { label: 'Correct', val: `${avgData.correct}/${totalQs}`, pct: avgData.correct / totalQs * 100, color: 'bg-emerald-500' },
                                { label: 'Incorrect', val: `${avgData.incorrect}/${totalQs}`, pct: avgData.incorrect / totalQs * 100, color: 'bg-red-400' },
                                { label: 'Skipped', val: `${avgData.skipped}/${totalQs}`, pct: avgData.skipped / totalQs * 100, color: 'bg-slate-300' },
                                { label: 'Accuracy', val: `${aAcc}%`, pct: aAcc, color: 'bg-emerald-400' },
                              ].map(({ label, val, pct, color }) => (
                                <div key={label}>
                                  <div className="flex justify-between text-slate-500 dark:text-slate-400 font-medium mb-0.5">
                                    <span>{label}</span><span className="font-bold text-slate-700 dark:text-slate-200">{val}</span>
                                  </div>
                                  <div className="h-0.5 bg-slate-100 dark:bg-slate-800 rounded-full"><div className={`h-full ${color} rounded-full`} style={{ width: `${pct}%` }} /></div>
                                </div>
                              ))}
                            </div>
                          </>
                        );
                      })() : <p className="text-xs text-slate-400 mt-4">No data yet</p>}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ═══════════════════════════════════════════════════════════
              LEADERBOARD TAB (mock only)
          ══════════════════════════════════════════════════════════════ */}
          {activeTab === 'leaderboard' && isMock && (
            <div className="space-y-4">
              

              <div className="bg-white dark:bg-card rounded-2xl border border-slate-200 dark:border-border shadow-sm overflow-hidden">
              <p className="text-xs text-slate-400 font-medium px-5 pt-4 pb-2">
                *Leaderboard shows top 10 students on the basis of best attempt
              </p>
              <div className="divide-y divide-slate-50 dark:divide-slate-800">
                {(rankings?.leaderboard || []).map((entry: any, idx: number) => {
                  const isMe = entry.user_id === user?.id;
                  const initials = (entry.display_name || 'A').charAt(0).toUpperCase();
                  return (
                    <div key={idx} className={cn(
                      'flex items-center gap-4 px-5 py-4 transition-colors',
                      isMe ? 'bg-amber-50 dark:bg-amber-900/20 border-l-4 border-amber-400' : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'
                    )}>
                      <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center overflow-hidden shrink-0">
                        {entry.avatar_url
                          ? <img src={entry.avatar_url} alt="" className="w-full h-full object-cover" />
                          : <span className="text-slate-600 dark:text-slate-400 font-black text-sm">{initials}</span>
                        }
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={cn('font-black text-sm truncate', isMe ? 'text-amber-800 dark:text-amber-300' : 'text-slate-800 dark:text-slate-200')}>{entry.display_name || 'Anonymous'}</p>
                        <p className="text-xs text-slate-400 font-medium">
                          {testConfig
                            ? Number(((entry.correct_answers || 0) * testConfig.scoring.correct + (entry.wrong_answers || 0) * testConfig.scoring.incorrect).toFixed(1))
                            : entry.score} Marks • {entry.correct_answers || 0} Correct
                        </p>
                      </div>
                      {/* Rank badge */}
                      <div className={cn(
                        'w-9 h-9 rounded-xl flex items-center justify-center text-sm font-black shrink-0',
                        entry.rank === 1 ? 'bg-amber-400 text-white' :
                          entry.rank === 2 ? 'bg-slate-400 text-white' :
                            entry.rank === 3 ? 'bg-orange-400 text-white' :
                              'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-800'
                      )}>
                        {entry.rank}
                      </div>
                    </div>
                  );
                })}

                {/* Current user row if not in top 10 */}
                {(() => {
                  const inTop10 = rankings?.leaderboard?.some((e: any) => e.user_id === user?.id);
                  if (!inTop10 && rankings?.user_rank) {
                    return (
                      <div className="flex items-center gap-4 px-5 py-4 bg-amber-50 dark:bg-amber-900/20 border-l-4 border-amber-400 border-t-2 border-t-amber-200 dark:border-t-amber-900">
                        <div className="w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center shrink-0">
                          <span className="text-amber-700 dark:text-amber-300 font-black text-sm">
                            {(user?.user_metadata?.display_name || user?.email || 'Y').charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div className="flex-1">
                          <p className="font-black text-sm text-amber-800 dark:text-amber-300">{user?.user_metadata?.display_name || 'You'}</p>
                          <p className="text-xs text-amber-600 dark:text-amber-400 font-medium">
                            {marksObtained} Marks • {test.correct_answers} Correct
                          </p>
                        </div>
                        <div className="w-14 h-9 rounded-xl bg-amber-200 dark:bg-amber-900 flex items-center justify-center font-black text-sm text-amber-800 dark:text-amber-200">
                          #{rankings.user_rank}
                        </div>
                      </div>
                    );
                  }
                  return null;
                })()}
                {(!rankings || rankings.leaderboard?.length === 0) && (
                  <div className="px-5 py-12 text-center bg-white dark:bg-card rounded-2xl border border-dashed border-slate-200 dark:border-border">
                    <div className="w-12 h-12 rounded-full bg-slate-50 dark:bg-slate-800 flex items-center justify-center mx-auto mb-3">
                      <Target className="w-6 h-6 text-slate-300" />
                    </div>
                    <p className="text-sm font-bold text-slate-600 dark:text-slate-300 mb-1">
                      {!rankings ? 'Ranking Engine Updating...' : 'No data yet'}
                    </p>
                    <p className="text-xs text-slate-400 font-medium max-w-[240px] mx-auto">
                      {!rankings 
                        ? 'We are currently calculating your rank among other students. This usually takes a few minutes after the test completion.'
                        : 'No other students have participated in this mock session yet.'}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )
      }

      <UpgradeModal
        isOpen={isUpgradeModalOpen}
        onClose={() => setIsUpgradeModalOpen(false)}
        title="Unlock Expert Explanations"
        description="Upgrade to PRO to access detailed, step-by-step logic explanations for every question."
        feature="Deep Logic Explanations"
      />
      <TrustpilotReviewModal
        open={showReviewModal}
        onClose={() => { setShowReviewModal(false); localStorage.setItem('trustpilot_last_prompt', Date.now().toString()); }}
        trigger="test_completion"
      />
      </>
    );
  }
}
