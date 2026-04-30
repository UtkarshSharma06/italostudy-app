import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import Layout from '@/components/Layout';
import { ArrowLeft, Loader2, TrendingUp, Target } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useExam } from '@/context/ExamContext';
import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  ReferenceLine,
  Area,
} from 'recharts';
import { AnalyticsSkeleton } from '@/components/SkeletonLoader';

interface Question {
  id: string;
  question_number: number;
  correct_index: number;
  user_answer: number | null;
  time_spent_seconds: number | null;
  topic: string | null;
  section_name?: string | null;
  subject?: string | null;
  answered_at?: string | null;
}

interface TestResult {
  id: string;
  subject: string;
  total_questions: number;
  correct_answers: number;
  wrong_answers: number;
  skipped_answers: number;
  time_taken_seconds: number;
  exam_type: string | null;
  test_type: string | null;
  is_mock?: boolean;
  started_at: string;
  time_limit_minutes: number | null;
}

export default function DetailedAnalysis({ hideLayout = false }: { hideLayout?: boolean }) {
  const { testId } = useParams<{ testId: string }>();
  const navigate = useNavigate();
  const { allExams, activeExam } = useExam();

  const [test, setTest] = useState<TestResult | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'time' | 'chapter'>('time');
  const [chartMode, setChartMode] = useState<'marks' | 'accuracy'>('marks');

  useEffect(() => {
    if (testId) fetchData();
  }, [testId]);

  const fetchData = async () => {
    setLoading(true);
    const { data: testData } = await (supabase as any)
      .from('tests').select('*').eq('id', testId).maybeSingle();

    if (testData) {
      setTest(testData as TestResult);
      if (testData.session_id) {
        const { data: session } = await (supabase as any)
          .from('mock_sessions').select('title').eq('id', testData.session_id).maybeSingle();
        if (session?.title) {
          const isGeneric = !testData.subject || testData.subject === 'All Subjects' || testData.subject === 'International Mock';
          setTest(prev => prev ? { ...prev, subject: isGeneric ? session.title : `${session.title} - ${testData.subject}` } : null);
        }
      }
    }

    const { data: qData } = await (supabase as any)
      .from('questions').select('id, question_number, correct_index, user_answer, time_spent_seconds, topic, section_name, subject, answered_at')
      .eq('test_id', testId).order('question_number');
    if (qData) setQuestions(qData as Question[]);
    setLoading(false);
  };

  const processedData = useMemo(() => {
    if (!test || !questions.length) return { intervalStats: [], overall: { attempted: 0, correct: 0, incorrect: 0, marks: 0 } };

    const startTime = test.started_at ? new Date(test.started_at).getTime() : 0;
    const examConfig = allExams[test.exam_type || ''] || activeExam || Object.values(allExams)[0];
    const correctMark = examConfig?.scoring?.correct || 1;
    const incorrectMark = examConfig?.scoring?.incorrect || 0;

    let cumulativeOffset = 0;
    const qWithTime = questions.map(q => {
      const answeredAt = q.answered_at ? new Date(q.answered_at).getTime() : 0;
      const explicitOffset = (answeredAt > 0 && startTime > 0) ? Math.floor((answeredAt - startTime) / 1000) : null;
      cumulativeOffset += (q.time_spent_seconds || 0);
      return { ...q, offsetSecs: explicitOffset !== null ? explicitOffset : cumulativeOffset };
    });

    const defaultDuration = examConfig?.durationMinutes || 100;
    const durationMins = test.time_limit_minutes || (test.time_taken_seconds / 60) || defaultDuration;
    const intervalMins = durationMins <= 15 ? 2 : (durationMins <= 60 ? 5 : 30);
    const maxTimeSecs = Math.max(durationMins * 60, Math.max(...qWithTime.map(q => q.offsetSecs), 0) + 60);

    let cumMarks = 0;
    const stats = [];
    for (let i = 0; i < maxTimeSecs; i += (intervalMins * 60)) {
      const start = i;
      const end = i + (intervalMins * 60);
      const label = `${Math.floor(i / 60)}-${Math.floor(end / 60)}m`;

      const qs = qWithTime.filter(q => q.offsetSecs > start && q.offsetSecs <= end);
      const attempted = qs.filter(q => q.user_answer !== null).length;
      const correct = qs.filter(q => q.user_answer === q.correct_index).length;
      const incorrect = qs.filter(q => q.user_answer !== null && q.user_answer !== q.correct_index).length;
      const accuracy = attempted > 0 ? Math.round((correct / attempted) * 100) : 0;
      const intervalMarks = Number((correct * correctMark + incorrect * incorrectMark).toFixed(1));
      cumMarks = Number((cumMarks + intervalMarks).toFixed(1));

      stats.push({ name: label, attempted, correct, incorrect, accuracy, marks: intervalMarks, cumMarks });
    }

    return {
      intervalStats: stats,
      overall: {
        attempted: stats.reduce((s, i) => s + i.attempted, 0),
        correct: stats.reduce((s, i) => s + i.correct, 0),
        incorrect: stats.reduce((s, i) => s + i.incorrect, 0),
        marks: Number(stats.reduce((s, i) => s + i.marks, 0).toFixed(1))
      }
    };
  }, [test, questions, allExams, activeExam]);

  if (loading) return (
    <div className="min-h-screen bg-[#f5f6fb] p-8">
      <AnalyticsSkeleton />
    </div>
  );

  if (!test || !questions.length) return (
    <Layout>
      <div className="max-w-4xl mx-auto px-4 py-10 text-center">
        <p className="text-slate-500">No data found for this test.</p>
      </div>
    </Layout>
  );

  const { intervalStats, overall } = processedData;

  function CustomTooltip({ active, payload, label }: any) {
    if (active && payload && payload.length) {
      const d = payload[0]?.payload;
      return (
        <div className="bg-slate-900 border border-white/10 px-4 py-3 rounded-xl shadow-xl min-w-[160px]">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 border-b border-white/5 pb-1">{label}</p>
          <div className="space-y-1.5">
            <div className="flex justify-between gap-4">
              <span className="text-[10px] font-bold text-slate-400">Attempted</span>
              <span className="text-xs font-black text-white">{d?.attempted} Qs</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-[10px] font-bold text-emerald-400">Correct</span>
              <span className="text-xs font-black text-emerald-300">{d?.correct}</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-[10px] font-bold text-rose-400">Incorrect</span>
              <span className="text-xs font-black text-rose-300">{d?.incorrect}</span>
            </div>
            <div className="border-t border-white/5 pt-1.5 mt-1 flex justify-between gap-4">
              <span className="text-[10px] font-bold text-indigo-400">Interval Marks</span>
              <span className="text-sm font-black text-white">{d?.marks}</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-[10px] font-bold text-amber-400">Accuracy</span>
              <span className="text-sm font-black text-white">{d?.accuracy}%</span>
            </div>
            {chartMode === 'marks' && (
              <div className="flex justify-between gap-4">
                <span className="text-[10px] font-bold text-violet-400">Cumulative</span>
                <span className="text-sm font-black text-violet-300">{d?.cumMarks}</span>
              </div>
            )}
          </div>
        </div>
      );
    }
    return null;
  }

  function MainContent() {
    const topicMap = new Map<string, { correct: number; incorrect: number; skipped: number }>();
    questions.forEach(q => {
      const key = q.topic || q.section_name || q.subject || 'General';
      const prev = topicMap.get(key) || { correct: 0, incorrect: 0, skipped: 0 };
      if (q.user_answer === null) prev.skipped++;
      else if (q.user_answer === q.correct_index) prev.correct++;
      else prev.incorrect++;
      topicMap.set(key, prev);
    });

    const maxMark = Math.max(...intervalStats.map(i => i.marks), 1);
    const maxCum = Math.max(...intervalStats.map(i => i.cumMarks), 1);

    return (
      <div className="space-y-6 overflow-x-hidden p-2 sm:p-0">
        {!hideLayout && (
          <div className="flex items-center gap-3 mb-4">
            <button onClick={() => navigate(-1)} className="p-2 rounded-xl hover:bg-white border border-transparent hover:border-slate-200 transition-all">
              <ArrowLeft className="w-5 h-5 text-slate-600" />
            </button>
            <h1 className="text-xl font-black text-slate-900 leading-tight">
              {test.subject && test.subject !== 'All Subjects' ? test.subject : 'Detailed Analysis'}
            </h1>
          </div>
        )}

        <div className="flex gap-1 border-b border-slate-200 mb-2">
          {(['time', 'chapter'] as const).map(key => (
            <button key={key} onClick={() => setActiveTab(key)} className={cn(
              "px-5 py-3 text-xs sm:text-sm font-black uppercase tracking-widest transition-all border-b-2 -mb-px",
              activeTab === key ? "border-indigo-600 text-indigo-600" : "border-transparent text-slate-400 hover:text-slate-600"
            )}>
              {key === 'time' ? 'Time Analysis' : 'Chapter Analysis'}
            </button>
          ))}
        </div>

        {activeTab === 'time' && (
          <div className="space-y-6">
            {/* ── Chart Card ─────────────────────────────────────── */}
            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-4 sm:p-8">
              {/* Header */}
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-6">
                <div>
                  <h2 className="text-base sm:text-lg font-black text-slate-900 uppercase tracking-tight">
                    {chartMode === 'marks' ? 'Marks per Interval' : 'Accuracy per Interval'}
                  </h2>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.2em] mt-1">
                    {chartMode === 'marks'
                      ? 'Bar = interval marks  •  Line = cumulative score'
                      : 'Green ≥ 75%  •  Amber ≥ 40%  •  Red < 40%'}
                  </p>
                </div>
                {/* Mode toggle */}
                <div className="flex p-1 bg-slate-100 rounded-2xl w-fit self-start shrink-0">
                  {(['marks', 'accuracy'] as const).map(m => (
                    <button key={m} onClick={() => setChartMode(m)} className={cn(
                      "px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all flex items-center gap-1.5",
                      chartMode === m ? "bg-white text-indigo-600 shadow-sm" : "text-slate-400 hover:text-slate-600"
                    )}>
                      {m === 'marks' ? <TrendingUp className="w-3 h-3" /> : <Target className="w-3 h-3" />}
                      {m}
                    </button>
                  ))}
                </div>
              </div>

              {/* Chart */}
              <div className="h-[260px] sm:h-[340px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  {chartMode === 'marks' ? (
                    <ComposedChart data={intervalStats} margin={{ top: 14, right: 20, left: -20, bottom: 20 }}>
                      <defs>
                        <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#6366f1" stopOpacity={0.9} />
                          <stop offset="100%" stopColor="#818cf8" stopOpacity={0.5} />
                        </linearGradient>
                        <linearGradient id="lineGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#a78bfa" stopOpacity={0.9} />
                          <stop offset="100%" stopColor="#c4b5fd" stopOpacity={0.4} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                      <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontWeight: 900, fontSize: 9 }} dy={10} />
                      <YAxis yAxisId="left" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontWeight: 900, fontSize: 9 }} domain={[0, Math.ceil(maxMark * 1.2)]} />
                      <YAxis yAxisId="right" orientation="right" axisLine={false} tickLine={false} tick={{ fill: '#a78bfa', fontWeight: 900, fontSize: 9 }} domain={[0, Math.ceil(maxCum * 1.1)]} />
                      <Tooltip content={<CustomTooltip />} cursor={{ fill: '#f1f5f9' }} />
                      <ReferenceLine yAxisId="left" y={0} stroke="#e2e8f0" />
                      <Bar yAxisId="left" dataKey="marks" radius={[6, 6, 0, 0]} barSize={28} fill="url(#barGradient)">
                        {intervalStats.map((entry, idx) => (
                          <Cell key={idx} fill={entry.marks < 0 ? '#fca5a5' : 'url(#barGradient)'} />
                        ))}
                      </Bar>
                      <Line yAxisId="right" type="monotone" dataKey="cumMarks" stroke="#a78bfa" strokeWidth={2.5} dot={{ fill: '#7c3aed', r: 4, strokeWidth: 2, stroke: '#fff' }} activeDot={{ r: 6 }} />
                    </ComposedChart>
                  ) : (
                    <ComposedChart data={intervalStats} margin={{ top: 14, right: 20, left: -20, bottom: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                      <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontWeight: 900, fontSize: 9 }} dy={10} />
                      <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontWeight: 900, fontSize: 9 }} domain={[0, 100]} tickFormatter={v => `${v}%`} />
                      <Tooltip content={<CustomTooltip />} cursor={{ fill: '#f1f5f9' }} />
                      <ReferenceLine y={75} stroke="#10b981" strokeDasharray="4 4" strokeWidth={1.5} label={{ value: '75%', fill: '#10b981', fontSize: 9, fontWeight: 900 }} />
                      <ReferenceLine y={40} stroke="#f59e0b" strokeDasharray="4 4" strokeWidth={1.5} label={{ value: '40%', fill: '#f59e0b', fontSize: 9, fontWeight: 900 }} />
                      <Bar dataKey="accuracy" radius={[6, 6, 0, 0]} barSize={28}>
                        {intervalStats.map((entry, idx) => (
                          <Cell
                            key={idx}
                            fill={entry.accuracy >= 75 ? '#10b981' : entry.accuracy >= 40 ? '#f59e0b' : entry.attempted === 0 ? '#e2e8f0' : '#ef4444'}
                            fillOpacity={entry.attempted === 0 ? 0.3 : 0.85}
                          />
                        ))}
                      </Bar>
                      <Line type="monotone" dataKey="accuracy" stroke="#6366f1" strokeWidth={2} dot={false} strokeDasharray="5 3" />
                    </ComposedChart>
                  )}
                </ResponsiveContainer>
              </div>

              {/* Legend */}
              <div className="flex items-center gap-5 mt-5 pt-4 border-t border-slate-50 flex-wrap">
                {chartMode === 'marks' ? (
                  <>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded bg-indigo-500" />
                      <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Interval Marks</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-1.5 rounded bg-violet-400" />
                      <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Cumulative Score</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded bg-red-300" />
                      <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Negative (Wrong answers)</span>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded bg-emerald-500" />
                      <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">≥ 75% (Strong)</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded bg-amber-500" />
                      <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">40–75% (Moderate)</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded bg-rose-500" />
                      <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{'< 40%'} (Weak)</span>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* ── Summary KPI Cards ────────────────────────────────── */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
              {[
                { label: 'Attempted', val: overall.attempted, color: 'text-slate-700', sub: `of ${test.total_questions} total`, icon: '📝' },
                { label: 'Accuracy', val: `${Math.round((overall.correct / Math.max(overall.attempted, 1)) * 100)}%`, color: 'text-emerald-600', sub: 'correct rate', icon: '🎯' },
                { label: 'Net Marks', val: overall.marks, color: 'text-indigo-600', sub: 'weighted score', icon: '📊' },
                { label: 'Correct', val: overall.correct, color: 'text-blue-600', sub: `${overall.incorrect} incorrect`, icon: '✅' },
              ].map((s, idx) => (
                <div key={idx} className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm flex flex-col justify-between h-28">
                  <div className="flex items-center justify-between">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{s.label}</p>
                    <span className="text-base">{s.icon}</span>
                  </div>
                  <div>
                    <p className={cn("text-2xl font-black leading-none mb-1", s.color)}>{s.val}</p>
                    <p className="text-[8px] font-bold text-slate-300 uppercase tracking-tight">{s.sub}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* ── Interval Table ───────────────────────────────────── */}
            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead className="bg-slate-50 border-b border-slate-100">
                    <tr>
                      {['Interval', 'Attempted', 'Correct', 'Incorrect', 'Accuracy', 'Marks', 'Cumulative'].map(h => (
                        <th key={h} className="text-left px-5 py-4 font-black text-slate-400 uppercase tracking-widest whitespace-nowrap border-r border-slate-100/50 last:border-0">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {intervalStats.map((iv, i) => (
                      <tr key={i} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-5 py-4 font-black text-slate-700">{iv.name}</td>
                        <td className="px-5 py-4 font-bold text-slate-600">{iv.attempted}</td>
                        <td className="px-5 py-4 font-black text-emerald-600">{iv.correct}</td>
                        <td className="px-5 py-4 font-black text-rose-500">{iv.incorrect}</td>
                        <td className="px-5 py-4 pr-6">
                          <div className="flex items-center gap-2 min-w-[100px]">
                            <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                              <div
                                className={cn("h-full rounded-full transition-all duration-500",
                                  iv.accuracy > 70 ? "bg-emerald-500" : iv.accuracy > 40 ? "bg-amber-400" : "bg-rose-400")}
                                style={{ width: `${iv.accuracy}%` }}
                              />
                            </div>
                            <span className="text-[10px] font-black text-slate-500 w-8">{iv.accuracy}%</span>
                          </div>
                        </td>
                        <td className={cn("px-5 py-4 font-black text-sm", iv.marks < 0 ? "text-rose-500" : "text-indigo-600")}>{iv.marks}</td>
                        <td className="px-5 py-4 font-bold text-violet-500">{iv.cumMarks}</td>
                      </tr>
                    ))}
                    <tr className="bg-slate-900 border-t-2 border-slate-800">
                      <td className="px-5 py-5 font-black text-white uppercase tracking-widest">Total</td>
                      <td className="px-5 py-5 font-black text-slate-400">{overall.attempted}</td>
                      <td className="px-5 py-5 font-black text-emerald-400">{overall.correct}</td>
                      <td className="px-5 py-5 font-black text-rose-400">{overall.incorrect}</td>
                      <td className="px-5 py-5 font-black text-amber-400">{Math.round((overall.correct / (overall.attempted || 1)) * 100)}%</td>
                      <td className="px-5 py-5">
                        <span className="bg-indigo-600 text-white px-3 py-1.5 rounded-xl font-black text-sm shadow-lg shadow-indigo-500/20">{overall.marks}</span>
                      </td>
                      <td className="px-5 py-5 font-black text-violet-400">{overall.marks}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'chapter' && (
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="bg-slate-50 border-b border-slate-100">
                  <tr>
                    {['Chapter / Topic', 'Correct', 'Incorrect', 'Skipped', 'Accuracy'].map(h => (
                      <th key={h} className="text-left px-5 py-4 font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {Array.from(topicMap.entries()).sort((a, b) => {
                    const accA = (a[1].correct / (a[1].correct + a[1].incorrect || 1));
                    const accB = (b[1].correct / (b[1].correct + b[1].incorrect || 1));
                    return accB - accA;
                  }).map(([topic, stats], i) => {
                    const attempted = stats.correct + stats.incorrect;
                    const acc = attempted > 0 ? Math.round((stats.correct / attempted) * 100) : 0;
                    return (
                      <tr key={i} className="hover:bg-slate-50 transition-colors">
                        <td className="px-5 py-4">
                          <p className="font-black text-slate-900">{topic}</p>
                          <p className="text-[8px] font-bold text-slate-300 uppercase tracking-widest mt-0.5">SUBJECT MODULE</p>
                        </td>
                        <td className="px-5 py-4 text-emerald-600 font-black text-sm">{stats.correct}</td>
                        <td className="px-5 py-4 text-rose-500 font-black text-sm">{stats.incorrect}</td>
                        <td className="px-5 py-4 text-slate-400 font-bold">{stats.skipped}</td>
                        <td className="px-5 py-4 pr-10">
                          <div className="flex items-center gap-3 min-w-[120px]">
                            <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                              <div className={cn("h-full rounded-full transition-all duration-700",
                                acc > 70 ? "bg-emerald-400" : acc > 40 ? "bg-amber-400" : "bg-rose-400")}
                                style={{ width: `${acc}%` }} />
                            </div>
                            <span className="text-xs font-black text-slate-600 w-10">{acc}%</span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={cn("min-h-screen bg-[#f5f6fb] pb-12", !hideLayout && "pt-0")}>
      {!hideLayout ? (
        <Layout>
          <div className="max-w-4xl mx-auto px-1 sm:px-4 py-1 sm:py-6">
            <MainContent />
          </div>
        </Layout>
      ) : (
        <div className="max-w-4xl mx-auto px-1 sm:px-4 py-1 sm:py-6 text-slate-900">
          <MainContent />
        </div>
      )}
    </div>
  );
}
