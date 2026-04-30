import { useState, useEffect, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import Layout from '@/components/Layout';
import { Button } from '@/components/ui/button';
import {
    Play,
    Sparkles,
    Clock,
    BookOpen,
    Rocket,
    ChevronRight,
    ArrowLeft,
    Video,
    FileText,
    CheckCircle2,
    Lock,
    ExternalLink,
    Loader2,
    Database,
    Search,
    ChevronDown,
    Zap,
    LayoutDashboard,
    ListChecks,
    Target,
    MessageSquare,
    Send,
    Trash2,
    User as UserIcon,
    Link,
    Download,
    HelpCircle,
    ArrowRight,
    Trophy,
    X,
    Dna,
    FlaskConical,
    Binary,
    Globe as GlobeIcon,
    PenTool,
    Headphones,
    Mic,
    GraduationCap,
    Atom,
    Variable,
    Medal,
    AlertTriangle
} from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { useExam } from '@/context/ExamContext';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { MathText } from '@/components/MathText';
import { usePlanAccess } from '@/hooks/usePlanAccess';
import { UpgradeModal } from '@/components/UpgradeModal';
import { getEmbedUrl, isEmbeddable } from '@/lib/url';
import DOMPurify from 'dompurify';
import { LearningSkeleton, GlobalSkeleton } from '@/components/SkeletonLoader';
import { readDashboardCache, invalidateDashboardCache } from '@/hooks/useDashboardPrefetch';

type View = 'selection' | 'dashboard' | 'video' | 'quiz';
type SelectionLevel = 'exam' | 'course';

export default function Learning() {
    const { toast } = useToast();
    const navigate = useNavigate();
    const [view, setView] = useState<View>('selection');
    const [selectionLevel, setSelectionLevel] = useState<SelectionLevel>('exam');

    // Data States
    const [exams, setExams] = useState<any[]>([]);
    const [courses, setCourses] = useState<any[]>([]);
    const [units, setUnits] = useState<any[]>([]); // Sidebar
    const [topics, setTopics] = useState<any[]>([]); // Dashboard Main

    // Selection States
    const [selectedExam, setSelectedExam] = useState<any>(null);
    const [selectedCourse, setSelectedCourse] = useState<any>(null);
    const [selectedUnit, setSelectedUnit] = useState<any>(null);
    const [selectedTopic, setSelectedTopic] = useState<any>(null);
    const [selectedVideo, setSelectedVideo] = useState<any>(null);
    const [comments, setComments] = useState<any[]>([]);
    const [newComment, setNewComment] = useState('');
    const [replyTo, setReplyTo] = useState<any>(null);
    const [userProgress, setUserProgress] = useState<Set<string>>(new Set());

    // Quiz States
    const [quizQuestions, setQuizQuestions] = useState<any[]>([]);
    const [currentQuizIndex, setCurrentQuizIndex] = useState(0);
    const [quizAnswers, setQuizAnswers] = useState<number[]>([]);
    const [showQuizResult, setShowQuizResult] = useState(false);
    const [quizParent, setQuizParent] = useState<any>(null);
    const { user } = useAuth();

    const [isLoading, setIsLoading] = useState(true);
    const [quizAvailability, setQuizAvailability] = useState<{
        topics: Record<string, boolean>;
        units: Record<string, boolean>;
        subunits: Record<string, boolean>;
    }>({ topics: {}, units: {}, subunits: {} });
    const [quizCompletion, setQuizCompletion] = useState<{
        topics: Record<string, boolean>;
        units: Record<string, boolean>;
        subunits: Record<string, boolean>;
    }>({ topics: {}, units: {}, subunits: {} });
    const [quizLevel, setQuizLevel] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const { activeExam } = useExam();
    const location = useLocation();
    const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false);
    const { isExplorer } = usePlanAccess();

    // --- SEARCH LOGIC ---
    const filteredTopics = useMemo(() => {
        if (searchQuery.trim() === '') return topics;

        return topics.map(topic => {
            const matchedSubunits = topic.subunits.map((sub: any) => {
                const matchedContent = sub.content.filter((c: any) =>
                    c.title.toLowerCase().includes(searchQuery.toLowerCase())
                );
                return { ...sub, content: matchedContent };
            }).filter((sub: any) => sub.content.length > 0 || sub.name.toLowerCase().includes(searchQuery.toLowerCase()));

            const matchedDirect = (topic.directContent || []).filter((c: any) =>
                c.title.toLowerCase().includes(searchQuery.toLowerCase())
            );

            return { ...topic, subunits: matchedSubunits, directContent: matchedDirect };
        }).filter(topic =>
            topic.subunits.length > 0 ||
            topic.directContent.length > 0 ||
            topic.name.toLowerCase().includes(searchQuery.toLowerCase())
        );
    }, [topics, searchQuery]);

    // Capture restore intent immediately — before history state is cleared
    const restoreIntent = useState<{ courseId: string; contentId: string } | null>(() => {
        if (location.state?.continueLearning && location.state?.courseId && location.state?.contentId) {
            return { courseId: location.state.courseId, contentId: location.state.contentId };
        }
        return null;
    })[0];

    // Restoration State (for Continue Learning)
    useEffect(() => {
        if (restoreIntent) {
            // Clear history state to prevent loop on refresh
            window.history.replaceState({}, document.title);
            restoreSession(restoreIntent.courseId, restoreIntent.contentId);
        }
    }, [restoreIntent]);

    useEffect(() => {
        fetchExams();
        // Re-check availability when returning to the tab
        const handleFocus = () => {
            if (selectedUnit && view === 'dashboard') {
                fetchUnitDashboard(selectedUnit);
            }
        };
        window.addEventListener('focus', handleFocus);
        return () => window.removeEventListener('focus', handleFocus);
    }, [activeExam?.id]);

    // Keep in sync if activeExam changes
    useEffect(() => {
        if (exams.length > 0 && activeExam) {
            const brand = activeExam.id.split('-')[0].toLowerCase();
            const matched = exams.find((e: any) =>
                e.name.toLowerCase().includes(brand) ||
                (e.description && e.description.toLowerCase().includes(brand))
            );
            if (matched && matched.id !== selectedExam?.id) {
                handleExamSelect(matched);
            }
        }
    }, [activeExam?.id, exams]);

    if (isLoading && location.state?.continueLearning) {
        return (
            <Layout isLoading={isLoading}>
                <GlobalSkeleton />
            </Layout>
        );
    }

    async function restoreSession(courseId: string, contentId: string) {
        setIsLoading(true);
        try {
            await fetchProgress();
            // 1. Fetch Course details
            const { data: course } = await (supabase as any)
                .from('learning_courses')
                .select('*')
                .eq('id', courseId)
                .single();

            if (!course) throw new Error('Course not found');
            setSelectedCourse(course);

            // 2. Fetch all Topics for this Course (for sidebar navigation)
            const { data: topicData } = await (supabase as any)
                .from('learning_topics')
                .select('*')
                .eq('course_id', courseId)
                .order('created_at');

            const activeTopics = (topicData || []).filter((t: any) => t.is_active !== false);
            setUnits(activeTopics);

            // 3. Resolve which Topic contains this Content
            // We need to find the topic_id so we can load the specific dashboard
            let targetTopicId = null;

            const { data: content } = await (supabase as any)
                .from('learning_content')
                .select('*')
                .eq('id', contentId)
                .single();

            if (content) {
                if (content.topic_id) {
                    targetTopicId = content.topic_id;
                } else if (content.unit_id) {
                    const { data: unit } = await (supabase as any).from('learning_units').select('topic_id').eq('id', content.unit_id).single();
                    if (unit) targetTopicId = unit.topic_id;
                } else if (content.subunit_id) {
                    const { data: subunit } = await (supabase as any).from('learning_subunits').select('unit_id').eq('id', content.subunit_id).single();
                    if (subunit) {
                        const { data: unit } = await (supabase as any).from('learning_units').select('topic_id').eq('id', subunit.unit_id).single();
                        if (unit) targetTopicId = unit.topic_id;
                    }
                }
            }

            // 4. Load the Unit Dashboard for this Topic
            if (targetTopicId) {
                const targetTopic = activeTopics.find((t: any) => t.id === targetTopicId);
                if (targetTopic) {
                    // This function correctly populates 'topics' (which are actually units/lessons)
                    // We await it so state is ready before we switch view
                    await fetchUnitDashboard(targetTopic);

                    // 5. Select the Video
                    setSelectedVideo(content);
                    // We need to set the parent structure for breadcrumbs if possible, 
                    // but fetchUnitDashboard mainly sets the 'topics' state which the sidebar uses.

                    fetchComments(content.id);
                    setView('video');
                    setSelectionLevel('course');
                }
            } else {
                // Fallback if we can't find the topic (orphan content?)
                // Just load the first topic
                if (activeTopics.length > 0) {
                    await fetchUnitDashboard(activeTopics[0]);
                }
                setSelectedVideo(content || { title: 'Unknown Content' });
                setView('video');
            }

        } catch (error) {
            console.error("Restoration Failed:", error);
            toast({ title: 'Error', description: 'Failed to restore session.', variant: 'destructive' });
            setView('selection'); // Fallback to safe state
        } finally {
            setIsLoading(false);
        }
    };

    async function saveProgress(contentId: string) {
        if (!user) return;
        const { error } = await (supabase as any)
            .from('learning_progress')
            .upsert({
                user_id: user.id,
                content_id: contentId,
                is_completed: true,
                last_accessed_at: new Date().toISOString()
            }, { onConflict: 'user_id,content_id' });

        if (!error) {
            // Invalidate dashboard cache so that "Resume Lecture" button updates
            invalidateDashboardCache();
            setUserProgress(prev => {
                const next = new Set(prev);
                next.add(contentId);
                return next;
            });
        } else {
            console.error('Failed to save progress:', error);
        }
    };

    async function fetchProgress() {
        if (!user) return;
        const { data } = await supabase
            .from('learning_progress')
            .select('content_id')
            .eq('user_id', user.id)
            .eq('is_completed', true);

        if (data) {
            setUserProgress(new Set(data.map((p: any) => p.content_id)));
        }
    }

    async function saveQuizProgress(parentId: string, level: string, score: number, total: number) {
        if (!user) return;

        let field = '';
        if (level === 'topic') field = 'topic_id';
        else if (level === 'unit') field = 'unit_id';
        else if (level === 'subunit') field = 'subunit_id';

        const payload = {
            user_id: user.id,
            [field]: parentId,
            score,
            total_questions: total,
            completed_at: new Date().toISOString()
        };

        const { error } = await (supabase as any)
            .from('learning_quiz_progress')
            .upsert(payload, { onConflict: `user_id,${field}` });

        if (!error) {
            invalidateDashboardCache();
        } else {
            console.error('Failed to save quiz progress:', error);
        }

        // Refresh local state for immediate feedback
        setQuizCompletion(prev => ({
            ...prev,
            [level === 'topic' ? 'topics' : level === 'unit' ? 'units' : 'subunits']: {
                ...prev[level === 'topic' ? 'topics' : level === 'unit' ? 'units' : 'subunits'],
                [parentId]: true
            }
        }));
    }

    async function fetchExams() {
        setIsLoading(true);
        const { data, error } = await (supabase as any).from('learning_exams').select('*');
        if (error) {
            toast({ title: 'System Error', description: 'Failed to initialize knowledge archive.', variant: 'destructive' });
        } else {
            const fetchedExams = data || [];
            setExams(fetchedExams);

            // Auto-sync with activeExam if not already selected
            if (activeExam?.id && fetchedExams.length > 0) {
                const brand = activeExam.id.split('-')[0].toLowerCase();
                const matched = fetchedExams.find((e: any) =>
                    e.name.toLowerCase().includes(brand) ||
                    (e.description && e.description.toLowerCase().includes(brand))
                );
                if (matched) {
                    await handleExamSelect(matched);
                }
            }
        }
        // Only set loading false if we didn't match (otherwise handleExamSelect/handleCourseSelect controls flow)
        if (!activeExam) {
            setIsLoading(false);
        }
    };



    async function handleExamSelect(exam: any) {
        setIsLoading(true);
        setSelectedExam(exam);
        const { data, error } = await (supabase as any)
            .from('learning_courses')
            .select('*')
            .eq('exam_id', exam.id);

        if (error) {
            console.error('Fetch Courses Error:', error);
            toast({ title: 'Error', description: `Failed to load courses: ${error.message}`, variant: 'destructive' });
        } else {
            // Robust filtering: show if not explicitly inactive
            const activeCourses = (data || []).filter((c: any) => c.is_active !== false);
            setCourses(activeCourses);

            setSelectionLevel('course');
            setIsLoading(false);
        }
    };

    async function handleCourseSelect(course: any) {
        setIsLoading(true);
        setSelectedCourse(course);
        const { data: topicData, error: topicError } = await (supabase as any)
            .from('learning_topics')
            .select('*')
            .eq('course_id', course.id);

        if (topicError) {
            toast({ title: 'Error', description: 'Failed to load units.', variant: 'destructive' });
        } else {
            const activeTopics = (topicData || []).filter((t: any) => t.is_active !== false);
            setUnits(activeTopics);
            setView('dashboard');
            if (activeTopics.length > 0) {
                await fetchUnitDashboard(activeTopics[0]);
            }
            await fetchProgress();
        }
        setIsLoading(false);
    };

    async function fetchUnitDashboard(topic: any, index?: number) {
        if (isExplorer && index !== undefined && index > 0) {
            setIsUpgradeModalOpen(true);
            return;
        }
        setIsLoading(true);
        setSelectedUnit(topic);

        try {
            // OPTIMIZED: Bulk fetch all levels to avoid N+1 waterfalls
            const [
                { data: unitData, error: unitError },
                { data: subunitData, error: subunitError }
            ] = await Promise.all([
                (supabase as any).from('learning_units').select('*').eq('topic_id', topic.id),
                (supabase as any).from('learning_subunits').select('*, learning_units!inner(topic_id)').eq('learning_units.topic_id', topic.id)
            ]);

            // Re-fetch subunits more reliably if the inner join is complex for the environment
            const { data: reliableSubunits } = await (supabase as any)
                .from('learning_subunits')
                .select('*')
                .in('unit_id', (unitData || []).map((u: any) => u.id));

            // Fetch ALL relevant content for this topic scope in one go
            const { data: allContent } = await (supabase as any)
                .from('learning_content')
                .select('*')
                .or(`subunit_id.in.(${(reliableSubunits || []).map((s: any) => s.id).join(',') || 'NULL'})`);

            if (unitError) throw unitError;

            const units_list = (unitData || []).filter((u: any) => u.is_active !== false);
            const subunits_list = (reliableSubunits || []).filter((s: any) => s.is_active !== false);
            const content_list = (allContent || []).filter((c: any) => c.is_active !== false);

            const richLessons = units_list.map((unit: any) => {
                const nestedSubunits = subunits_list
                    .filter((s: any) => s.unit_id === unit.id)
                    .map((sub: any) => ({
                        ...sub,
                        content: content_list
                            .filter((c: any) => c.subunit_id === sub.id)
                            .sort((a: any, b: any) => (a.order_index || 0) - (b.order_index || 0))
                    }));

                const unitDirectContent: any[] = []; // Unit-direct content not supported by current schema without unit_id column

                return {
                    ...unit,
                    subunits: nestedSubunits,
                    directContent: unitDirectContent
                };
            });

            const finalStructure = [...richLessons];
            const activeTopicContent: any[] = []; // Topic-direct content not supported by current schema without topic_id column

            if (activeTopicContent.length > 0) {
                finalStructure.unshift({
                    id: 'topic-direct',
                    name: 'Overview & Fundamentals',
                    description: 'Introductory sessions for this topic.',
                    subunits: [],
                    directContent: activeTopicContent
                });
            }

            setTopics(finalStructure);

            // Fetch Quiz Availability
            const allSubunitIds = richLessons.flatMap(u => (u.subunits || []).map((s: any) => s.id)).filter(Boolean);
            const allUnitIds = richLessons.map(u => u.id).filter(id => id && id !== 'topic-direct');

            let query = (supabase as any).from('learning_quiz_questions').select('topic_id, unit_id, subunit_id');
            const filters = [`topic_id.eq.${topic.id}`];
            if (allUnitIds.length > 0) filters.push(`unit_id.in.(${allUnitIds.join(',')})`);
            if (allSubunitIds.length > 0) filters.push(`subunit_id.in.(${allSubunitIds.join(',')})`);

            const { data: counts } = await query.or(filters.join(','));

            const availability = {
                topics: {} as Record<string, boolean>,
                units: {} as Record<string, boolean>,
                subunits: {} as Record<string, boolean>
            };

            (counts || []).forEach((q: any) => {
                if (q.topic_id) availability.topics[q.topic_id] = true;
                if (q.unit_id) availability.units[q.unit_id] = true;
                if (q.subunit_id) availability.subunits[q.subunit_id] = true;
            });
            setQuizAvailability(availability);

            if (user) {
                const { data: progress } = await (supabase as any)
                    .from('learning_quiz_progress')
                    .select('topic_id, unit_id, subunit_id')
                    .eq('user_id', user.id);

                const completion = {
                    topics: {} as Record<string, boolean>,
                    units: {} as Record<string, boolean>,
                    subunits: {} as Record<string, boolean>
                };

                (progress || []).forEach((p: any) => {
                    if (p.topic_id) completion.topics[p.topic_id] = true;
                    if (p.unit_id) completion.units[p.unit_id] = true;
                    if (p.subunit_id) completion.subunits[p.subunit_id] = true;
                });
                setQuizCompletion(completion);
            }
        } catch (err) {
            console.error("Dashboard Load Error:", err);
            toast({ title: 'Error', description: 'Failed to load dashboard content.', variant: 'destructive' });
        } finally {
            setIsLoading(false);
        }
    }

    function handleVideoSelect(video: any, parent: any) {
        setIsLoading(true);
        setSelectedVideo(video);

        // Find the "topic" (lesson group) this belongs to
        const foundTopic = (parent?.name === 'Direct')
            ? topics.find(t => t.id === 'topic-direct')
            : topics.find(t =>
                t.id === parent?.id ||
                t.subunits?.some((s: any) => s.id === parent?.id)
            );
        setSelectedTopic(foundTopic);

        fetchComments(video.id);
        saveProgress(video.id);
        setView('video');
        setIsLoading(false);
    };

    async function fetchComments(contentId: string) {
        // We join with profiles to get display names
        // profiles(display_name) is the join syntax for Supabase
        const { data, error } = await (supabase as any)
            .from('learning_comments')
            .select('*, profiles(id, display_name, avatar_url)')
            .eq('content_id', contentId)
            .order('created_at', { ascending: true });

        if (!error) {
            setComments(data || []);
        } else {
            console.error('Fetch Comments Error:', error);
        }
    };

    const handlePostComment = async () => {
        if (!newComment.trim() || !user) return;

        const payload: any = {
            content_id: selectedVideo.id,
            user_id: user.id,
            comment_text: newComment.trim()
        };

        if (replyTo) {
            payload.parent_id = replyTo.id;
        }

        const { data, error } = await (supabase as any)
            .from('learning_comments')
            .insert(payload)
            .select('*, profiles(id, display_name, avatar_url)')
            .single();

        if (error) {
            console.error('Post Comment Error:', error);
            toast({ title: 'Error', description: 'Failed to post comment. (Ensure threads migration is applied)', variant: 'destructive' });
        } else {
            setComments([...comments, data]);
            setNewComment('');
            setReplyTo(null);
            toast({ title: 'Success', description: replyTo ? 'Reply posted.' : 'Comment posted.' });
        }
    };

    const startQuiz = async (parentId: string, level: string, parentData: any) => {
        setIsLoading(true);
        let field = '';
        if (level === 'topic') field = 'topic_id';
        else if (level === 'unit') field = 'unit_id';
        else if (level === 'subunit') field = 'subunit_id';

        const { data, error } = await (supabase as any)
            .from('learning_quiz_questions')
            .select('*')
            .eq(field, parentId)
            .order('order_index');

        if (error) {
            toast({
                title: 'System Error',
                description: 'Failed to fetch the knowledge check.',
                variant: 'destructive'
            });
            setIsLoading(false);
            return;
        }

        setQuizQuestions(data || []);
        setQuizParent(parentData);
        setQuizLevel(level);
        setCurrentQuizIndex(0);
        setQuizAnswers([]);
        setShowQuizResult(false);
        setView('quiz');
        setIsLoading(false);
    };

    const handleQuizAnswer = (index: number) => {
        const newAnswers = [...quizAnswers];
        newAnswers[currentQuizIndex] = index;
        setQuizAnswers(newAnswers);

        if (currentQuizIndex < quizQuestions.length - 1) {
            setTimeout(() => setCurrentQuizIndex(prev => prev + 1), 300);
        } else {
            // Calculate score and save progress
            const finalScore = newAnswers.reduce((acc, ans, i) => acc + (ans === quizQuestions[i].correct_index ? 1 : 0), 0);
            if (quizParent && quizLevel) {
                saveQuizProgress(quizParent.id, quizLevel, finalScore, quizQuestions.length);
            }
            setShowQuizResult(true);
        }
    };

    const handleDeleteComment = async (commentId: string) => {
        const { error } = await (supabase as any)
            .from('learning_comments')
            .delete()
            .eq('id', commentId);

        if (error) {
            toast({ title: 'Error', description: 'Failed to delete comment.', variant: 'destructive' });
        } else {
            setComments(comments.filter(c => c.id !== commentId));
            toast({ title: 'Success', description: 'Comment removed.' });
        }
    };

    const handleNextUnit = () => {
        if (!selectedUnit) return;
        const currentIndex = units.findIndex(u => u.id === selectedUnit.id);
        const nextUnit = units[currentIndex + 1];
        if (nextUnit) {
            fetchUnitDashboard(nextUnit, currentIndex + 1);
        }
    };

    const resetToCourse = () => {
        setView('selection');
        setSelectionLevel('course');
    };

    const resetToExams = () => {
        // Disabled per user request - use global header to switch
        return;
    };



    const getSubjectInfo = (name: string) => {
        const lowerName = name.toLowerCase();
        if (lowerName.includes('math')) return { icon: Binary, color: 'bg-blue-600', text: 'text-blue-600', bg: 'bg-blue-50', shadow: 'shadow-blue-100' };
        if (lowerName.includes('bio')) return { icon: Dna, color: 'bg-emerald-600', text: 'text-emerald-600', bg: 'bg-emerald-50', shadow: 'shadow-emerald-100' };
        if (lowerName.includes('chem')) return { icon: FlaskConical, color: 'bg-amber-600', text: 'text-amber-600', bg: 'bg-amber-50', shadow: 'shadow-amber-100' };
        if (lowerName.includes('phys')) return { icon: Atom, color: 'bg-rose-600', text: 'text-rose-600', bg: 'bg-rose-50', shadow: 'shadow-rose-100' };
        if (lowerName.includes('reason') || lowerName.includes('logic')) return { icon: Sparkles, color: 'bg-indigo-600', text: 'text-indigo-600', bg: 'bg-indigo-50', shadow: 'shadow-indigo-100' };
        if (lowerName.includes('reading') || lowerName.includes('writing') || lowerName.includes('english')) return { icon: PenTool, color: 'bg-violet-600', text: 'text-violet-600', bg: 'bg-violet-50', shadow: 'shadow-violet-100' };
        if (lowerName.includes('listen')) return { icon: Headphones, color: 'bg-sky-600', text: 'text-sky-600', bg: 'bg-sky-50', shadow: 'shadow-sky-100' };
        if (lowerName.includes('speak')) return { icon: Mic, color: 'bg-fuchsia-600', text: 'text-fuchsia-600', bg: 'bg-fuchsia-50', shadow: 'shadow-fuchsia-100' };
        if (lowerName.includes('gk') || lowerName.includes('general')) return { icon: GlobeIcon, color: 'bg-teal-600', text: 'text-teal-600', bg: 'bg-teal-50', shadow: 'shadow-teal-100' };
        if (lowerName.includes('imat')) return { icon: Medal, color: 'bg-red-600', text: 'text-red-600', bg: 'bg-red-50', shadow: 'shadow-red-100' };
        if (lowerName.includes('cent')) return { icon: Rocket, color: 'bg-indigo-700', text: 'text-indigo-700', bg: 'bg-indigo-50', shadow: 'shadow-indigo-100' };
        if (lowerName.includes('sat')) return { icon: GraduationCap, color: 'bg-blue-800', text: 'text-blue-800', bg: 'bg-blue-50', shadow: 'shadow-blue-100' };
        if (lowerName.includes('ielts')) return { icon: GlobeIcon, color: 'bg-emerald-700', text: 'text-emerald-700', bg: 'bg-emerald-50', shadow: 'shadow-emerald-100' };
        return { icon: Target, color: 'bg-indigo-600', text: 'text-indigo-600', bg: 'bg-indigo-50', shadow: 'shadow-indigo-100' };
    };

    const handleReport = async (questionId: string, reason: string = 'Inaccurate Information') => {
        if (!user) return;
        try {
            const { error: reportError } = await (supabase as any)
                .from('question_reports')
                .insert({
                    user_id: user.id,
                    question_id: questionId,
                    master_question_id: questionId,
                    reason: reason,
                    source_table: 'learning_quiz_questions'
                });

            if (reportError) throw reportError;

            toast({
                title: 'Report Submitted',
                description: 'Thank you for your feedback. We will review this question.',
            });
        } catch (error) {
            console.error('Error reporting question:', error);
            toast({
                title: 'Report Failed',
                description: 'Could not submit report.',
                variant: 'destructive'
            });
        }
    };

    // --- RENDER HELPERS ---

    if (view === 'selection') {
        if (isLoading) {
            return (
                <Layout isLoading={isLoading}>
                    <LearningSkeleton />
                    <UpgradeModal
                        isOpen={isUpgradeModalOpen}
                        onClose={() => setIsUpgradeModalOpen(false)}
                        title="Full Lectures Locked"
                        description="Explorer users can only access introductory units. Upgrade to PRO to unlock all 150+ specialized training lectures and full syllabus coverage."
                        feature="All Training Units"
                    />
                </Layout>
            );
        }

        return (
            <Layout isLoading={isLoading}>
                <div className="container mx-auto px-4 py-8 sm:py-12 max-w-6xl">
                    <div className="text-center mb-10 sm:mb-12 space-y-3">
                        <div className="inline-flex items-center gap-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-full bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 text-[9px] sm:text-[10px] font-black uppercase tracking-[0.2em] animate-fade-in border border-indigo-100 dark:border-indigo-500/20">
                            <Rocket className="w-3 h-3" />
                            Knowledge Portal
                        </div>
                        <h1 className="text-3xl sm:text-5xl font-black text-slate-900 dark:text-slate-100 tracking-tight px-4">
                            {selectionLevel === 'exam' ? 'Choose Your Mission' : `Mission: ${selectedExam?.name || 'Loading...'}`}
                        </h1>
                        <p className="text-slate-500 dark:text-slate-400 max-w-xl mx-auto font-medium text-sm sm:text-base px-6">
                            {selectionLevel === 'exam'
                                ? 'Select a standardized protocol below to begin your neural optimization journey.'
                                : 'Select a training course to access the unit dashboard.'}
                        </p>
                    </div>

                    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-10">
                        {selectionLevel === 'exam' ? (
                            exams.map((exam) => {
                                const info = getSubjectInfo(exam.name);
                                return (
                                    <button
                                        key={exam.id}
                                        onClick={() => handleExamSelect(exam)}
                                        className="group relative p-8 sm:p-10 rounded-[2.5rem] bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-[0_20px_50px_rgba(0,0,0,0.04)] hover:shadow-[0_20px_50px_rgba(79,70,229,0.1)] hover:border-indigo-500 dark:hover:border-indigo-500 transition-all duration-500 hover:-translate-y-2 text-left overflow-hidden"
                                    >
                                        <div className={`absolute -top-10 -right-10 w-40 h-40 ${info.bg}/50 dark:${info.bg}/20 rounded-full blur-3xl group-hover:${info.bg}/80 transition-colors`} />
                                        <div className="relative z-10 space-y-6">
                                            <div className={`w-14 h-14 sm:w-16 sm:h-16 rounded-2xl ${info.color} flex items-center justify-center text-white shadow-xl ${info.shadow} dark:shadow-none group-hover:scale-110 group-hover:rotate-6 transition-all duration-500`}>
                                                <info.icon className="w-7 h-7 sm:w-8 sm:h-8" />
                                            </div>
                                            <div>
                                                <h3 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white mb-2 tracking-tight">{exam.name}</h3>
                                                <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 font-medium leading-relaxed line-clamp-3">
                                                    {exam.description || 'Access preparatory materials for this strategic examination.'}
                                                </p>
                                            </div>
                                            <div className={`flex items-center gap-2 ${info.text} font-black text-[10px] uppercase tracking-[0.2em] pt-2`}>
                                                Initialize Protocol <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                                            </div>
                                        </div>
                                    </button>
                                );
                            })
                        ) : (
                            courses.map((course) => {
                                const info = getSubjectInfo(course.name);
                                return (
                                    <button
                                        key={course.id}
                                        onClick={() => handleCourseSelect(course)}
                                        className="group relative p-8 sm:p-10 rounded-[2.5rem] bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-[0_20px_50px_rgba(0,0,0,0.04)] hover:shadow-[0_20px_50px_rgba(79,70,229,0.1)] hover:border-indigo-500 dark:hover:border-indigo-500 transition-all duration-500 hover:-translate-y-2 text-left overflow-hidden"
                                    >
                                        <div className={`absolute -top-10 -right-10 w-40 h-40 ${info.bg}/50 dark:${info.bg}/10 rounded-full blur-3xl group-hover:${info.bg}/80 transition-colors`} />
                                        <div className="relative z-10 space-y-6">
                                            <div className={`w-14 h-14 sm:w-16 sm:h-16 rounded-2xl ${info.bg} dark:${info.bg}/20 flex items-center justify-center ${info.text} transition-all duration-500 group-hover:${info.color} group-hover:text-white group-hover:scale-110 group-hover:shadow-xl ${info.shadow} dark:group-hover:shadow-none border border-transparent dark:border-white/5`}>
                                                <info.icon className="w-7 h-7 sm:w-8 sm:h-8" />
                                            </div>
                                            <div>
                                                <h3 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white mb-2 tracking-tight">{course.name}</h3>
                                                <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 font-medium leading-relaxed line-clamp-2">
                                                    {course.description || 'Deep-dive mastery of course-specific objectives.'}
                                                </p>
                                            </div>
                                            <div className="pt-6 border-t border-slate-50 dark:border-slate-800 flex items-center justify-between">
                                                <span className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em]">Analysis Entry</span>
                                                <ChevronRight className={`w-4 h-4 text-slate-300 group-hover:translate-x-1 group-hover:${info.text} transition-all`} />
                                            </div>
                                        </div>
                                    </button>
                                );
                            })
                        )}
                    </div>
                </div>
            </Layout>
        );

    }

    if (view === 'dashboard') {
        return (
            <Layout isLoading={isLoading} showFooter={false}>
                <div className="flex flex-col lg:flex-row min-h-[calc(100vh-64px)] bg-slate-50 dark:bg-slate-950">
                    {/* LEFT SIDEBAR - UNITS */}
                    <aside className={cn(
                        "w-full lg:w-80 border-b lg:border-b-0 lg:border-r border-slate-200/60 dark:border-border bg-white/40 dark:bg-slate-900/40 backdrop-blur-xl flex flex-col z-30 transition-all duration-300",
                        "h-auto lg:h-full shrink-0"
                    )}>
                        <div className="p-6 sm:p-8 border-b border-slate-100/80 dark:border-slate-800 space-y-4">
                            <button
                                onClick={resetToCourse}
                                className="flex items-center gap-2 text-slate-400 hover:text-indigo-600 transition-colors group text-[9px] font-black uppercase tracking-[0.2em]"
                            >
                                <ArrowLeft className="w-3 h-3 group-hover:-translate-x-1 transition-transform" />
                                Mission Console
                            </button>
                            <div className="flex items-center gap-3">
                                <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-lg shadow-indigo-100 ring-4 ring-indigo-50">
                                    <Target className="w-4 h-4 sm:w-5 sm:h-5" />
                                </div>
                                <div className="min-w-0">
                                    <h2 className="font-black text-slate-900 dark:text-slate-100 leading-tight text-xs sm:text-sm truncate">{selectedCourse?.name}</h2>
                                    <p className="text-[8px] sm:text-[9px] text-slate-400 font-black uppercase tracking-widest leading-none mt-1">{units.length} Training Units</p>
                                </div>
                            </div>
                        </div>

                        <div className="flex-1 overflow-x-auto lg:overflow-y-auto custom-scrollbar p-3 sm:p-4 flex lg:flex-col gap-2 no-scrollbar">
                            {units.map((unit, index) => (
                                <button
                                    key={unit.id}
                                    onClick={() => fetchUnitDashboard(unit, index)}
                                    className={cn(
                                        "p-3 sm:p-4 rounded-xl sm:rounded-2xl text-left transition-all group relative overflow-hidden shrink-0 lg:w-full",
                                        "min-w-[140px] sm:min-w-[160px] lg:min-w-0",
                                        selectedUnit?.id === unit.id
                                            ? "bg-white dark:bg-card shadow-sm border border-slate-200/50"
                                            : "hover:bg-white/60",
                                        isExplorer && index > 0 && "opacity-50"
                                    )}
                                >
                                    {isExplorer && index > 0 && (
                                        <div className="absolute inset-0 bg-slate-900/5 backdrop-blur-[1px] flex items-center justify-center z-10">
                                            <Lock className="w-4 h-4 text-slate-400/50" />
                                        </div>
                                    )}
                                    {selectedUnit?.id === unit.id && (
                                        <div className="absolute left-0 lg:left-0 top-0 lg:top-1/2 -translate-y-0 lg:-translate-y-1/2 w-full lg:w-1 h-1 lg:h-8 bg-indigo-600 rounded-r-lg" />
                                    )}
                                    <p className="text-[7px] sm:text-[8px] font-black uppercase tracking-widest text-slate-400 mb-1">
                                        Unit {index + 1}
                                    </p>
                                    <h3 className={cn(
                                        "text-[10px] sm:text-xs font-bold leading-snug transition-colors line-clamp-1 lg:line-clamp-2",
                                        selectedUnit?.id === unit.id ? "text-indigo-600" : "text-slate-600 dark:text-slate-400 group-hover:text-slate-900 dark:text-slate-100"
                                    )}>
                                        {unit.name}
                                    </h3>
                                </button>
                            ))}
                        </div>


                    </aside>

                    {/* MAIN DASHBOARD */}
                    <main className="flex-1 flex flex-col h-full bg-white dark:bg-card relative overflow-hidden">
                        {/* Top Context Bar */}
                        <div className="h-auto lg:h-16 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-100 dark:border-border flex flex-col sm:flex-row items-center justify-between px-4 sm:px-6 lg:px-10 py-3 sm:py-0 z-20 sticky top-0 gap-3">
                            <div className="flex items-center gap-3 w-full sm:w-auto">
                                <Search className="w-3.5 h-3.5 text-slate-300" />
                                <input
                                    type="text"
                                    placeholder="Search objectives..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="bg-transparent border-none text-[9px] sm:text-[10px] font-black uppercase tracking-widest text-slate-600 dark:text-slate-400 focus:outline-none placeholder:text-slate-300 flex-1 sm:w-48 lg:w-64"
                                />
                            </div>
                            <div className="flex items-center justify-between sm:justify-end gap-4 sm:gap-6 w-full sm:w-auto">
                                <div className="flex items-center gap-2">
                                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                                    <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-widest text-slate-400">Archive Live</span>
                                </div>
                                <div className="hidden sm:block h-6 w-px bg-slate-100 dark:bg-slate-700" />
                                <Button
                                    size="sm"
                                    onClick={handleNextUnit}
                                    className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl h-8 sm:h-9 px-4 sm:px-5 text-[9px] sm:text-[10px] font-black uppercase tracking-widest shadow-lg shadow-indigo-100 transition-all active:scale-95"
                                >
                                    Next Skill
                                </Button>
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto custom-scrollbar bg-slate-50/20 dark:bg-slate-950/20">
                            {selectedUnit ? (
                                <div className="max-w-4xl mx-auto px-6 sm:px-10 py-8 sm:py-16 space-y-10 sm:space-y-12">
                                    {/* Unit Header */}
                                    <div className="space-y-6">
                                        <div className="flex items-center gap-2 text-[9px] sm:text-[10px] font-black uppercase tracking-[0.2em] text-indigo-500">
                                            <div className="w-4 sm:w-5 h-px bg-indigo-500/30" />
                                            <span>Training Unit {units.findIndex(u => u.id === selectedUnit.id) + 1}</span>
                                        </div>
                                        <div className="pt-2">
                                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 sm:gap-8">
                                                <div className="space-y-4">
                                                    <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-slate-900 dark:text-slate-100 tracking-tight leading-[1.1]">
                                                        {selectedUnit.name}
                                                    </h1>
                                                    <p className="text-sm sm:text-base text-slate-500 dark:text-slate-400 font-medium max-w-2xl leading-relaxed">
                                                        {selectedUnit.description || 'Master these foundational objectives to optimize your standardized performance through high-fidelity simulations.'}
                                                    </p>
                                                </div>
                                                {quizAvailability.topics[selectedUnit.id] ? (
                                                    <Button
                                                        onClick={() => startQuiz(selectedUnit.id, 'topic', selectedUnit)}
                                                        className="h-14 sm:h-16 px-6 sm:px-8 rounded-2xl sm:rounded-3xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-[10px] sm:text-xs uppercase tracking-[0.2em] shadow-2xl shadow-indigo-600/20 active:scale-95 transition-all group w-full md:w-auto"
                                                    >
                                                        <Target className="w-4 h-4 sm:w-5 sm:h-5 mr-3 group-hover:rotate-12 transition-transform" />
                                                        <span>Mastery Check</span>
                                                        {quizCompletion.topics[selectedUnit.id] && (
                                                            <div className="ml-3 w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-emerald-500 flex items-center justify-center shadow-lg shadow-emerald-500/40">
                                                                <CheckCircle2 className="w-3 h-3 sm:w-4 sm:h-4 text-white" />
                                                            </div>
                                                        )}
                                                    </Button>
                                                ) : (
                                                    <div className="h-14 sm:h-16 px-6 sm:px-8 rounded-2xl sm:rounded-3xl bg-slate-100 dark:bg-muted flex items-center justify-center gap-3 text-slate-400 text-[9px] sm:text-[10px] font-black uppercase tracking-widest border border-slate-200/50 w-full md:w-auto">
                                                        <Target className="w-4 h-4 sm:w-5 sm:h-5 opacity-30" />
                                                        Quiz unavailable
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        {selectedUnit.resource_url && (
                                            <div className="pt-2">
                                                <a
                                                    href={selectedUnit.resource_url}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="inline-flex items-center gap-3 px-5 py-2.5 rounded-xl sm:rounded-2xl bg-indigo-600 text-white text-[9px] sm:text-[10px] font-black uppercase tracking-widest shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all group w-full sm:w-auto justify-center"
                                                >
                                                    <Download className="w-3.5 h-3.5 group-hover:scale-110 transition-transform" />
                                                    <span>{selectedUnit.resource_title || 'Download Resources'}</span>
                                                </a>
                                            </div>
                                        )}
                                    </div>

                                    {/* Learn Sections (Topics) */}
                                    <div className="space-y-12 sm:space-y-16">
                                        {isLoading ? (
                                            <div className="flex items-center justify-center py-20">
                                                <Loader2 className="w-8 h-8 sm:w-10 sm:h-10 animate-spin text-indigo-600" />
                                            </div>
                                        ) : filteredTopics.map((topic, tIdx) => (
                                            <div key={topic.id} className="space-y-6 sm:space-y-8">
                                                <div className="flex flex-col sm:flex-row sm:items-end justify-between border-b border-slate-200/60 dark:border-slate-700 pb-5 sm:pb-6 gap-4">
                                                    <div className="space-y-1">
                                                        <p className="text-[8px] sm:text-[9px] font-black uppercase tracking-[0.2em] text-slate-400">Objective Section</p>
                                                        <h2 className="text-xl sm:text-2xl font-black tracking-tight text-slate-800 dark:text-slate-100">
                                                            {topic.name}
                                                        </h2>
                                                    </div>
                                                    <div className="text-[8px] sm:text-[9px] font-black uppercase tracking-[0.2em] text-slate-400 flex items-center justify-between sm:justify-end gap-4">
                                                        {topic.resource_url && (
                                                            <a
                                                                href={topic.resource_url}
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                                className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 transition-colors"
                                                            >
                                                                <Download className="w-3 h-3" />
                                                                <span>Section Guide</span>
                                                            </a>
                                                        )}
                                                        <div className="px-2.5 py-1 rounded-full bg-white dark:bg-card border border-slate-200/50">
                                                            Target {tIdx + 1}
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="grid gap-6 sm:gap-8">
                                                    {/* DIRECT UNIT CONTENT */}
                                                    {topic.directContent && topic.directContent.length > 0 && (
                                                        <div className="grid lg:grid-cols-2 gap-6 sm:gap-10 items-stretch">
                                                            <div className="space-y-5 sm:space-y-6">
                                                                <div className="flex items-center gap-3">
                                                                    <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-emerald-50 dark:bg-emerald-900/10 flex items-center justify-center text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/30">
                                                                        <Sparkles className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                                                                    </div>
                                                                    <h3 className="text-[10px] sm:text-xs font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">Primary Intel</h3>
                                                                </div>
                                                                <div className="space-y-2.5 sm:space-y-3">
                                                                    {topic.directContent.map((video: any) => {
                                                                        const isActuallyVideo = video.video_url && video.video_url.trim().length > 5;
                                                                        const isDoc = video.content_type === 'doc' || video.content_type === 'article' || !isActuallyVideo;
                                                                        const isCompleted = userProgress.has(video.id);

                                                                        return (
                                                                            <button
                                                                                key={video.id}
                                                                                onClick={() => handleVideoSelect(video, topic)}
                                                                                className={cn(
                                                                                    "w-full p-4 sm:p-5 rounded-xl sm:rounded-2xl border shadow-sm transition-all flex items-center justify-between group text-left active:scale-[0.98]",
                                                                                    isCompleted
                                                                                        ? "bg-emerald-500/5 border-emerald-500/30 hover:border-emerald-500/50 shadow-sm"
                                                                                        : "bg-white dark:bg-card border-slate-100 dark:border-border hover:border-indigo-600 hover:shadow-lg hover:shadow-indigo-500/5"
                                                                                )}
                                                                            >
                                                                                <div className="flex items-center gap-3 sm:gap-4 min-w-0">
                                                                                    <div className={cn(
                                                                                        "w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center transition-all transform group-hover:rotate-6",
                                                                                        isCompleted
                                                                                            ? "bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600"
                                                                                            : "bg-slate-50 dark:bg-muted text-slate-400 group-hover:bg-indigo-600 group-hover:text-white"
                                                                                    )}>
                                                                                        {isCompleted ? <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5" /> : (isDoc ? <FileText className="w-4 h-4 sm:w-5 sm:h-5" /> : <Video className="w-4 h-4 sm:w-5 sm:h-5" />)}
                                                                                    </div>
                                                                                    <div className="min-w-0">
                                                                                        <p className={cn(
                                                                                            "text-[11px] sm:text-xs font-black uppercase tracking-tight truncate",
                                                                                            isCompleted ? "text-emerald-700/80" : "text-slate-800 dark:text-slate-100"
                                                                                        )}>{video.title}</p>
                                                                                        <span className={cn(
                                                                                            "text-[7px] sm:text-[8px] font-black uppercase tracking-widest",
                                                                                            isCompleted ? "text-emerald-500/60" : "text-indigo-500"
                                                                                        )}>{isDoc ? 'Intelligence Document' : 'Mastery Content'}</span>
                                                                                    </div>
                                                                                </div>
                                                                                <ChevronRight className={cn("w-4 h-4 transition-all shrink-0", isCompleted ? "text-emerald-500/40" : "text-slate-300 group-hover:text-indigo-600 group-hover:translate-x-1")} />
                                                                            </button>
                                                                        );
                                                                    })}
                                                                </div>
                                                            </div>
                                                            {/* Quiz Placeholder for direct content */}
                                                            <div className="bg-indigo-600/5 dark:bg-indigo-900/5 rounded-[1.5rem] sm:rounded-[2rem] border border-indigo-100/30 dark:border-indigo-900/30 p-8 sm:p-10 flex flex-col items-center justify-center space-y-4 sm:space-y-5">
                                                                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-white dark:bg-card flex items-center justify-center text-indigo-600 dark:text-indigo-400 shadow-sm">
                                                                    <Target className="w-5 h-5 sm:w-6 sm:h-6" />
                                                                </div>
                                                                <div className="text-center">
                                                                    <p className="text-[9px] sm:text-[10px] font-black uppercase tracking-widest text-indigo-400">Analysis Check</p>
                                                                    <h4 className="text-xs sm:text-sm font-black text-slate-800 dark:text-slate-100">Intel Verification</h4>
                                                                </div>
                                                                {quizAvailability.units[topic.id] ? (
                                                                    <Button
                                                                        onClick={() => startQuiz(topic.id, 'unit', topic)}
                                                                        size="sm"
                                                                        className="rounded-full bg-white dark:bg-card text-indigo-600 border border-indigo-100 dark:border-border hover:bg-slate-50 dark:bg-muted font-black px-6 sm:px-8 h-9 sm:h-10 flex items-center gap-2 text-[9px] sm:text-[10px]"
                                                                    >
                                                                        Start Check
                                                                        {quizCompletion.units[topic.id] && <CheckCircle2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-500" />}
                                                                    </Button>
                                                                ) : (
                                                                    <p className="text-[8px] sm:text-[9px] font-black uppercase text-slate-400 opacity-60">Verification Offline</p>
                                                                )}
                                                            </div>
                                                        </div>
                                                    )}

                                                    {/* SUBUNITS LOOP */}
                                                    <div className="space-y-10 sm:space-y-12">
                                                        {topic.subunits && topic.subunits.map((subunit: any) => (
                                                            <div key={subunit.id} className="space-y-4 sm:space-y-5 px-1 sm:px-0">
                                                                <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                                                                    <div className="flex items-center gap-3 flex-1">
                                                                        <div className="w-6 h-6 rounded bg-slate-100 dark:bg-muted flex items-center justify-center text-slate-500">
                                                                            <LayoutDashboard className="w-3 h-3" />
                                                                        </div>
                                                                        <h4 className="text-[9px] sm:text-[10px] font-black uppercase tracking-widest text-slate-400 truncate">
                                                                            {subunit.name}
                                                                        </h4>
                                                                    </div>
                                                                    <div className="flex items-center justify-between sm:justify-end gap-3 border-t sm:border-0 pt-2 sm:pt-0 border-slate-50 dark:border-border">
                                                                        {quizAvailability.subunits[subunit.id] ? (
                                                                            <Button
                                                                                variant="ghost"
                                                                                onClick={() => startQuiz(subunit.id, 'subunit', subunit)}
                                                                                className="h-7 px-2.5 rounded-lg text-[8px] font-black uppercase tracking-widest text-indigo-500 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-muted transition-all gap-1.5"
                                                                            >
                                                                                <Target className="w-2.5 h-2.5" />
                                                                                <span>Take Quiz</span>
                                                                                {quizCompletion.subunits[subunit.id] && <CheckCircle2 className="w-2.5 h-2.5 text-emerald-500" />}
                                                                            </Button>
                                                                        ) : (
                                                                            <span className="text-[8px] font-black uppercase tracking-widest text-slate-300 px-2.5">
                                                                                No Quiz
                                                                            </span>
                                                                        )}
                                                                        {subunit.resource_url && (
                                                                            <a
                                                                                href={subunit.resource_url}
                                                                                target="_blank"
                                                                                rel="noopener noreferrer"
                                                                                className="flex items-center gap-1.5 text-[8px] font-black uppercase tracking-widest text-indigo-500 hover:text-indigo-600 transition-colors"
                                                                            >
                                                                                <Download className="w-2.5 h-2.5" />
                                                                                <span>Resources</span>
                                                                            </a>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                                <div className="space-y-2">
                                                                    {subunit.content && subunit.content.map((video: any) => {
                                                                        const isActuallyVideo = video.video_url && video.video_url.trim().length > 5;
                                                                        const isDoc = video.content_type === 'doc' || video.content_type === 'article' || !isActuallyVideo;
                                                                        const isCompleted = userProgress.has(video.id);

                                                                        return (
                                                                            <button
                                                                                key={video.id}
                                                                                onClick={() => handleVideoSelect(video, subunit)}
                                                                                className={cn(
                                                                                    "w-full p-3.5 rounded-xl transition-all flex items-center justify-between group text-left active:scale-[0.99] border",
                                                                                    isCompleted
                                                                                        ? "bg-emerald-500/5 border-emerald-500/20 hover:border-emerald-500/40 shadow-sm"
                                                                                        : "bg-white dark:bg-card border-slate-100 dark:border-border hover:border-indigo-600 hover:shadow-md"
                                                                                )}
                                                                            >
                                                                                <div className="flex items-center gap-3 min-w-0">
                                                                                    {isCompleted ? (
                                                                                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                                                                    ) : (
                                                                                        isDoc ? (
                                                                                            <FileText className="w-3.5 h-3.5 text-slate-600 dark:text-slate-400 group-hover:text-emerald-600" />
                                                                                        ) : (
                                                                                            <Play className="w-3.5 h-3.5 text-slate-600 dark:text-slate-400 group-hover:text-indigo-600 fill-current" />
                                                                                        )
                                                                                    )}
                                                                                    <p className={cn(
                                                                                        "text-[10px] sm:text-[11px] font-black uppercase tracking-tight truncate",
                                                                                        isCompleted ? "text-emerald-700/70" : "text-slate-700 dark:text-slate-300"
                                                                                    )}>{video.title}</p>
                                                                                </div>
                                                                                <ChevronRight className={cn("w-3 h-3 transition-transform", isCompleted ? "text-emerald-500/40" : "text-slate-300 group-hover:text-indigo-600 group-hover:translate-x-0.5")} />
                                                                            </button>
                                                                        );
                                                                    })}
                                                                </div>
                                                            </div>
                                                        ))}

                                                        {/* Topic's Practice Card */}
                                                        {topic.subunits && topic.subunits.length > 0 && (
                                                            <div className="bg-slate-900 rounded-[1.5rem] sm:rounded-[2rem] p-6 sm:p-8 text-center flex flex-col items-center justify-center space-y-4 group">
                                                                <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white">
                                                                    <Target className="w-5 h-5" />
                                                                </div>
                                                                <div>
                                                                    <p className="text-[8px] font-black uppercase tracking-widest text-indigo-400 opacity-80">Skill Validation</p>
                                                                    <h4 className="font-bold text-white text-[11px] tracking-tight">Full Unit Check</h4>
                                                                </div>
                                                                {quizAvailability.units[topic.id] ? (
                                                                    <Button
                                                                        onClick={() => startQuiz(topic.id, 'unit', topic)}
                                                                        size="sm"
                                                                        className="w-full sm:w-auto rounded-full bg-white dark:bg-card text-slate-900 dark:text-slate-100 hover:bg-white/90 font-black h-8 px-8 text-[9px] uppercase tracking-widest flex items-center justify-center gap-2"
                                                                    >
                                                                        Start Quiz
                                                                        {quizCompletion.units[topic.id] && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />}
                                                                    </Button>
                                                                ) : (
                                                                    <div className="w-full sm:w-auto h-8 px-8 rounded-full border border-white/10 flex items-center justify-center text-[8px] font-black uppercase text-slate-500/50">
                                                                        Offline
                                                                    </div>
                                                                )}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ) : null}
                        </div>
                    </main>
                </div>
            </Layout>
        );
    }

    if (view === 'video') {
        const topicsWithLessons = topics.flatMap(t => {
            const direct = (t.directContent || []).map((c: any) => ({ ...c, subunit: { name: 'Direct' } }));
            const subunitContent = (t.subunits || []).flatMap((s: any) => (s.content || []).map((c: any) => ({ ...c, subunit: s })));
            return [...direct, ...subunitContent];
        });
        const currentIdx = topicsWithLessons.findIndex(v => v.id === selectedVideo.id);
        const nextVideo = topicsWithLessons[currentIdx + 1];

        return (
            <Layout showFooter={false} isLoading={isLoading}>
                <div className="h-[calc(100vh-4.5rem)] flex flex-col lg:flex-row bg-[#020617] overflow-hidden">
                    {/* LESSON SIDEBAR */}
                    <aside className="w-full lg:w-[420px] border-t lg:border-t-0 lg:border-r border-white/5 bg-slate-900/40 backdrop-blur-3xl flex flex-col order-2 lg:order-1 h-2/5 lg:h-full">
                        <div className="p-6 lg:p-8 border-b border-white/5 space-y-4 lg:space-y-6">
                            <button
                                onClick={() => setView('dashboard')}
                                className="flex items-center gap-2 text-slate-500 hover:text-white transition-colors text-[9px] font-black uppercase tracking-[0.2em] group"
                            >
                                <ArrowLeft className="w-3 h-3 group-hover:-translate-x-1 transition-transform" />
                                Course Dashboard
                            </button>
                            <div className="space-y-1">
                                <h1 className="text-base lg:text-lg font-black text-white tracking-tight line-clamp-1 lg:line-clamp-2 leading-tight">{selectedUnit?.name}</h1>
                                <p className="text-[8px] lg:text-[9px] text-indigo-400 font-black uppercase tracking-[0.2em] mt-1 lg:mt-2">Lesson Module Alpha</p>
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto custom-scrollbar-dark p-4 lg:p-6 space-y-2 lg:space-y-3">
                            {topicsWithLessons.map((lesson, idx) => (
                                <button
                                    key={lesson.id}
                                    onClick={() => handleVideoSelect(lesson, lesson.subunit)}
                                    className={cn(
                                        "w-full p-4 lg:p-5 rounded-2xl lg:rounded-[2rem] text-left transition-all border group relative overflow-hidden",
                                        selectedVideo.id === lesson.id
                                            ? "bg-indigo-600 text-white border-transparent shadow-2xl shadow-indigo-600/20"
                                            : "border-white/5 hover:bg-white/5 bg-white/[0.02]"
                                    )}
                                >
                                    <div className="flex items-center gap-3 lg:gap-4 relative z-10">
                                        <div className={cn(
                                            "w-9 h-9 lg:w-10 lg:h-10 rounded-xl flex items-center justify-center transition-all shrink-0",
                                            selectedVideo.id === lesson.id ? "bg-white/20 text-white" : "bg-white/5 text-slate-500 group-hover:text-white"
                                        )}>
                                            {lesson.content_type === 'article' ? (
                                                <FileText className={cn("w-3.5 h-3.5 lg:w-4 lg:h-4", selectedVideo.id === lesson.id && "animate-pulse")} />
                                            ) : (
                                                <Play className={cn("w-3.5 h-3.5 lg:w-4 lg:h-4 fill-current", selectedVideo.id === lesson.id && "animate-pulse")} />
                                            )}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className={cn(
                                                "text-[7px] lg:text-[8px] font-black uppercase tracking-widest mb-1",
                                                selectedVideo.id === lesson.id ? "text-indigo-100/60" : "text-slate-600 dark:text-slate-400"
                                            )}>Module 0{idx + 1}</p>
                                            <h3 className={cn(
                                                "text-[11px] lg:text-xs font-bold leading-tight truncate lg:whitespace-normal",
                                                selectedVideo.id === lesson.id ? "text-white" : "text-slate-400 group-hover:text-slate-200"
                                            )}>
                                                {lesson.title}
                                            </h3>
                                        </div>
                                    </div>
                                </button>
                            ))}
                        </div>
                    </aside>

                    {/* PLAYER AREAL AREA */}
                    <main className="flex-1 overflow-y-auto custom-scrollbar-dark order-1 lg:order-2 bg-[#020617] h-3/5 lg:h-full">
                        <div className="min-h-full flex flex-col">
                            <div className="flex-1 flex flex-col items-center justify-start p-4 md:p-8 lg:p-12 relative group min-h-[40vh] lg:min-h-[50vh] overflow-y-auto">
                                <div className="absolute inset-0 bg-indigo-500/5 animate-pulse" />
                                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] sm:w-[600px] h-[300px] sm:h-[600px] bg-indigo-600/10 rounded-full blur-[80px] sm:blur-[120px] opacity-30 pointer-events-none" />

                                {(() => {
                                    const isActuallyVideo = selectedVideo.video_url && selectedVideo.video_url.trim().length > 5;
                                    const isDoc = selectedVideo.content_type === 'doc' || selectedVideo.content_type === 'article' || !isActuallyVideo;

                                    if (isDoc) {
                                        const docUrl = selectedVideo.video_url || selectedVideo.resource_url;
                                        const canEmbed = isEmbeddable(docUrl);

                                        return (
                                            <div className="relative z-10 w-full max-w-4xl bg-white dark:bg-card rounded-2xl md:rounded-[2rem] shadow-2xl shadow-slate-900/20 p-8 sm:p-12 lg:p-20 space-y-10 lg:space-y-12 animate-in fade-in slide-in-from-bottom-8 duration-1000 border border-slate-100 dark:border-white/5">
                                                <div className="absolute top-0 right-0 p-12 opacity-5 pointer-events-none">
                                                    <FileText size={200} />
                                                </div>
                                                <div className="pb-10 lg:pb-12 border-b border-slate-100 dark:border-white/10 relative z-10">
                                                    <div className="flex items-center gap-4 mb-8">
                                                        <div className="w-16 h-16 bg-indigo-600/10 rounded-2xl flex items-center justify-center text-indigo-600 shadow-inner">
                                                            <FileText size={32} />
                                                        </div>
                                                        <div>
                                                            <span className="text-[10px] font-black text-indigo-600 uppercase tracking-[0.4em] opacity-80">Intelligence Briefing</span>
                                                            <h1 className="text-3xl sm:text-4xl lg:text-6xl font-black text-slate-900 dark:text-slate-100 tracking-tight leading-[1.05] mt-2">
                                                                {selectedVideo.title}
                                                                {!canEmbed && docUrl && (
                                                                    <Button
                                                                        onClick={() => window.open(docUrl, '_blank')}
                                                                        variant="outline"
                                                                        size="sm"
                                                                        className="ml-4 h-8 bg-indigo-50 text-indigo-600 border-indigo-200 rounded-lg text-[9px] font-black uppercase tracking-widest hover:bg-indigo-600 hover:text-white transition-all shadow-sm"
                                                                    >
                                                                        <ExternalLink className="w-3 h-3 mr-2" />
                                                                        Open External Source
                                                                    </Button>
                                                                )}
                                                            </h1>
                                                        </div>
                                                    </div>
                                                    <div className="flex flex-wrap gap-3">
                                                        <div className="px-4 py-1.5 bg-indigo-600/10 rounded-full text-[9px] font-black uppercase tracking-widest text-indigo-600 border border-indigo-600/20">Classified Intel</div>
                                                        <div className="px-4 py-1.5 bg-slate-100 dark:bg-white/5 rounded-full text-[9px] font-black uppercase tracking-widest text-slate-500">Document V.1.0</div>
                                                        <div className="px-4 py-1.5 bg-emerald-500/10 rounded-full text-[9px] font-black uppercase tracking-widest text-emerald-600 border border-emerald-500/20 flex items-center gap-2">
                                                            <Clock size={10} />
                                                            {selectedVideo.reading_time || '5 min read'}
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="prose prose-slate dark:prose-invert prose-sm sm:prose-base lg:prose-lg max-w-none relative z-10">
                                                    {selectedVideo.text_content ? (
                                                        <div className="font-['Inter'] text-slate-800 dark:text-slate-100 leading-relaxed lg:leading-[1.8]">
                                                            {/* Render Article Content logic moved here */}
                                                            {(() => {
                                                                const isHTML = /<\/?[a-z][\s\S]*>/i.test(selectedVideo.text_content);
                                                                if (isHTML) {
                                                                    const sanitized = DOMPurify.sanitize(selectedVideo.text_content, {
                                                                        ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'u', 's', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
                                                                            'ul', 'ol', 'li', 'a', 'img', 'blockquote', 'code', 'pre', 'table', 'thead',
                                                                            'tbody', 'tr', 'th', 'td', 'div', 'span', 'figure', 'figcaption'],
                                                                        ALLOWED_ATTR: ['href', 'src', 'alt', 'title', 'class', 'style', 'target', 'rel']
                                                                    });
                                                                    return <MathText isHtml={true} content={sanitized} className="tinymce-content" />;
                                                                } else {
                                                                    return (
                                                                        <div className="space-y-6">
                                                                            {selectedVideo.text_content.split('\n').map((line: string, i: number) => {
                                                                                if (!line.trim()) return <div key={i} className="h-4" />;
                                                                                return <p key={i}>{line}</p>;
                                                                            })}
                                                                        </div>
                                                                    );
                                                                }
                                                            })()}
                                                        </div>
                                                    ) : docUrl && canEmbed ? (
                                                        <div className="w-full aspect-video rounded-2xl overflow-hidden border border-slate-100 dark:border-white/5 shadow-xl">
                                                            <iframe
                                                                src={getEmbedUrl(docUrl)}
                                                                className="w-full h-full border-0"
                                                                title={selectedVideo.title}
                                                            />
                                                        </div>
                                                    ) : (
                                                        <div className="flex flex-col items-center justify-center p-20 border-2 border-dashed border-slate-100 dark:border-white/5 rounded-[2rem]">
                                                            <FileText size={48} className="text-slate-200 mb-4" />
                                                            <p className="text-slate-400 font-black uppercase tracking-widest text-xs">No Content Found in Archive</p>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    } else {
                                        const videoUrl = selectedVideo.video_url;
                                        const canEmbed = isEmbeddable(videoUrl);

                                        return (
                                            <div className="relative z-10 w-full max-w-6xl aspect-video rounded-xl sm:rounded-[2rem] lg:rounded-[3rem] overflow-hidden border-4 border-white/5 shadow-[0_32px_128px_-16px_rgba(0,0,0,0.9)]">
                                                {canEmbed ? (
                                                    <iframe
                                                        className="w-full h-full"
                                                        src={getEmbedUrl(videoUrl)}
                                                        title={selectedVideo.title}
                                                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                                        allowFullScreen
                                                    />
                                                ) : (
                                                    <div className="w-full h-full flex flex-col items-center justify-center bg-slate-900 space-y-8 p-12 text-center">
                                                        <div className="w-24 h-24 rounded-full bg-slate-800 flex items-center justify-center text-slate-500 mb-4">
                                                            <AlertTriangle size={48} />
                                                        </div>
                                                        <div className="space-y-2">
                                                            <h3 className="text-2xl font-black text-white uppercase tracking-tight">External Intel Protocol</h3>
                                                            <p className="text-slate-400 font-medium max-w-md mx-auto leading-relaxed">
                                                                This source provider resists internal framing. To maintain neural synchronization, please access the content through an external secure channel.
                                                            </p>
                                                        </div>
                                                        <Button
                                                            onClick={() => window.open(videoUrl, '_blank')}
                                                            className="h-16 px-12 rounded-full bg-indigo-600 hover:bg-indigo-700 text-white font-black text-[11px] uppercase tracking-[0.2em] shadow-2xl shadow-indigo-600/20 active:scale-95 transition-all flex items-center gap-4"
                                                        >
                                                            Establish Secure Link
                                                            <ExternalLink size={18} />
                                                        </Button>
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    }
                                })()}
                            </div>

                            {/* PLAYER CONTROLS / INFO */}
                            <div className="bg-slate-900/40 backdrop-blur-2xl border-t border-white/5 p-6 sm:p-8 lg:p-12 mt-auto">
                                <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center justify-between gap-8 lg:gap-10">
                                    <div className="space-y-3 lg:space-y-4 text-center md:text-left flex-1">
                                        <div className="flex items-center justify-center md:justify-start gap-4">
                                            <div className="px-3 py-1 rounded-full bg-indigo-500/10 text-indigo-400 text-[7px] lg:text-[8px] font-black uppercase tracking-widest border border-indigo-500/20">
                                                Simulation Mode
                                            </div>
                                            <div className="flex items-center gap-2 text-slate-500 text-[7px] lg:text-[8px] font-black uppercase tracking-widest">
                                                <div className="w-1 h-1 rounded-full bg-slate-500" />
                                                Active Session
                                            </div>
                                        </div>
                                        <h2 className="text-xl sm:text-2xl lg:text-3xl font-black text-white tracking-tight leading-tight">
                                            {selectedVideo.title}
                                        </h2>
                                        <p className="text-slate-400 font-medium max-w-2xl text-xs sm:text-sm leading-relaxed">
                                            {selectedVideo.description || 'Analyze this high-fidelity module to internalize standardized objective mastery and pattern recognition protocols.'}
                                        </p>
                                    </div>

                                    <div className="flex flex-col sm:flex-row items-center gap-3 sm:gap-4 w-full md:w-auto">
                                        {nextVideo && (
                                            <Button
                                                onClick={() => handleVideoSelect(nextVideo, nextVideo.subunit)}
                                                className="h-14 sm:h-16 lg:h-20 px-6 sm:px-8 lg:px-12 rounded-xl sm:rounded-[2rem] bg-white text-slate-900 hover:bg-white/90 font-black text-[9px] lg:text-[10px] uppercase tracking-[0.2em] shadow-2xl transition-all active:scale-95 shrink-0 group w-full sm:w-auto"
                                            >
                                                Next Session
                                                <ChevronRight className="w-4 h-4 lg:w-5 lg:h-5 ml-4 group-hover:translate-x-2 transition-transform" />
                                            </Button>
                                        )}

                                        {selectedVideo.resource_url && (
                                            <a
                                                href={selectedVideo.resource_url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="h-14 sm:h-16 lg:h-20 px-6 lg:px-8 rounded-xl sm:rounded-[2rem] border-2 border-white/10 hover:bg-white/5 text-white flex items-center justify-center gap-3 font-black text-[9px] lg:text-[10px] uppercase tracking-[0.2em] transition-all group w-full sm:w-auto"
                                            >
                                                <Download className="w-4 h-4 lg:w-5 lg:h-5 group-hover:scale-110 transition-transform" />
                                                <span>Resource</span>
                                            </a>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* COMMENT SECTION */}
                            <div className="max-w-4xl mx-auto w-full px-4 sm:px-6 lg:px-12 py-12 sm:py-20 lg:py-32">
                                <div className="space-y-8 lg:space-y-12">
                                    <div className="flex items-center justify-between border-b border-white/5 pb-6 lg:pb-8">
                                        <div className="flex items-center gap-4">
                                            <div className="w-10 h-10 lg:w-12 lg:h-12 rounded-xl lg:rounded-2xl bg-indigo-600/20 flex items-center justify-center text-indigo-400">
                                                <MessageSquare className="w-5 h-5 lg:w-6 lg:h-6" />
                                            </div>
                                            <div>
                                                <h3 className="text-lg lg:text-xl font-black text-white tracking-tight">Discussion Archive</h3>
                                                <p className="text-[9px] lg:text-[10px] text-slate-500 font-black uppercase tracking-widest mt-1">{comments.length} Entries</p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Post Comment / Reply */}
                                    <div className={`bg-white/5 rounded-2xl lg:rounded-[2.5rem] p-6 lg:p-10 border border-white/5 space-y-4 lg:space-y-6 relative overflow-hidden group transition-all ${replyTo ? 'ring-2 ring-indigo-500/50' : ''}`}>
                                        <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 rounded-full blur-3xl -mr-10 -mt-10" />

                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-3 lg:gap-4">
                                                <div className="w-7 h-7 lg:w-8 lg:h-8 rounded-full bg-slate-800 flex items-center justify-center text-slate-400">
                                                    <UserIcon className="w-3.5 h-3.5 lg:w-4 lg:h-4" />
                                                </div>
                                                <span className="text-[9px] lg:text-[10px] font-black uppercase tracking-widest text-slate-400">
                                                    {replyTo ? `Replying to Agent ${replyTo.profiles?.display_name || replyTo.user_id.slice(0, 8)}` : `Security Clearance: ${user?.email?.split('@')[0]}`}
                                                </span>
                                            </div>
                                            {replyTo && (
                                                <button onClick={() => setReplyTo(null)} className="text-[9px] lg:text-[10px] font-black uppercase text-slate-500 hover:text-white transition-colors">Cancel</button>
                                            )}
                                        </div>

                                        <textarea
                                            value={newComment}
                                            onChange={(e) => setNewComment(e.target.value)}
                                            placeholder={replyTo ? "Enter your reply..." : "Broadcast your analysis..."}
                                            className="w-full bg-slate-900/50 border border-white/5 rounded-xl lg:rounded-2xl p-4 lg:p-6 text-sm text-slate-300 placeholder:text-slate-600 focus:outline-none focus:border-indigo-500/50 transition-all resize-none h-24 lg:h-32"
                                        />
                                        <div className="flex justify-end">
                                            <Button
                                                onClick={handlePostComment}
                                                disabled={!newComment.trim()}
                                                className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-full px-6 lg:px-8 h-10 lg:h-12 font-black text-[9px] lg:text-[10px] uppercase tracking-widest shadow-xl shadow-indigo-600/10 active:scale-95 transition-all flex items-center gap-3"
                                            >
                                                {replyTo ? 'Deploy Reply' : 'Deploy'}
                                                <Send className="w-3 h-3 lg:w-3.5 lg:h-3.5" />
                                            </Button>
                                        </div>
                                    </div>

                                    {/* Comments Feed */}
                                    <div className="space-y-6 lg:space-y-8">
                                        {comments.length === 0 ? (
                                            <div className="text-center py-12 lg:py-20 bg-white/[0.02] rounded-2xl lg:rounded-[3rem] border border-dashed border-white/5">
                                                <div className="w-12 h-12 lg:w-16 lg:h-16 rounded-full bg-slate-900 border border-white/5 flex items-center justify-center text-slate-600 mx-auto mb-4 lg:mb-6">
                                                    <MessageSquare className="w-6 h-6 lg:w-8 lg:h-8 opacity-20" />
                                                </div>
                                                <p className="text-slate-500 text-xs lg:text-sm font-medium">Channels are silent.</p>
                                                <p className="text-[9px] lg:text-[10px] text-slate-400 font-black uppercase tracking-widest mt-2">Awaiting Feedback</p>
                                            </div>
                                        ) : comments.filter(c => !c.parent_id).map((comment) => (
                                            <div key={comment.id} className="space-y-4 lg:space-y-6">
                                                {/* Main Comment */}
                                                <div className="group relative flex gap-4 lg:gap-6 p-6 lg:p-8 rounded-2xl lg:rounded-[2.5rem] bg-white/[0.02] border border-white/5 hover:border-white/10 transition-colors">
                                                    <div className="w-10 h-10 lg:w-12 lg:h-12 rounded-xl lg:rounded-2xl bg-slate-900 border border-white/5 flex items-center justify-center text-slate-500 shrink-0">
                                                        <UserIcon className="w-5 h-5 lg:w-6 lg:h-6" />
                                                    </div>
                                                    <div className="flex-1 space-y-2 lg:space-y-3 min-w-0">
                                                        <div className="flex items-center justify-between">
                                                            <div className="flex items-center gap-2 lg:gap-3">
                                                                <span className="text-[9px] lg:text-[10px] font-black uppercase tracking-widest text-indigo-400">
                                                                    {comment.profiles?.display_name || `Agent ${comment.user_id.slice(0, 8)}`}
                                                                </span>
                                                                <div className="w-1 h-1 rounded-full bg-slate-800" />
                                                                <span className="text-[8px] lg:text-[9px] font-black text-slate-600 uppercase tracking-widest">
                                                                    {new Date(comment.created_at).toLocaleDateString()}
                                                                </span>
                                                            </div>
                                                            <div className="flex items-center gap-2 lg:gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
                                                                <button
                                                                    onClick={() => {
                                                                        setReplyTo(comment);
                                                                        window.scrollTo({ top: document.querySelector('textarea')?.parentElement?.offsetTop ? document.querySelector('textarea')!.parentElement!.offsetTop - 100 : 0, behavior: 'smooth' });
                                                                    }}
                                                                    className="text-slate-500 hover:text-indigo-400 transition-colors text-[9px] lg:text-[10px] font-black uppercase tracking-widest"
                                                                >
                                                                    Reply
                                                                </button>
                                                                {user?.id === comment.user_id && (
                                                                    <button
                                                                        onClick={() => handleDeleteComment(comment.id)}
                                                                        className="text-slate-600 hover:text-red-500 transition-colors"
                                                                    >
                                                                        <Trash2 className="w-3.5 h-3.5 lg:w-4 lg:h-4" />
                                                                    </button>
                                                                )}
                                                            </div>
                                                        </div>
                                                        <p className="text-slate-400 text-xs lg:text-sm leading-relaxed whitespace-pre-wrap">
                                                            {comment.comment_text}
                                                        </p>
                                                    </div>
                                                </div>

                                                {/* Replies */}
                                                <div className="pl-8 lg:pl-12 space-y-3 lg:space-y-4">
                                                    {comments.filter(r => r.parent_id === comment.id).map(reply => (
                                                        <div key={reply.id} className="group relative flex gap-3 lg:gap-4 p-4 lg:p-6 rounded-xl lg:rounded-[2rem] bg-white/[0.01] border border-white/5 hover:border-white/10 transition-colors">
                                                            <div className="w-7 h-7 lg:w-8 lg:h-8 rounded-lg lg:rounded-xl bg-slate-900 border border-white/5 flex items-center justify-center text-slate-600 shrink-0">
                                                                <UserIcon className="w-3.5 h-3.5 lg:w-4 lg:h-4" />
                                                            </div>
                                                            <div className="flex-1 space-y-1.5 lg:space-y-2 min-w-0">
                                                                <div className="flex items-center justify-between">
                                                                    <div className="flex items-center gap-2">
                                                                        <span className="text-[8px] lg:text-[9px] font-black uppercase tracking-widest text-indigo-400/80">
                                                                            {reply.profiles?.display_name || `Agent ${reply.user_id.slice(0, 8)}`}
                                                                        </span>
                                                                        <span className="text-[7px] lg:text-[8px] font-black text-slate-700 uppercase tracking-widest">
                                                                            {new Date(reply.created_at).toLocaleDateString()}
                                                                        </span>
                                                                    </div>
                                                                    {user?.id === reply.user_id && (
                                                                        <button
                                                                            onClick={() => handleDeleteComment(reply.id)}
                                                                            className="text-slate-800 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                                                                        >
                                                                            <Trash2 className="w-3 h-3 lg:w-3.5 lg:h-3.5" />
                                                                        </button>
                                                                    )}
                                                                </div>
                                                                <p className="text-slate-500 text-[11px] lg:text-xs leading-relaxed whitespace-pre-wrap">
                                                                    {reply.comment_text}
                                                                </p>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </main>
                </div>
            </Layout>
        );
    }

    if (view === 'quiz') {
        const currentQuestion = quizQuestions[currentQuizIndex];
        const score = quizAnswers.reduce((acc, ans, idx) => acc + (ans === quizQuestions[idx].correct_index ? 1 : 0), 0);

        return (
            <Layout showFooter={false} isLoading={isLoading}>
                <div className="h-[calc(100vh-4.5rem)] bg-[#020617] relative overflow-y-auto custom-scrollbar-dark">
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-indigo-600/10 rounded-full blur-[160px] opacity-20 pointer-events-none" />

                    <div className="min-h-full flex flex-col items-center justify-center p-6 lg:p-12">
                        <div className="w-full max-w-2xl relative z-10 space-y-8">
                            {quizQuestions.length === 0 ? (
                                /* No Quiz State */
                                <div className="text-center space-y-6 sm:space-y-10 animate-in zoom-in-95 duration-500">
                                    <div className="relative inline-block">
                                        <div className="absolute inset-0 bg-slate-500 blur-3xl opacity-20 animate-pulse" />
                                        <div className="relative w-32 h-32 sm:w-40 sm:h-40 rounded-full bg-white/5 border border-white/10 flex flex-col items-center justify-center p-6 sm:p-8 backdrop-blur-xl">
                                            <Database className="w-8 h-8 sm:w-10 sm:h-10 text-slate-400 mb-2" />
                                            <div className="text-[10px] sm:text-xs font-black text-slate-400 uppercase tracking-widest mt-1">Empty</div>
                                        </div>
                                    </div>

                                    <div className="space-y-2 sm:space-y-3 px-4">
                                        <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">Intelligence Not Found</h2>
                                        <p className="text-slate-400 font-bold max-w-md mx-auto leading-relaxed text-xs sm:text-sm">
                                            The knowledge check for <span className="text-indigo-400">{quizParent?.name}</span> is currently offline.
                                            Check back later for updated intel.
                                        </p>
                                    </div>

                                    <div className="flex justify-center px-4">
                                        <Button
                                            onClick={() => setView('dashboard')}
                                            className="w-full sm:w-auto px-10 py-6 sm:py-7 rounded-2xl bg-white/10 hover:bg-white/20 text-white font-black text-[10px] sm:text-[11px] uppercase tracking-widest active:scale-95 transition-all"
                                        >
                                            <ArrowLeft className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-2" />
                                            Return to Dashboard
                                        </Button>
                                    </div>
                                </div>
                            ) : !showQuizResult ? (
                                <>
                                    {/* Header */}
                                    <div className="flex flex-col sm:flex-row items-center justify-between gap-6 sm:gap-0 mb-8 sm:mb-12">
                                        <button
                                            onClick={() => setView('dashboard')}
                                            className="flex items-center gap-2 text-slate-500 hover:text-white transition-colors text-[9px] font-black uppercase tracking-[0.2em] group"
                                        >
                                            <ArrowLeft className="w-3 h-3 group-hover:-translate-x-1 transition-transform" />
                                            Abort Mission
                                        </button>
                                        <div className="flex items-center gap-4">
                                            <div className="px-4 py-2 rounded-full bg-white/5 border border-white/10 flex items-center gap-3">
                                                <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" />
                                                <span className="text-[9px] sm:text-[10px] font-black text-indigo-300 uppercase tracking-widest">
                                                    Question {currentQuizIndex + 1} of {quizQuestions.length}
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Progress Bar */}
                                    <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                                        <div
                                            className="h-full bg-indigo-600 transition-all duration-500"
                                            style={{ width: `${((currentQuizIndex + 1) / quizQuestions.length) * 100}%` }}
                                        />
                                    </div>

                                    {/* Question Card */}
                                    <div className="space-y-6 sm:space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                        <div className="text-xl sm:text-2xl lg:text-3xl font-black text-white leading-tight">
                                            <MathText content={currentQuestion.question_text || ""} />
                                        </div>

                                        <div className="grid grid-cols-1 gap-3 sm:gap-4">
                                            {currentQuestion.options.map((option: string, idx: number) => (
                                                <button
                                                    key={idx}
                                                    onClick={() => handleQuizAnswer(idx)}
                                                    className={cn(
                                                        "w-full p-4 sm:p-6 rounded-2xl sm:rounded-3xl text-left transition-all border group relative overflow-hidden",
                                                        quizAnswers[currentQuizIndex] === idx
                                                            ? "bg-indigo-600 border-transparent shadow-2xl shadow-indigo-600/20"
                                                            : "bg-white/5 border-white/10 hover:border-white/20 hover:bg-white/[0.08]"
                                                    )}
                                                >
                                                    <div className="flex items-center gap-3 sm:gap-4 relative z-10">
                                                        <div className={cn(
                                                            "w-8 h-8 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center font-black text-[10px] sm:text-xs transition-colors",
                                                            quizAnswers[currentQuizIndex] === idx ? "bg-white/20 text-white" : "bg-white/5 text-slate-500"
                                                        )}>
                                                            {String.fromCharCode(65 + idx)}
                                                        </div>
                                                        <MathText
                                                            content={option || ""}
                                                            className={cn(
                                                                "text-[13px] sm:text-sm font-bold",
                                                                quizAnswers[currentQuizIndex] === idx ? "text-white" : "text-slate-300"
                                                            )}
                                                        />
                                                    </div>
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </>
                            ) : (
                                /* Result View */
                                <div className="text-center space-y-8 sm:space-y-10 animate-in zoom-in-95 duration-500">
                                    <div className="relative inline-block">
                                        <div className="absolute inset-0 bg-indigo-500 blur-3xl opacity-20 animate-pulse" />
                                        <div className="relative w-32 h-32 sm:w-40 sm:h-40 rounded-full bg-white/5 border border-white/10 flex flex-col items-center justify-center p-6 sm:p-8 backdrop-blur-xl">
                                            <Trophy className="w-8 h-8 sm:w-10 sm:h-10 text-indigo-400 mb-2" />
                                            <div className="text-3xl sm:text-4xl font-black text-white">{score}/{quizQuestions.length}</div>
                                            <div className="text-[7px] sm:text-[8px] font-black text-slate-500 uppercase tracking-widest mt-1">Total Score</div>
                                        </div>
                                    </div>

                                    <div className="space-y-2 sm:space-y-3 px-4">
                                        <h2 className="text-3xl sm:text-4xl font-black text-white tracking-tight">Mission Accomplished</h2>
                                        <p className="text-slate-400 font-bold max-w-md mx-auto leading-relaxed text-xs sm:text-base">
                                            You've completed the Knowledge Check for <span className="text-indigo-400">{quizParent?.name}</span>.
                                            {score === quizQuestions.length ? " Perfect accuracy detected." : " Neural pathways strengthened."}
                                        </p>
                                    </div>

                                    <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4 px-4">
                                        <Button
                                            onClick={() => setView('dashboard')}
                                            className="w-full sm:w-auto px-10 py-6 sm:py-7 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-[10px] sm:text-[11px] uppercase tracking-widest shadow-xl shadow-indigo-600/20 active:scale-95 transition-all"
                                        >
                                            Back to Missions
                                        </Button>
                                        <Button
                                            variant="outline"
                                            onClick={() => {
                                                setQuizAnswers([]);
                                                setShowQuizResult(false);
                                                setCurrentQuizIndex(0);
                                            }}
                                            className="w-full sm:w-auto h-12 sm:h-14 px-10 rounded-2xl bg-white/5 border-white/10 hover:bg-white/10 text-white font-black text-[10px] sm:text-[11px] uppercase tracking-widest"
                                        >
                                            Retry Intel Check
                                        </Button>
                                    </div>

                                    {/* Detailed Feedback */}
                                    <div className="space-y-4 pt-8 sm:pt-12 border-t border-white/5 max-h-[40vh] overflow-y-auto custom-scrollbar-dark pr-4">
                                        <h3 className="text-left text-[9px] sm:text-[10px] font-black text-slate-600 dark:text-slate-400 uppercase tracking-widest px-2">Declassified Intel</h3>
                                        {quizQuestions.map((q, i) => (
                                            <div key={q.id} className="p-4 sm:p-6 bg-white/5 border border-white/10 rounded-2xl sm:rounded-3xl text-left space-y-4">
                                                <div className="flex items-center justify-between gap-4">
                                                    <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                                                        <span className="text-[9px] sm:text-[10px] font-black text-indigo-500 shrink-0">#{i + 1}</span>
                                                        <MathText content={q.question_text || ""} className="text-[11px] sm:text-xs font-bold text-slate-200 truncate sm:whitespace-normal" />
                                                    </div>
                                                    <div className="flex items-center gap-2 shrink-0">
                                                        <button
                                                            onClick={() => handleReport(q.id)}
                                                            className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-white/5 hover:bg-rose-500/10 flex items-center justify-center transition-colors group/report"
                                                            title="Report Question"
                                                        >
                                                            <AlertTriangle className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-slate-500 group-hover/report:text-rose-400 transition-colors" />
                                                        </button>
                                                        {quizAnswers[i] === q.correct_index ? (
                                                            <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-emerald-500/10 flex items-center justify-center shrink-0">
                                                                <CheckCircle2 className="w-3 h-3 sm:w-4 sm:h-4 text-emerald-500" />
                                                            </div>
                                                        ) : (
                                                            <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-rose-500/10 flex items-center justify-center shrink-0">
                                                                <X className="w-3 h-3 sm:w-4 sm:h-4 text-rose-500" />
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                                <div className="pl-6 sm:pl-8 space-y-2">
                                                    <div className="text-[10px] sm:text-[11px] font-bold text-slate-500 leading-relaxed flex flex-wrap gap-1 sm:gap-2">
                                                        <span>Your answer:</span>
                                                        <MathText
                                                            content={q.options[quizAnswers[i]] || ""}
                                                            className={quizAnswers[i] === q.correct_index ? "text-emerald-400" : "text-rose-400"}
                                                        />
                                                    </div>
                                                    {quizAnswers[i] !== q.correct_index && (
                                                        <div className="text-[10px] sm:text-[11px] font-bold text-emerald-400 leading-relaxed flex flex-wrap gap-1 sm:gap-2">
                                                            <span>Correct Intel:</span>
                                                            <MathText content={q.options[q.correct_index] || ""} />
                                                        </div>
                                                    )}
                                                    {q.explanation && (
                                                        <div className="mt-3 sm:mt-4 p-3 sm:p-4 bg-indigo-500/5 rounded-xl sm:rounded-2xl border border-indigo-500/10">
                                                            <MathText content={q.explanation || ""} className="text-[9px] sm:text-[10px] text-indigo-300 leading-relaxed" />
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </Layout>
        );
    }

    return null;
}
