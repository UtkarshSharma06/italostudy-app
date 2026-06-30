import { useState, useMemo } from 'react';
import { ArrowLeft, ChevronLeft, ChevronRight, Bookmark, AlertTriangle, CheckCircle2, XCircle, MinusCircle, Layout as LayoutIcon, Columns, Target, Brain, Menu, X, Zap, Lock, Sparkles, Star, BookOpen, BarChart2, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { MathText } from '@/components/MathText';
import QuestionMedia from '@/components/QuestionMedia';
import DiagramRenderer from '@/components/DiagramRenderer';
import { ReportQuestionDialog } from '@/components/ReportQuestionDialog';
import { cn } from '@/lib/utils';
import { MediaContent, DiagramData } from '@/types/test';

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
  is_reported?: boolean;
  passage?: string;
}

interface SolutionsViewerProps {
  questions: Question[];
  bookmarkedIds: Set<string>;
  canViewExplanations: boolean;
  isPremium: boolean;
  onClose: () => void;
  onBookmark: (question: Question) => void;
  onReport: (question: Question, reason: string, details?: string) => void;
  onUpgrade: () => void;
}

export default function SolutionsViewer({ 
  questions, 
  bookmarkedIds,
  canViewExplanations, 
  isPremium,
  onClose, 
  onBookmark,
  onReport, 
  onUpgrade 
}: SolutionsViewerProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [filter, setFilter] = useState<'all' | 'correct' | 'incorrect' | 'skipped'>('all');
  const [activeTab, setActiveTab] = useState<'question' | 'passage'>('question');
  const [isReportDialogOpen, setIsReportDialogOpen] = useState(false);
  const [showMobilePalette, setShowMobilePalette] = useState(false);

  const [selectedSubject] = useState('All');

  const filteredQuestions = useMemo(() => {
    return questions.filter(q => {
      const matchesSubject = selectedSubject === 'All' || (q.subject || q.section_name || 'General') === selectedSubject;
      const matchesFilter = filter === 'all' || 
        (filter === 'correct' && q.user_answer === q.correct_index) ||
        (filter === 'incorrect' && q.user_answer !== null && q.user_answer !== q.correct_index) ||
        (filter === 'skipped' && q.user_answer === null);
      return matchesSubject && matchesFilter;
    });
  }, [questions, selectedSubject, filter]);

  const currentQuestion = filteredQuestions[currentIndex] || filteredQuestions[0];
  const totalCorrect = questions.filter(q => q.user_answer === q.correct_index).length;
  const totalIncorrect = questions.filter(q => q.user_answer !== null && q.user_answer !== q.correct_index).length;
  const totalSkipped = questions.filter(q => q.user_answer === null).length;

  if (!questions.length) return null;

  return (
    <div className="fixed inset-0 z-[150] bg-white dark:bg-slate-950 flex flex-col font-sans overflow-hidden">
      {/* Header */}
      <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 shrink-0 z-50 pt-[env(safe-area-inset-top)]">
        <div className="h-14 flex items-center justify-between px-3 md:px-4">
          <div className="flex items-center gap-2 md:gap-4 flex-shrink min-w-0">
            <button onClick={onClose} className="p-2 -ml-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors flex items-center gap-2 text-slate-600 dark:text-slate-400 font-bold shrink-0">
              <ArrowLeft className="w-5 h-5" />
              <span className="hidden sm:inline">Back</span>
            </button>
            <div className="h-6 w-px bg-slate-200 dark:bg-slate-800 shrink-0" />
            <button 
              onClick={() => setShowMobilePalette(!showMobilePalette)}
              className="lg:hidden p-1.5 sm:p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors flex items-center gap-1 sm:gap-2 text-indigo-600 dark:text-indigo-400 font-bold shrink-0"
            >
              {showMobilePalette ? <X className="w-5 h-5" /> : <LayoutIcon className="w-5 h-5" />}
              <span className="text-[10px] sm:text-xs uppercase tracking-widest hidden xs:inline">Questions</span>
            </button>
            <div className="flex gap-1 overflow-x-auto no-scrollbar shrink-0">
              <button
                className="px-2 sm:px-3 py-1 sm:py-1.5 text-[10px] sm:text-xs font-black rounded-lg bg-indigo-50 text-indigo-600 shadow-sm border border-indigo-100 dark:bg-indigo-900/30 dark:text-indigo-400 dark:border-indigo-900/50 whitespace-nowrap"
              >
                All
              </button>
            </div>
          </div>
          
          <div className="flex items-center gap-2 sm:gap-4 shrink-0">
             <div className="flex flex-col items-end mr-0 sm:mr-4">
                <span className="text-[9px] sm:text-[10px] font-black text-slate-400 uppercase tracking-widest leading-tight">Accuracy</span>
                <span className="text-xs sm:text-sm font-black text-slate-900 dark:text-white leading-tight">{Math.round((totalCorrect / questions.length) * 100)}%</span>
             </div>
             {!isPremium && (
               <Button variant="outline" size="sm" className="hidden sm:flex rounded-xl font-bold gap-2 text-slate-600 shrink-0" onClick={onUpgrade}>
                  <Target className="w-4 h-4 text-orange-500" />
                  Upgrade to PRO
               </Button>
             )}
          </div>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden relative">
        {/* Main Content Area */}
        <div className="flex-1 flex flex-col overflow-y-auto bg-slate-50/50 dark:bg-slate-900/50 p-4 sm:p-6 lg:p-8">
          {currentQuestion ? (
            <div className="max-w-4xl mx-auto w-full space-y-6">
              {/* Question Header */}
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 flex items-center justify-center font-black">
                    {currentQuestion.question_number}
                  </div>
                  <div className="flex gap-2">
                    <span className="px-2.5 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 text-[10px] font-black uppercase tracking-wider border border-indigo-100 dark:border-indigo-900/50">
                      Marks: {currentQuestion.user_answer === currentQuestion.correct_index ? '+1' : currentQuestion.user_answer === null ? '0' : '-0.25'}
                    </span>
                    <span className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-[10px] font-black uppercase tracking-wider border border-slate-200 dark:border-slate-700">
                      {currentQuestion.topic || 'General'}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => onBookmark(currentQuestion)}
                    className={cn(
                      "p-2 rounded-xl transition-colors",
                      bookmarkedIds.has(currentQuestion.id) ? "bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400" : "hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-400"
                    )}
                  >
                    <Bookmark className={cn("w-5 h-5", bookmarkedIds.has(currentQuestion.id) && "fill-current")} />
                  </button>
                  <ReportQuestionDialog 
                    isOpen={isReportDialogOpen}
                    onOpenChange={setIsReportDialogOpen}
                    onReport={async (reason, details) => {
                      onReport(currentQuestion, reason, details);
                      setIsReportDialogOpen(false);
                    }}
                    trigger={
                      <button className="p-2 rounded-xl hover:bg-red-50 dark:hover:bg-red-900/30 text-slate-400 hover:text-red-500 transition-colors">
                        <AlertTriangle className="w-5 h-5" />
                      </button>
                    }
                  />
                </div>
              </div>

              {/* Passage Toggle if exists */}
              {currentQuestion.passage && (
                <div className="flex gap-1 bg-white dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700 w-fit shadow-sm">
                  <button 
                    onClick={() => setActiveTab('question')}
                    className={cn("px-4 py-1.5 text-xs font-black rounded-lg transition-all", activeTab === 'question' ? "bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-md" : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-300")}
                  >
                    Question
                  </button>
                  <button 
                    onClick={() => setActiveTab('passage')}
                    className={cn("px-4 py-1.5 text-xs font-black rounded-lg transition-all", activeTab === 'passage' ? "bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-md" : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-300")}
                  >
                    Passage
                  </button>
                </div>
              )}
 
              {/* Question Text / Passage */}
              <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] border-2 border-slate-200 dark:border-slate-800 shadow-sm leading-relaxed overflow-hidden">
                {activeTab === 'passage' && currentQuestion.passage ? (
                   <div className="relative group p-8 sm:p-12 bg-white dark:bg-slate-900/50">
                     <div className="absolute left-0 top-0 bottom-0 w-2 bg-indigo-600 dark:bg-indigo-400 opacity-20" />
                     <div className="prose dark:prose-invert max-w-none text-base sm:text-lg leading-[1.8] text-slate-800 dark:text-slate-200 font-medium break-words">
                       <MathText content={currentQuestion.passage} />
                     </div>
                   </div>
                ) : (
                  <div className="p-6 sm:p-8 lg:p-10">
                    <div className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white mb-6 sm:mb-8">
                      <MathText content={currentQuestion.question_text || ''} isHtml={true} className="overflow-x-auto max-w-full" />
                    </div>
                    
                    {/* Media (Image/Chart/Diagram/Table) */}
                    {(() => {
                      const m = currentQuestion?.media as any;

                      // Robust check: Render if anything looks like media
                      const hasRenderableMedia = m && (
                        ['image', 'chart', 'graph', 'pie', 'bar', 'line', 'scatter', 'table', 'diagram'].includes(m.type) ||
                        m.url || m.imageUrl || m.image_url || m.image || m.data || m.table
                      );

                      if (!hasRenderableMedia) return null;

                      return (
                        <QuestionMedia media={currentQuestion.media} className="mb-6" />
                      );
                    })()}
                    
                    {currentQuestion.diagram && <DiagramRenderer diagram={currentQuestion.diagram} className="mb-6" />}

                    <div className="grid gap-3 mt-8">
                      {currentQuestion.options.map((opt, idx) => {
                        const isCorrect = idx === currentQuestion.correct_index;
                        const isSelected = idx === currentQuestion.user_answer;
                        const status = isSelected ? (isCorrect ? 'correct' : 'incorrect') : (isCorrect ? 'actual' : 'none');
                        
                        return (
                          <div
                            key={idx}
                            className={cn(
                              "group relative flex items-center gap-4 p-4 rounded-2xl border-2 transition-all",
                              status === 'correct' && "bg-emerald-50 dark:bg-emerald-900/20 border-emerald-500",
                              status === 'incorrect' && "bg-red-50 dark:bg-red-900/20 border-red-500",
                              status === 'actual' && !isSelected && "bg-emerald-50/30 dark:bg-emerald-900/10 border-emerald-200 dark:border-emerald-800 dashed",
                              status === 'none' && "bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-600"
                            )}
                          >
                            <div className={cn(
                              "w-8 h-8 rounded-lg flex items-center justify-center font-black shrink-0 transition-colors",
                              status === 'correct' && "bg-emerald-500 text-white",
                              status === 'incorrect' && "bg-red-500 text-white",
                              status === 'actual' && !isSelected && "bg-emerald-200 dark:bg-emerald-800 text-emerald-800 dark:text-emerald-100",
                              status === 'none' && "bg-slate-50 dark:bg-slate-800 text-slate-400 group-hover:bg-indigo-50 dark:group-hover:bg-indigo-900/50 group-hover:text-indigo-600 dark:group-hover:text-indigo-400"
                            )}>
                              {String.fromCharCode(65 + idx)}
                            </div>
                            <div className="flex-1 font-bold text-slate-700 dark:text-slate-300 min-w-0">
                              <MathText content={opt || ''} isHtml={true} className="overflow-x-auto max-w-full" />
                            </div>
                            {status === 'correct' && <CheckCircle2 className="w-5 h-5 text-emerald-600" />}
                            {status === 'incorrect' && <XCircle className="w-5 h-5 text-red-600" />}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* Expert Explanation section */}
              {activeTab === 'question' && (
                <div className="rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
                  {/* Section Header */}
                  <div className="relative bg-gradient-to-r from-indigo-600 via-violet-600 to-purple-600 px-5 sm:px-8 py-4 flex items-center justify-between overflow-hidden">
                    <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxjaXJjbGUgY3g9IjIwIiBjeT0iMjAiIHI9IjIiIGZpbGw9InJnYmEoMjU1LDI1NSwyNTUsMC4wOCkiLz48L2c+PC9zdmc+')] opacity-60" />
                    <div className="relative flex items-center gap-3">
                      <div className="w-8 h-8 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                        <Brain className="w-4 h-4 text-white" />
                      </div>
                      <div>
                        <span className="text-sm font-black text-white tracking-wide">Expert Explanation</span>
                        <p className="text-[10px] text-white/70 font-medium mt-0.5">Step-by-step logic breakdown</p>
                      </div>
                    </div>
                    {canViewExplanations && currentQuestion.explanation && (
                      <span className="relative flex items-center gap-1.5 bg-white/20 backdrop-blur-sm text-white text-[10px] font-black px-3 py-1.5 rounded-full border border-white/30">
                        <Sparkles className="w-3 h-3" /> Premium
                      </span>
                    )}
                  </div>

                  {/* Content */}
                  <div className="bg-white dark:bg-slate-900 p-5 sm:p-8">
                    {canViewExplanations ? (
                      <div>
                        {/* Correct Answer Chip */}
                        <div className="inline-flex items-center gap-2 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800/50 text-emerald-700 dark:text-emerald-300 text-xs font-black px-3 py-1.5 rounded-full mb-5">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Correct Answer: {String.fromCharCode(65 + (currentQuestion.correct_index ?? 0))}
                        </div>
                        <div className="prose prose-sm dark:prose-invert max-w-none text-slate-700 dark:text-slate-300 leading-relaxed">
                          <MathText content={currentQuestion.explanation || 'No explanation available for this question.'} isHtml={true} className="overflow-x-auto max-w-full" />
                        </div>
                      </div>
                    ) : (
                      /* ── Premium Upgrade Overlay ── */
                      <div className="relative overflow-hidden rounded-2xl min-h-[320px] flex flex-col">
                        {/* Blurred fake content behind */}
                        <div className="space-y-3 p-2 blur-md select-none pointer-events-none opacity-30 absolute inset-0">
                          <div className="h-4 bg-gradient-to-r from-slate-200 to-slate-100 dark:from-slate-700 dark:to-slate-800 rounded-full w-3/4" />
                          <div className="h-4 bg-gradient-to-r from-slate-200 to-slate-100 dark:from-slate-700 dark:to-slate-800 rounded-full w-full" />
                          <div className="h-4 bg-gradient-to-r from-slate-200 to-slate-100 dark:from-slate-700 dark:to-slate-800 rounded-full w-5/6" />
                          <div className="h-4 bg-gradient-to-r from-slate-200 to-slate-100 dark:from-slate-700 dark:to-slate-800 rounded-full w-2/3" />
                          <div className="h-4 bg-gradient-to-r from-slate-200 to-slate-100 dark:from-slate-700 dark:to-slate-800 rounded-full w-full" />
                          <div className="h-4 bg-gradient-to-r from-slate-200 to-slate-100 dark:from-slate-700 dark:to-slate-800 rounded-full w-4/5" />
                          <div className="h-4 bg-gradient-to-r from-slate-200 to-slate-100 dark:from-slate-700 dark:to-slate-800 rounded-full w-1/2" />
                        </div>

                        {/* Overlay Content */}
                        <div className="relative z-10 flex flex-col items-center justify-center text-center px-6 py-10 bg-gradient-to-b from-white/80 via-white/95 to-white dark:from-slate-900/80 dark:via-slate-900/95 dark:to-slate-900 backdrop-blur-sm min-h-[320px]">
                          {/* Icon */}
                          <div className="relative mb-5">
                            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-xl shadow-indigo-200 dark:shadow-indigo-900/50">
                              <Lock className="w-7 h-7 text-white" />
                            </div>
                            <div className="absolute -top-1 -right-1 w-5 h-5 bg-amber-400 rounded-full flex items-center justify-center shadow">
                              <Star className="w-2.5 h-2.5 text-white fill-white" />
                            </div>
                          </div>

                          {/* Headline */}
                          <h4 className="text-xl font-black text-slate-900 dark:text-white mb-2 leading-tight">
                            Unlock Expert Explanations
                          </h4>
                          <p className="text-sm text-slate-500 dark:text-slate-400 max-w-xs leading-relaxed mb-6">
                            See the exact step-by-step logic behind every answer and stop making the same mistakes.
                          </p>

                          {/* Feature Pills */}
                          <div className="flex flex-wrap items-center justify-center gap-2 mb-7">
                            {[
                              { icon: Brain, label: 'Step-by-step Logic' },
                              { icon: BarChart2, label: 'Section Analytics' },
                              { icon: BookOpen, label: 'Unlimited Mocks' },
                              { icon: Shield, label: 'Cancel Anytime' },
                            ].map(({ icon: Icon, label }) => (
                              <span key={label} className="flex items-center gap-1.5 bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-100 dark:border-indigo-500/20 text-indigo-700 dark:text-indigo-300 text-[11px] font-bold px-3 py-1.5 rounded-full">
                                <Icon className="w-3 h-3" /> {label}
                              </span>
                            ))}
                          </div>

                          {/* CTA */}
                          <button
                            onClick={onUpgrade}
                            className="group relative flex items-center gap-2.5 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-black text-sm px-8 py-3.5 rounded-2xl shadow-xl shadow-indigo-200 dark:shadow-indigo-900/50 transition-all active:scale-95 hover:shadow-2xl hover:shadow-indigo-300 dark:hover:shadow-indigo-800"
                          >
                            <Zap className="w-4 h-4 fill-white" />
                            Upgrade to Premium
                            <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                          </button>

                          {/* Social proof */}
                          <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-4 font-medium">
                            🔥 1,200+ students already learning smarter
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-slate-400 dark:text-slate-600">
               <Brain className="w-12 h-12 mb-4 opacity-20" />
               <p className="font-bold">No questions match the current filter</p>
            </div>
          )}
        </div>

        {/* Sidebar / Mobile Menu */}
        <div className={cn(
          "fixed inset-0 lg:relative z-50 lg:z-0 flex lg:w-80 flex-col bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 transition-transform duration-300 ease-in-out",
          showMobilePalette ? "translate-x-0" : "translate-x-full lg:translate-x-0"
        )}>
          {/* Mobile Overlay */}
          {showMobilePalette && (
            <div 
              className="lg:hidden fixed inset-0 bg-black/20 backdrop-blur-sm -z-10"
              onClick={() => setShowMobilePalette(false)}
            />
          )}

          {/* Sidebar Header for Mobile */}
          <div className="lg:hidden h-14 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between px-6 shrink-0">
            <span className="font-black text-sm uppercase tracking-widest text-slate-900 dark:text-white">Question Navigator</span>
            <button onClick={() => setShowMobilePalette(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg">
              <X className="w-5 h-5 text-slate-400" />
            </button>
          </div>

          {/* Stats Summary */}
          <div className="p-6 border-b border-slate-100 dark:border-slate-800">
             <div className="grid grid-cols-2 gap-3">
               <div className="bg-emerald-50 dark:bg-emerald-900/20 p-3 rounded-2xl border border-emerald-100 dark:border-emerald-900/50">
                 <p className="text-[10px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-widest mb-1">Correct</p>
                 <p className="text-xl font-black text-emerald-700 dark:text-emerald-300">{totalCorrect}</p>
               </div>
               <div className="bg-red-50 dark:bg-red-900/20 p-3 rounded-2xl border border-red-100 dark:border-red-900/50">
                 <p className="text-[10px] font-black text-red-600 dark:text-red-400 uppercase tracking-widest mb-1">Incorrect</p>
                 <p className="text-xl font-black text-red-700 dark:text-red-300">{totalIncorrect}</p>
               </div>
               <div className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-2xl border border-slate-100 dark:border-slate-700">
                 <p className="text-[10px] font-black text-slate-600 dark:text-slate-400 uppercase tracking-widest mb-1">Skipped</p>
                 <p className="text-xl font-black text-slate-700 dark:text-slate-300">{totalSkipped}</p>
               </div>
               <div className="bg-indigo-50 dark:bg-indigo-900/20 p-3 rounded-2xl border border-indigo-100 dark:border-indigo-900/50">
                 <p className="text-[10px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest mb-1">Total</p>
                 <p className="text-xl font-black text-indigo-700 dark:text-indigo-300">{questions.length}</p>
               </div>
             </div>
          </div>

          {/* Filters */}
          <div className="px-6 py-4 flex gap-2">
            {[
              { id: 'all', icon: LayoutIcon, color: 'indigo' },
              { id: 'correct', icon: CheckCircle2, color: 'emerald' },
              { id: 'incorrect', icon: XCircle, color: 'red' },
              { id: 'skipped', icon: MinusCircle, color: 'slate' }
            ].map(f => (
              <button
                key={f.id}
                onClick={() => { setFilter(f.id as any); setCurrentIndex(0); }}
                className={cn(
                  "flex-1 p-2 rounded-xl border transition-all flex items-center justify-center",
                  filter === f.id ? "bg-slate-900 dark:bg-white border-slate-900 dark:border-white text-white dark:text-slate-900 shadow-md" : "bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800 text-slate-400 hover:border-slate-200 dark:hover:border-slate-700"
                )}
              >
                <f.icon className="w-5 h-5" />
              </button>
            ))}
          </div>

          {/* Question Grid */}
          <div className="flex-1 overflow-y-auto px-6 py-2 no-scrollbar">
            <div className="grid grid-cols-5 gap-2 pb-6">
              {filteredQuestions.map((q, idx) => {
                const isCorrect = q.user_answer === q.correct_index;
                const isSkipped = q.user_answer === null;
                const isActive = currentIndex === idx;
                
                return (
                  <button
                    key={q.id}
                    onClick={() => {
                      setCurrentIndex(idx);
                      if (window.innerWidth < 1024) setShowMobilePalette(false);
                    }}
                    className={cn(
                      "w-full aspect-square rounded-xl text-xs font-black transition-all flex items-center justify-center border-2",
                      isActive ? "border-slate-800 dark:border-white scale-110 shadow-lg z-10" : "border-transparent",
                      isSkipped ? "bg-slate-100 dark:bg-slate-800 text-slate-400" :
                        isCorrect ? "bg-emerald-400 text-white" : "bg-red-400 text-white"
                    )}
                  >
                    {q.question_number}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Navigation Controls */}
          <div className="p-6 border-t border-slate-100 dark:border-slate-800 bg-slate-50/30 dark:bg-slate-900/50 grid grid-cols-2 gap-3">
             <Button
               variant="outline"
               disabled={currentIndex === 0}
               onClick={() => setCurrentIndex(prev => prev - 1)}
               className="rounded-xl border-2 font-black text-xs h-12 dark:bg-slate-900 dark:text-white dark:border-slate-800"
             >
               <ChevronLeft className="w-5 h-5 mr-1" /> Prev
             </Button>
             <Button
               disabled={currentIndex === filteredQuestions.length - 1}
               onClick={() => setCurrentIndex(prev => prev + 1)}
               className="bg-slate-900 dark:bg-white hover:bg-slate-800 dark:hover:bg-slate-200 text-white dark:text-slate-900 rounded-xl font-black text-xs h-12"
             >
               Next <ChevronRight className="w-5 h-5 ml-1" />
             </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
