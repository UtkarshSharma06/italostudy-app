import { useState, memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Brain, Trophy } from 'lucide-react';
import { cn } from '@/lib/utils';

export const CENT_S_QUESTIONS = [
    {
        subject: "📖 Reading",
        q: "A text states: 'Despite the rise of digital media, print journalism retains credibility among older demographics.' What can be inferred?",
        options: ["Print journalism is more accurate than digital", "Older readers are less trusting of digital sources", "Younger readers prefer print journalism", "Digital media has no credibility"],
        correct: 1
    },
    {
        subject: "📊 Data Analysis",
        q: "A class of 30 students scored a mean of 72 on a test. If 5 students are removed and the new mean is 75, what was the average score of the 5 removed students?",
        options: ["57", "60", "63", "66"],
        correct: 0
    },
    {
        subject: "🔢 Mathematics",
        q: "If f(x) = 3x² − 2x + 1, what is f(2)?",
        options: ["9", "10", "12", "14"],
        correct: 0
    },
    {
        subject: "⚗️ Chemistry",
        q: "Which of the following is a characteristic of an exothermic reaction?",
        options: ["It absorbs energy from surroundings", "ΔH is positive", "Products have lower energy than reactants", "It only occurs at high temperatures"],
        correct: 2
    },
    {
        subject: "⚡ Physics",
        q: "A car accelerates uniformly from rest to 20 m/s in 4 seconds. What is its acceleration?",
        options: ["4 m/s²", "5 m/s²", "8 m/s²", "10 m/s²"],
        correct: 1
    }
];

const CEnTSimulator = memo(() => {
    const [currentQ, setCurrentQ] = useState(0);
    const [selected, setSelected] = useState<number | null>(null);
    const [answered, setAnswered] = useState(false);
    const [score, setScore] = useState(0);
    const [done, setDone] = useState(false);

    const q = CENT_S_QUESTIONS[currentQ];

    const handleSelect = (idx: number) => {
        if (answered) return;
        setSelected(idx);
        setAnswered(true);
        if (idx === q.correct) setScore(s => s + 1);
        setTimeout(() => {
            if (currentQ + 1 < CENT_S_QUESTIONS.length) {
                setCurrentQ(c => c + 1);
                setSelected(null);
                setAnswered(false);
            } else {
                setDone(true);
            }
        }, 1000);
    };

    const handleReset = () => {
        setCurrentQ(0);
        setSelected(null);
        setAnswered(false);
        setScore(0);
        setDone(false);
    };

    return (
        <div className="bg-slate-50 rounded-[2.2rem] p-6 md:p-8">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-indigo-600 flex items-center justify-center text-white shadow-lg shadow-indigo-200">
                        <Brain className="w-5 h-5" />
                    </div>
                    <div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Exam Simulator</p>
                        <h3 className="text-base font-black text-slate-900">Italostudy</h3>
                    </div>
                </div>
                <div className="px-3 py-1 bg-white border border-slate-100 rounded-full shadow-sm">
                    <span className="text-[10px] font-black text-emerald-600 uppercase">Live Practice</span>
                </div>
            </div>

            {done ? (
                <AnimatePresence>
                    <motion.div
                        key="done"
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="flex flex-col items-center gap-4 py-6 text-center"
                    >
                        <Trophy className="w-12 h-12 text-indigo-500" />
                        <p className="text-xl font-black text-slate-900">Practice Complete!</p>
                        <p className="text-sm font-bold text-slate-500">You scored <span className="text-indigo-600">{score}/{CENT_S_QUESTIONS.length}</span> correctly.</p>
                        <button onClick={handleReset} className="mt-2 px-6 py-2 rounded-full bg-indigo-600 text-white text-sm font-black hover:bg-indigo-700 transition-colors">
                            Try Again
                        </button>
                    </motion.div>
                </AnimatePresence>
            ) : (
                <AnimatePresence mode="wait">
                    <motion.div
                        key={currentQ}
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        transition={{ duration: 0.2 }}
                        className="space-y-4"
                    >
                        {/* Progress */}
                        <div className="flex items-center gap-2 mb-1">
                            <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
                            <p className="text-[10px] font-black text-indigo-500 uppercase tracking-widest">Question {currentQ + 1} of {CENT_S_QUESTIONS.length}</p>
                        </div>
                        <div className="w-full h-1 bg-slate-200 rounded-full overflow-hidden">
                            <div
                                className="h-full bg-indigo-500 rounded-full transition-all duration-300"
                                style={{ width: `${((currentQ) / CENT_S_QUESTIONS.length) * 100}%` }}
                            />
                        </div>

                        {/* Question */}
                        <div className="p-4 bg-white border border-slate-100 rounded-2xl shadow-sm">
                            <span className="text-[10px] font-black text-violet-500 uppercase tracking-widest block mb-2">{q.subject}</span>
                            <p className="text-[13px] font-bold text-slate-800 leading-snug">{q.q}</p>
                        </div>

                        {/* Options */}
                        <div className="grid grid-cols-2 gap-2">
                            {q.options.map((opt, idx) => {
                                const isSelected = selected === idx;
                                const isCorrect = idx === q.correct;
                                let cls = "p-3 border rounded-xl flex items-center gap-2 cursor-pointer transition-all text-[11px] font-bold ";
                                if (!answered) {
                                    cls += "bg-white border-slate-100 text-slate-600 hover:bg-slate-50 hover:border-indigo-200";
                                } else if (isCorrect) {
                                    cls += "bg-emerald-50 border-emerald-300 text-emerald-700";
                                } else if (isSelected) {
                                    cls += "bg-red-50 border-red-300 text-red-600";
                                } else {
                                    cls += "bg-white border-slate-100 text-slate-400";
                                }
                                return (
                                    <button key={idx} className={cls} onClick={() => handleSelect(idx)}>
                                        <div className={cn(
                                            "w-5 h-5 rounded-full border flex-shrink-0 flex items-center justify-center text-[10px] font-black",
                                            !answered ? "border-slate-200 text-slate-400" :
                                                isCorrect ? "border-emerald-400 text-emerald-600 bg-emerald-100" :
                                                    isSelected ? "border-red-400 text-red-500 bg-red-100" :
                                                        "border-slate-200 text-slate-300"
                                        )}>
                                            {String.fromCharCode(65 + idx)}
                                        </div>
                                        {opt}
                                    </button>
                                );
                            })}
                        </div>
                    </motion.div>
                </AnimatePresence>
            )}
        </div>
    );
});

CEnTSimulator.displayName = 'CEnTSimulator';
export default CEnTSimulator;
