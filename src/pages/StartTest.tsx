import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import {
  Brain,
  ArrowLeft,
  PlayCircle,
  BookOpen,
  Clock,
  Target,
  ChevronDown,
  Zap,
  ShieldCheck,
  Check,
  Shield,
  Server,
  Lock
} from 'lucide-react';
import { useExam } from '@/context/ExamContext';
import { usePlanAccess } from '@/hooks/usePlanAccess';
import Layout from '@/components/Layout';
import { UpgradeModal } from '@/components/UpgradeModal';
import { useActiveTest } from '@/hooks/useActiveTest';
import { ToastAction } from '@/components/ui/toast';
import { motion, AnimatePresence } from 'framer-motion';
import { readDashboardCache, invalidateDashboardCache } from '@/hooks/useDashboardPrefetch';
// EXAMS import removed

const DIFFICULTIES = [
  { value: 'easy', label: 'Easy', description: 'Basic concepts', color: 'text-emerald-500' },
  { value: 'medium', label: 'Medium', description: 'Moderate difficulty', color: 'text-orange-500' },
  { value: 'hard', label: 'Hard', description: 'Advanced problems', color: 'text-rose-500' },
  { value: 'mixed', label: 'Mixed', description: 'All levels', color: 'text-indigo-500' },
];

export default function StartTest() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { activeExam, allExams } = useExam();
  const [searchParams] = useSearchParams();
  const { hasReachedSubjectLimit, hasReachedMockLimit, getRemainingQuestions, isExplorer } = usePlanAccess();
  const { activeTest } = useActiveTest();

  const [subject, setSubject] = useState(searchParams.get('subject') || 'Mathematics');
  const [topic, setTopic] = useState('');
  const [availableTopics, setAvailableTopics] = useState<{ name: string; count: number }[]>([]);
  const [isLoadingTopics, setIsLoadingTopics] = useState(false);
  const [difficulty, setDifficulty] = useState('medium');
  const [questionCount, setQuestionCount] = useState(Number(searchParams.get('count')) || 10);
  const [timeLimit, setTimeLimit] = useState(30);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false);

  // Fetch unique topics for the selected subject
  useEffect(() => {
    const fetchTopics = async () => {
      if (!activeExam || !subject) return;
      setIsLoadingTopics(true);

      try {
        const { data, error } = await (supabase as any)
          .from('practice_questions')
          .select('topic')
          .eq('exam_type', activeExam.id)
          .eq('subject', subject);

        if (!error && data) {
          const counts: Record<string, number> = {};
          data.forEach((q: any) => {
            if (q.topic) {
              counts[q.topic] = (counts[q.topic] || 0) + 1;
            }
          });

          const sortedTopics = Object.entries(counts)
            .map(([name, count]) => ({ name, count }))
            .sort((a, b) => b.count - a.count);

          setAvailableTopics(sortedTopics);
          // Only reset topic if current topic is not in the new list and not 'all'
          if (topic !== 'all' && !counts[topic]) {
            setTopic('all');
          }
        }
      } catch (err) {
        console.error('Error fetching topics:', err);
      } finally {
        setIsLoadingTopics(false);
      }
    };

    fetchTopics();
  }, [subject, activeExam?.id]);

  // Auto-start for Mock Simulation or Direct "Consult" Missions
  useEffect(() => {
    const mode = searchParams.get('mode');
    const fullExam = searchParams.get('full_exam') === 'true';
    const autoLaunch = searchParams.get('auto') === 'true';

    // For full exams (mock), allow auto-start for both authenticated and guest users
    // For regular practice, wait for authenticated user
    if (!loading && activeExam) {
      if (activeTest) {
        const examConfig = allExams[activeTest.exam_type];
        const isSectioned = !!(examConfig && examConfig.sections && examConfig.sections.length > 1);

        toast({
          title: "Active Mission Found",
          description: `You must complete ${activeTest.subject} before starting another.`,
          variant: "destructive",
          action: (
            <ToastAction
              altText="Resume Test"
              onClick={() => navigate(`/test/${activeTest.id}`)}
            >
              Resume
            </ToastAction>
          ),
        });
        navigate('/dashboard');
        return;
      }

      if (fullExam) {
        handleStartTest(true);
      } else if (user && autoLaunch) {
        // Regular practice requires authentication
        handleStartTest(false);
      }
    }
  }, [loading, searchParams]); // Removed user dependency to allow guest auto-start

  const handleStartTest = async (isFullMock = false) => {
    const sessionId = searchParams.get('session_id');
    const isPracticeMode = searchParams.get('practice_mode') === 'true';
    let sessionDuration: number | null = null;
    const finalCount = questionCount;

    // For mock tests, check if we should allow guest access
    const isGuestAllowed = isFullMock;

    if (!user && !isGuestAllowed) {
      toast({
        title: 'Authentication Required',
        description: 'Please log in to access this feature.',
        variant: 'destructive',
      });
      navigate('/auth');
      return;
    }

    // Only check limits for authenticated users
    if (user && hasReachedSubjectLimit(isFullMock ? 'Mock Simulation' : subject)) {
      setIsUpgradeModalOpen(true);
      return;
    }

    setIsGenerating(true);

    try {
      if (!activeExam) throw new Error("No active exam selected");
      const genericMockSubjects = ['all subjects', 'mathematics', 'international mock', 'mock simulation', 'practice quest', 'official simulation'];
      let finalSubject = subject;
      
      // If mock mode and subject is generic/missing, use exam-specific mock name as default
      if (isFullMock && (!subject || genericMockSubjects.includes(subject.toLowerCase()))) {
        finalSubject = `${activeExam?.name} Mock Test`;
      }
      
      console.log("[StartTest] Initial finalSubject:", finalSubject, "isFullMock:", isFullMock, "sessionId:", sessionId);

      // If we have a sessionId, fetch the real session title for the test record
      if (isFullMock && sessionId) {
        try {
          console.log("[StartTest] Fetching session title for sessionId:", sessionId);
          const { data: sessionData, error: sessionFetchError } = await supabase
            .from('mock_sessions')
            .select('title, duration, is_sections_locked, section_timing_mode')
            .eq('id', sessionId)
            .maybeSingle();
            
          if (sessionFetchError) {
            console.error("[StartTest] Error fetching session title:", sessionFetchError);
          } else if (sessionData) {
            if (sessionData.title) {
              console.log("[StartTest] Found session title:", sessionData.title);
              finalSubject = sessionData.title;
            }
            if (sessionData.duration) {
               console.log("[StartTest] Found session duration:", sessionData.duration);
               sessionDuration = sessionData.duration;
            }
            if (sessionData.is_sections_locked !== undefined) {
                (window as any)._session_is_sections_locked = sessionData.is_sections_locked;
            }
            if (sessionData.section_timing_mode) {
                (window as any)._session_section_timing_mode = sessionData.section_timing_mode;
            }
          } else {
            console.warn("[StartTest] No session found for ID:", sessionId);
          }
        } catch (e) {
          console.error("[StartTest] Exception fetching session title:", e);
        }
      }
      
      console.log("[StartTest] Final resolved subject for DB:", finalSubject);

      let questions: any[] = [];

      // 0. Fetch solved question IDs to avoid repeats (only for authenticated users)
      const solvedIds: string[] = [];
      if (user) {
        const { data: solvedData } = await (supabase as any)
          .from('user_practice_responses')
          .select('question_id')
          .eq('user_id', user.id);
        solvedIds.push(...(solvedData?.map((r: any) => r.question_id) || []));
      }

      // 1. Fetch from Manual Practice Bank or Session Questions
      if (isFullMock) {
        // Check if this is a session-based mock (has session_id)
        if (sessionId) {
          // Fetch questions from session_questions table (Admin-defined)
          const { data: sessionQuestions, error: sessionError } = await (supabase as any)
            .from('session_questions')
            .select('*')
            .eq('session_id', sessionId)
            .order('order_index');

          if (sessionError) throw sessionError;

          if (!sessionQuestions || sessionQuestions.length === 0) {
            throw new Error(`No questions uploaded for this mock session. Please upload questions from Admin Panel > Sessions tab before students can take this exam.`);
          }

          // VALIDATION: Ensure Manual Sequencing
          // If any question lacks a valid order_index (should be 1-based usually), it means it wasn't sequenced properly.
          // Since Admin panel now guarantees order_index on save, we just verify uniqueness and existence.
          const hasInvalidSequence = sessionQuestions.some((q: any) => q.order_index === null || q.order_index === undefined);
          const distinctOrders = new Set(sessionQuestions.map((q: any) => q.order_index)).size;

          if (hasInvalidSequence || distinctOrders !== sessionQuestions.length) {
            console.error("Sequence Error:", sessionQuestions.map((q: any) => q.order_index));
            throw new Error("⚠️ SECURITY: This Mock Test has not been manually sequenced. \n\nAdministrator action required: Please go to Admin Panel > Sessions > Manual Entry and click 'Finalize & Sync' to establish a secure sequence.");
          }

          console.log('Session Questions Fetched:', sessionQuestions.map(q => ({
            id: q.id,
            order: q.order_index,
            media: q.media,
            text: q.question_text.substring(0, 20)
          })));
          // Define normalization helper
          const normalize = (s: string) => s?.toLowerCase().trim() || '';

          const resolveSectionName = (name: string) => {
            if (!name || !activeExam) return name || 'General';
            const lowerName = name.toLowerCase().trim();

            // 1. Direct match with official sections
            const sectionMatch = activeExam.sections.find(s => s.name.toLowerCase() === lowerName);
            if (sectionMatch) return sectionMatch.name;

            // 2. Keyword-based heuristics (STRICT mapping to official names)
            if (/math|number|algebra|function|exponen|logarithm|calculus|geometry|statistic/i.test(lowerName)) {
              const mathSection = activeExam.sections.find(s => /math/i.test(s.name));
              return mathSection ? mathSection.name : 'Mathematics';
            }
            if (/reasoning|text|data|problem|logic/i.test(lowerName)) {
              const reasoningSection = activeExam.sections.find(s => /reasoning|logic/i.test(s.name));
              return reasoningSection ? reasoningSection.name : 'Reasoning on texts and data';
            }
            if (/bio|cell|plant|ecology|animal|physiology|molecul|inheritance/i.test(lowerName)) {
              const bioSection = activeExam.sections.find(s => /biology/i.test(s.name));
              return bioSection ? bioSection.name : 'Biology';
            }
            if (/chem|element|reaction|periodic|nomenclature|stoichiometry|acid|base|redox|organic/i.test(lowerName)) {
              const chemSection = activeExam.sections.find(s => /chemistry/i.test(s.name));
              return chemSection ? chemSection.name : 'Chemistry';
            }
            if (/physic|measurement|kinematic|dynamic|fluid|thermo|electro|magnet/i.test(lowerName)) {
              const physSection = activeExam.sections.find(s => /physic|magnet/i.test(s.name));
              return physSection ? physSection.name : 'Physics';
            }

            // 3. Syllabus deep lookup
            for (const [sectionName, topics] of Object.entries(activeExam.syllabus)) {
              const topicList = topics as any[];
              if (topicList.some(t => t.name.toLowerCase() === lowerName)) {
                const officialSec = activeExam.sections.find(s => s.name === sectionName);
                return officialSec ? officialSec.name : sectionName;
              }
            }

            return name;
          };

          // STRICT SORTING: Group by Official Section Index first, then by order_index
          const getSectionIndex = (name: string) => {
            const resolved = resolveSectionName(name);
            return activeExam?.sections.findIndex(s => s.name === resolved) ?? 999;
          };

          const sortedSessionQuestions = [...sessionQuestions].sort((a, b) => {
            const secA = getSectionIndex(a.section_name);
            const secB = getSectionIndex(b.section_name);
            if (secA !== secB) return secA - secB;

            const orderDiff = (a.order_index || 0) - (b.order_index || 0);
            if (orderDiff !== 0) return orderDiff;
            return a.id.localeCompare(b.id);
          });

          // Map sorted questions to valid format
          questions = sortedSessionQuestions.map(q => ({
            question_text: q.question_text,
            options: q.options,
            correctIndex: q.correct_index,
            explanation: q.explanation,
            difficulty: 'mixed',
            topic: q.topic || q.section_name,
            subject: resolveSectionName(q.section_name),
            session_question_id: q.id,
            passage: q.passage,
            media: q.media,
            section_name: resolveSectionName(q.section_name), // Preserve section name for debugging
            order_index: q.order_index // Pass manual order for debugging
          }));
        } else {
          // Assembling Full Mock from Manual Bank (for practice mode without session)
          for (const section of activeExam.sections) {
            let query = (supabase as any)
              .from('practice_questions')
              .select('*')
              .eq('exam_type', activeExam?.id)
              .eq('subject', section.name);

            let sectionQuestions = [];
            if (solvedIds.length > 0) {
              const DB_LIMIT = 500;
              const dbSafeIds = solvedIds.slice(0, DB_LIMIT);
              const clientFilterIds = new Set(solvedIds.slice(DB_LIMIT));

              // We fetch slightly more than needed to account for client-side filtering
              const fetchLimit = section.questionCount + 50;
              query = query.not('id', 'in', `(${dbSafeIds.join(',')})`);
              const { data, error: sectionError } = await query.limit(fetchLimit);
              if (sectionError) throw sectionError;

              sectionQuestions = (data || []).filter((q: any) => !clientFilterIds.has(q.id)).slice(0, section.questionCount);
            } else {
              const { data, error: sectionError } = await query.limit(section.questionCount);
              if (sectionError) throw sectionError;
              sectionQuestions = data || [];
            }

            if (!sectionQuestions || sectionQuestions.length < section.questionCount) {
              throw new Error(`Insufficient manual questions for section: ${section.name}. Need ${section.questionCount}, found ${sectionQuestions?.length || 0}.`);
            }

            questions = [...questions, ...sectionQuestions.map(q => ({
              question_text: q.question_text,
              options: q.options,
              correctIndex: q.correct_index,
              explanation: q.explanation,
              difficulty: q.difficulty,
              topic: q.topic,
              practice_question_id: q.id,
              passage: q.passage,
              media: q.media
            }))];
          }
        }
      } else {
        // Fetching from Manual Practice Bank
        // Order by created_at DESC so newest admin-added questions are fetched first
        let query = (supabase as any)
          .from('practice_questions')
          .select('*')
          .eq('exam_type', activeExam.id)
          .eq('subject', subject)
          .order('created_at', { ascending: false });

        if (difficulty !== 'mixed' && difficulty !== 'all') {
          query = query.eq('difficulty', difficulty);
        }

        if (topic && topic !== 'all') {
          query = query.eq('topic', topic);
        }

        let filteredManualQuestions = [];
        if (solvedIds.length > 0) {
          const DB_LIMIT = 500;
          const dbSafeIds = solvedIds.slice(0, DB_LIMIT);
          const clientFilterIds = new Set(solvedIds.slice(DB_LIMIT));

          query = query.not('id', 'in', `(${dbSafeIds.join(',')})`);
          const { data: manualQuestions, error: manualError } = await query;
          if (manualError) throw manualError;

          filteredManualQuestions = (manualQuestions || []).filter((q: any) => !clientFilterIds.has(q.id));
        } else {
          const { data: manualQuestions, error: manualError } = await query;
          if (manualError) throw manualError;
          filteredManualQuestions = manualQuestions || [];
        }

        const manualQuestions = filteredManualQuestions;

        if (!manualQuestions || manualQuestions.length < finalCount) {
          throw new Error(`Insufficient questions in the manual bank. Need ${finalCount}, found ${manualQuestions?.length || 0}. Update the bank in Admin.`);
        }

        // 2. Pick the newest N questions (already sorted newest-first by the DB query)
        // This guarantees newly added admin questions always appear in the test first.
        let finalPool = manualQuestions.slice(0, finalCount);

        // 3. Shuffle the selected pool so question order feels varied to the user
        finalPool = finalPool.sort(() => Math.random() - 0.5);

        // Build question objects
        questions = finalPool.map((q: any) => ({
          question_text: q.question_text,
          options: q.options,
          correctIndex: q.correct_index,
          explanation: q.explanation,
          difficulty: q.difficulty,
          topic: q.topic,
          practice_question_id: q.id,
          passage: q.passage,
          media: q.media,
          diagram: q.diagram
        }));
      }

      if (!questions || questions.length === 0) throw new Error('No questions available in the manual bank.');

      // Determine if test should be ranked
      // Ranked only if: authenticated user + live session (not practice mode)
      let isRanked = false;
      let sessionData: any = null;
      if (user && sessionId && !isPracticeMode) {
        // Check if session is currently live
        const { data } = await (supabase as any)
          .from('mock_sessions')
          .select('start_time, end_time, is_sections_locked, section_timing_mode')
          .eq('id', sessionId)
          .single();
        
        sessionData = data;

        if (sessionData) {
          const now = new Date();
          const startTime = new Date(sessionData.start_time);
            const endTime = new Date(sessionData.end_time);
          isRanked = now >= startTime && now <= endTime;
        }
      }

      // Capture proctored flag from URL
      let isProctored = searchParams.get('proctored') === 'true';

      // FORCE: Live Mock Sessions must always be proctored (Desktop Only)
      const isMobile = window.innerWidth <= 768;
      const isMockMode = isFullMock || searchParams.get('mode') === 'mock' || searchParams.get('type') === 'mock';
      if (isMockMode && sessionId && isRanked && !isMobile) {
        console.log("[StartTest] Enforcing proctored mode for live ranked simulation.");
        isProctored = true;
      }

      // Calculate final time limit
      // 1. If session-based mock, try to find the duration from local fetch or exam config
      let finalTime = timeLimit;
      if (isFullMock) {
        // Preference: 1. Session duration, 2. Sum of sections
        finalTime = sessionDuration || activeExam.sections.reduce((acc, s) => acc + (s.durationMinutes || 0), 0);
      }

      // Create test record - support both authenticated and guest users
      const testInsert: any = {
        subject: finalSubject,
        topic: topic && topic !== 'all' ? topic : null,
        difficulty: isFullMock ? 'mixed' : (difficulty === 'all' ? 'mixed' : difficulty),
        total_questions: questions.length,
        time_limit_minutes: finalTime,
        status: 'in_progress',
        exam_type: activeExam?.id,
        test_type: isMockMode ? 'mock' : 'practice',
        is_mock: isFullMock || isMockMode,
        is_ranked: isRanked,
        session_id: sessionId || null,
        is_proctored: isProctored,
        is_sections_locked: (activeExam?.id === 'imat-prep') ? false : ((sessionData as any)?.is_sections_locked ?? true),
        section_timing_mode: (activeExam?.id === 'imat-prep') ? 'total' : ((sessionData as any)?.section_timing_mode ?? 'section')
      };

      // Only add user_id if user is authenticated
      if (user) {
        testInsert.user_id = user.id;
      }

      const { data: test, error: testError } = await supabase
        .from('tests')
        .insert(testInsert)
        .select()
        .single();

      if (testError) {
        console.error('Supabase Test Insert Error:', testError);
        throw testError;
      }

      // Create mock_exam_submission record if this is a mock test AND user is authenticated
      if (isFullMock && user) {
        console.log('Creating mock_exam_submission:', {
          isFullMock,
          userId: user.id,
          sessionId: sessionId || null
        });

        const { data: submissionData, error: mockSubmissionError } = await supabase
          .from('mock_exam_submissions')
          .insert({
            user_id: user.id,
            session_id: sessionId || null,
            status: 'completed', // Mark as completed immediately since this is practice mode
            started_at: new Date().toISOString(),
            completed_at: new Date().toISOString()
          })
          .select();

        if (mockSubmissionError) {
          console.error('Error creating mock submission:', mockSubmissionError);
          // Don't block the test, just log the error
        } else {
          console.log('Mock submission created successfully:', submissionData);
        }
      } else {
        console.log('Skipping mock submission creation:', { isFullMock, hasUser: !!user });
      }

      // Insert questions
      const questionsToInsert = questions.map((q: any, index: number) => ({
        test_id: test.id,
        question_number: index + 1, // STRICT sequence from sorted array
        question_text: q.question_text,
        options: q.options,
        correct_index: q.correctIndex,
        explanation: q.explanation,
        difficulty: q.difficulty,
        subject: q.subject || finalSubject,
        topic: q.topic || (topic !== 'all' ? topic : null) || finalSubject,
        section_name: q.section_name || null,
        practice_question_id: q.practice_question_id || null,
        master_question_id: q.master_question_id || q.practice_question_id || q.session_question_id || q.id,
        source_table: q.source_table || (q.practice_question_id ? 'practice_questions' : 'session_questions'),
        passage: q.passage,
        media: q.media, // Critical: Carry over the image/table data
        diagram: q.diagram
      }));

      const { error: questionsError } = await supabase
        .from('questions')
        .insert(questionsToInsert);

      if (questionsError) {
        console.error('Supabase Questions Insert Error:', questionsError);
        throw questionsError;
      }

      toast({
        title: isFullMock ? (isRanked ? 'Live Simulation Started!' : 'Practice Simulation Started!') : 'Practice Ready!',
        description: `Preparing ${questions.length} refined questions. ${!user ? 'Login to track your progress!' : 'Good luck!'}`,
      });

      // RESPONSIVE ROUTING: Use sectioned runner for Mobile Mocks
      if (isMobile && isFullMock) {
        navigate(`/mobile/sectioned-test/${test.id}`);
      } else {
        navigate(`/test/${test.id}`);
      }

      // Invalidate dashboard cache so that "Resume Test" button appears/updates
      invalidateDashboardCache();

    } catch (error: any) {
      console.error('Error starting test:', error);
      toast({
        title: 'Mission Interface Error',
        description: error?.message || error?.details || 'Please verify database connection and schema.',
        variant: 'destructive',
      });
    } finally {
      setIsGenerating(false);
    }
  };

  if (loading || isGenerating) {
    const isMock = searchParams.get('mode') === 'mock';
    
    return (
      <div className="min-h-screen bg-white dark:bg-slate-950 flex flex-col items-center justify-center p-8 transition-colors duration-500">
        <div className="w-full max-w-[320px] space-y-10">
          {/* Header Section */}
          <div className="text-center space-y-2">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <h2 className="text-[11px] font-black uppercase tracking-[0.4em] text-slate-900 dark:text-slate-100">
                Examination Protocol
              </h2>
              <div className="flex items-center justify-center gap-2 mt-1">
                <div className="h-px w-8 bg-slate-200 dark:bg-slate-800" />
                <p className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em]">
                  {isGenerating ? 'Initialising Secure Environment' : 'Establishing Handshake'}
                </p>
                <div className="h-px w-8 bg-slate-200 dark:bg-slate-800" />
              </div>
            </motion.div>
          </div>

          {/* Progress Section */}
          <div className="space-y-6">
            <div className="relative h-[2px] w-full bg-slate-100 dark:bg-slate-900 overflow-hidden rounded-full">
              <motion.div 
                initial={{ width: "0%" }}
                animate={{ width: "100%" }}
                transition={{ duration: 4, ease: "linear" }}
                className="absolute h-full bg-slate-900 dark:bg-slate-100"
              />
            </div>

            <div className="space-y-4">
              {[
                { label: 'Verifying Session Authenticity', delay: 0.2, icon: Shield },
                { label: 'Synchronising Test Protocols', delay: 1.2, icon: Server },
                { label: 'Applying Security Constraints', delay: 2.2, icon: Lock },
                { label: 'Configuring Proctored Assets', delay: 3.2, icon: Check, hideIfNotMock: true }
              ].map((step, idx) => {
                if (step.hideIfNotMock && !isMock) return null;
                return (
                  <motion.div
                    key={idx}
                    initial={{ opacity: 0, x: -5 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: step.delay, duration: 0.4 }}
                    className="flex items-center justify-between"
                  >
                    <span className="text-[10px] font-bold text-slate-400 dark:text-slate-600 uppercase tracking-widest">{step.label}</span>
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ delay: step.delay + 0.3, type: "spring", stiffness: 200 }}
                    >
                      <step.icon className="w-3 h-3 text-slate-900 dark:text-slate-100" />
                    </motion.div>
                  </motion.div>
                );
              })}
            </div>
          </div>

          {/* Verification Status */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 3.8 }}
            className="pt-4 text-center"
          >
            <p className="text-[9px] font-black uppercase tracking-widest text-emerald-500 flex items-center justify-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              Security Verified
            </p>
          </motion.div>
        </div>
      </div>
    );
  }

  return (
    <Layout>
      <div className="container mx-auto px-6 py-12 max-w-3xl animate-in fade-in slide-in-from-bottom-4 duration-700">
        <div className="flex items-center gap-4 mb-10">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(-1)}
            className="rounded-xl border border-slate-100 dark:border-border hover:bg-white dark:bg-card hover:border-slate-900 transition-all"
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <h1 className="text-3xl font-black text-slate-900 dark:text-slate-100 tracking-tight">Custom Practice</h1>
        </div>

        <div className="bg-white dark:bg-card p-10 rounded-[2.5rem] border border-slate-100 dark:border-border shadow-xl shadow-slate-200/50 space-y-12">
          {/* Step 1: Subject Selection */}
          <section className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-indigo-600" />
                <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400">Step 1: Domain Selection</h3>
              </div>
              <span className="text-[9px] font-black text-indigo-600 uppercase tracking-[0.2em]">{subject} Selected</span>
            </div>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {activeExam && activeExam.sections.map((s) => (
                <button
                  key={s.name}
                  onClick={() => setSubject(s.name)}
                  className={`p-4 rounded-2xl border-2 transition-all flex flex-col items-center gap-2 ${subject === s.name
                    ? 'border-indigo-600 dark:border-indigo-500 bg-indigo-50/50 dark:bg-indigo-900/20 text-indigo-900 dark:text-indigo-100 shadow-sm'
                    : 'border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 text-slate-400 hover:border-slate-200 dark:hover:border-slate-600'
                    }`}
                >
                  <span className="text-xl">{s.icon}</span>
                  <span className="font-bold text-[10px] uppercase tracking-tight text-center leading-tight">{s.name}</span>
                </button>
              ))}
            </div>
          </section>

          {/* Step 2: Topic Selection */}
          <section className="space-y-6 animate-in fade-in slide-in-from-top-2 duration-500">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Target className="w-4 h-4 text-indigo-600" />
                <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400">Step 2: Topic Targeting</h3>
              </div>
              {isLoadingTopics && <div className="w-4 h-4 border-2 border-indigo-600/30 border-t-indigo-600 rounded-full animate-spin" />}
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setTopic('all')}
                className={`px-6 py-3 rounded-xl border-2 font-black text-[10px] uppercase tracking-widest transition-all ${topic === 'all' || !topic
                  ? 'border-slate-900 dark:border-indigo-600 bg-slate-900 dark:bg-indigo-600 text-white shadow-lg'
                  : 'border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 text-slate-400 dark:text-slate-300 hover:border-slate-200 dark:hover:border-slate-600'
                  }`}
              >
                All Topics
              </button>
              {availableTopics.map((t) => (
                <button
                  key={t.name}
                  onClick={() => setTopic(t.name)}
                  className={`px-6 py-3 rounded-xl border-2 font-black text-[10px] uppercase tracking-widest transition-all flex items-center gap-2 ${topic === t.name
                    ? 'border-indigo-600 dark:border-indigo-500 bg-indigo-50/50 dark:bg-indigo-900/20 text-indigo-900 dark:text-indigo-100 shadow-sm'
                    : 'border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 text-slate-400 dark:text-slate-300 hover:border-slate-200 dark:hover:border-slate-600'
                    }`}
                >
                  {t.name}
                  <span className={`px-2 py-0.5 rounded-full text-[8px] ${topic === t.name ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-slate-500'}`}>
                    {t.count}
                  </span>
                </button>
              ))}
              {!isLoadingTopics && availableTopics.length === 0 && (
                <p className="text-[10px] font-bold text-slate-300 uppercase tracking-widest py-2">No specific topics discovered in this sector.</p>
              )}
            </div>
          </section>

          <div className="grid md:grid-cols-2 gap-10">
            {/* Step 3: Question Count */}
            <section className="space-y-6">
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-indigo-600" />
                <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400">Step 3: Mission Scale</h3>
              </div>
              <div className="flex gap-2 flex-wrap">
                {[1, 5, 10, 15, 20, 25].map((count) => {
                  const remaining = getRemainingQuestions(subject);
                  const isDisabled = isExplorer && count > remaining;
                  return (
                    <button
                      key={count}
                      type="button"
                      disabled={isDisabled}
                      onClick={() => setQuestionCount(count)}
                      className={`w-12 h-12 rounded-xl border-2 font-black text-xs transition-all ${isDisabled
                        ? 'opacity-40 cursor-not-allowed bg-slate-100 dark:bg-slate-800/30 border-slate-200 dark:border-slate-700'
                        : questionCount === count
                          ? 'border-indigo-600 dark:border-indigo-500 bg-indigo-50/50 dark:bg-indigo-900/20 text-indigo-900 dark:text-indigo-100 shadow-sm'
                          : 'border-slate-100 dark:border-slate-700 bg-slate-50/30 dark:bg-slate-800/50 text-slate-400 dark:text-slate-300 hover:border-slate-200 dark:hover:border-slate-600'
                        }`}
                    >
                      {count}
                    </button>
                  );
                })}
              </div>
              {isExplorer && (
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-3">
                  Remaining Limit: <span className="text-orange-600">{getRemainingQuestions(subject)}</span> / 15 Questions
                </p>
              )}
            </section>

            {/* Step 4: Time Limit */}
            <section className="space-y-6">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-indigo-600" />
                <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400">Step 4: Time Limit</h3>
              </div>
              <div className="flex gap-2 flex-wrap">
                {[10, 15, 20, 30, 45, 60].map((time) => (
                  <button
                    key={time}
                    type="button"
                    onClick={() => setTimeLimit(time)}
                    className={`px-4 h-12 rounded-xl border-2 font-black text-xs transition-all ${timeLimit === time
                      ? 'border-indigo-600 dark:border-indigo-500 bg-indigo-50/50 dark:bg-indigo-900/20 text-indigo-900 dark:text-indigo-100 shadow-sm'
                      : 'border-slate-100 dark:border-slate-700 bg-slate-50/30 dark:bg-slate-800/50 text-slate-400 dark:text-slate-300 hover:border-slate-200 dark:hover:border-slate-600'
                      }`}
                  >
                    {time}m
                  </button>
                ))}
              </div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                Selected: <span className="text-indigo-600">{timeLimit} minutes</span>
              </p>
            </section>

            {/* Step 5: Difficulty */}
            <section className="space-y-6">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-indigo-600" />
                <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400">Step 5: Difficulty</h3>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {DIFFICULTIES.map((d) => {
                  let displayLabel = d.label;
                  const labels = activeExam?.scoring?.difficulty_labels;
                  if (d.value === 'easy') displayLabel = labels?.easy || d.label;
                  if (d.value === 'medium') displayLabel = labels?.medium || d.label;
                  if (d.value === 'hard') displayLabel = labels?.hard || d.label;

                  return (
                    <button
                      key={d.value}
                      onClick={() => setDifficulty(d.value)}
                      className={`p-4 rounded-xl border-2 transition-all text-left ${difficulty === d.value
                        ? 'border-indigo-600 dark:border-indigo-500 bg-indigo-50/50 dark:bg-indigo-900/20'
                        : 'border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 hover:border-slate-200 dark:hover:border-slate-600'
                        }`}
                    >
                      <span className={`font-black text-[10px] uppercase tracking-tight ${d.color}`}>{displayLabel}</span>
                    </button>
                  );
                })}
              </div>
            </section>
          </div>

          <div className="pt-10 border-t border-slate-50">
            <Button
              onClick={() => handleStartTest(false)}
              disabled={isGenerating || !subject}
              className="w-full bg-slate-900 text-white hover:bg-slate-800 font-black h-20 rounded-[2rem] text-xs uppercase tracking-[0.3em] shadow-2xl shadow-indigo-100 active:scale-[0.98] transition-all"
            >
              Initialize Practice Mission
            </Button>
            <p className="text-center text-[9px] font-bold text-slate-300 uppercase tracking-widest mt-8">
              Verified Curriculum Data • 100% Human-Curated Content
            </p>
          </div>
        </div>
      </div >

      <UpgradeModal
        isOpen={isUpgradeModalOpen}
        onClose={() => setIsUpgradeModalOpen(false)}
        title="Daily Practice Limit Reached"
        description={`You've reached your 15-question daily limit for ${subject}. Upgrade to PRO for unlimited practice questions and full access to all features!`}
        feature="Unlimited Practice Questions"
      />

    </Layout >
  );
}
