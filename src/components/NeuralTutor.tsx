import { useState, useEffect, useRef } from 'react';
import { useAI } from '@/context/AIContext';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import {
    Brain,
    X,
    Send,
    Loader2,
    Sparkles,
    ChevronRight,
    MessageCircle,
    Minimize2,
    Maximize2,
    BookOpen,
    Info,
    History,
    ChevronDown,
    ChevronUp,
    Zap
} from 'lucide-react';

interface Message {
    role: 'user' | 'assistant';
    content: string;
    type?: 'logic' | 'concept' | 'query';
}

export default function NeuralTutor() {
    const { isTutorOpen, setTutorOpen, tutorContext } = useAI();
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const [isMinimized, setIsMinimized] = useState(false);
    const [isContextExpanded, setIsContextExpanded] = useState(true);
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages, loading]);

    useEffect(() => {
        if (tutorContext && isTutorOpen) {
            if (messages.length === 0) {
                handleAutoExplain();
            }
        }
    }, [tutorContext, isTutorOpen]);

    const handleAutoExplain = async () => {
        if (!tutorContext) return;

        setLoading(true);
        try {
            const { data, error } = await supabase.functions.invoke('ask-tutor', {
                body: {
                    question: "Can you explain the logic behind this question?",
                    context: tutorContext,
                    conversationHistory: []
                },
            });

            if (error) throw error;

            setMessages([{
                role: 'assistant',
                content: data.response || "Hello! How can I help you understand this?",
                type: 'logic'
            }]);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const sendMessage = async (overrideInput?: string) => {
        const textToSend = overrideInput || input;
        if (!textToSend.trim() || loading) return;

        const userMsg: Message = { role: 'user', content: textToSend };
        setMessages(prev => [...prev, userMsg]);
        if (!overrideInput) setInput('');
        setLoading(true);

        try {
            const { data, error } = await supabase.functions.invoke('ask-tutor', {
                body: {
                    question: textToSend,
                    context: tutorContext,
                    conversationHistory: messages
                },
            });

            if (error) throw error;

            setMessages(prev => [...prev, {
                role: 'assistant',
                content: data.response || "I didn't quite catch that. Please rephrase.",
                type: textToSend.toLowerCase().includes('concept') ? 'concept' : 'logic'
            }]);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    if (!isTutorOpen && !isMinimized) {
        return (
            <button
                onClick={() => setTutorOpen(true)}
                className="fixed bottom-8 right-8 w-16 h-16 bg-slate-900 text-white rounded-full flex items-center justify-center shadow-2xl shadow-indigo-200 hover:scale-110 active:scale-95 transition-all z-[100] group"
            >
                <Brain className="w-8 h-8 group-hover:rotate-12 transition-transform" />
                <div className="absolute -top-1 -right-1 w-4 h-4 bg-indigo-500 rounded-full border-2 border-white animate-pulse" />
            </button>
        );
    }

    const suggestions = tutorContext ? [
        { label: "Explain logic", icon: Zap, prompt: "Can you explain why this is the correct answer in more detail?" },
        { label: "Deep dive concept", icon: BookOpen, prompt: "Tell me more about the underlying concepts in this question." },
        { label: "Similar patterns", icon: History, prompt: "What other types of questions are commonly linked to this topic?" }
    ] : [
        { label: "Study strategy", icon: Brain, prompt: "Give me some effective study strategies for my current mock exams." },
        { label: "Progress report", icon: Zap, prompt: "Analyze my recent performance data." }
    ];

    return (
        <div className={`fixed bottom-4 right-4 sm:bottom-8 sm:right-8 z-[100] transition-all duration-500 ease-out ${isMinimized ? 'w-16 h-16' : 'w-[calc(100vw-32px)] sm:w-[440px] h-[600px] sm:h-[700px] max-h-[85vh]'
            }`}>
            {isMinimized ? (
                <button
                    onClick={() => setIsMinimized(false)}
                    className="w-full h-full bg-slate-900 text-white rounded-full flex items-center justify-center shadow-2xl hover:scale-110 transition-all group"
                >
                    <Brain className="w-8 h-8" />
                </button>
            ) : (
                <div className="w-full h-full bg-white/90 dark:bg-slate-900/90 backdrop-blur-3xl rounded-[2rem] sm:rounded-[3rem] border border-white dark:border-white/5 shadow-[0_32px_64px_-16px_rgba(0,0,0,0.2)] flex flex-col overflow-hidden animate-in slide-in-from-bottom-8 duration-500">
                    {/* Header */}
                    <div className="p-6 sm:p-8 border-b border-slate-100 dark:border-border flex items-center justify-between bg-white/50 dark:bg-slate-900/50 relative z-20">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-slate-900 rounded-[1.25rem] flex items-center justify-center shadow-xl shadow-indigo-100/50">
                                <Brain className="w-6 h-6 text-white" />
                            </div>
                            <div>
                                <h3 className="text-sm font-black text-slate-900 dark:text-slate-100 uppercase tracking-tighter">Smart Tutor</h3>
                                <div className="flex items-center gap-2 mt-1">
                                    <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none">Online</span>
                                </div>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => setIsMinimized(true)}
                                className="w-10 h-10 rounded-xl hover:bg-slate-100"
                            >
                                <Minimize2 className="w-5 h-5 text-slate-400" />
                            </Button>
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => {
                                    setTutorOpen(false);
                                    setMessages([]);
                                }}
                                className="w-10 h-10 rounded-xl hover:bg-rose-50 group/close"
                            >
                                <X className="w-5 h-5 text-slate-400 group-hover/close:text-rose-500" />
                            </Button>
                        </div>
                    </div>

                    {/* Mission Context Banner */}
                    {tutorContext && (
                        <div className="bg-slate-50 dark:bg-muted border-b border-slate-100 dark:border-border overflow-hidden transition-all duration-300">
                            <button
                                onClick={() => setIsContextExpanded(!isContextExpanded)}
                                className="w-full px-8 py-3 flex items-center justify-between text-[10px] font-black text-slate-400 uppercase tracking-widest hover:bg-slate-100/50 transition-colors"
                            >
                                <div className="flex items-center gap-2">
                                    <Info className="w-3 h-3" />
                                    <span>Current Session Context</span>
                                </div>
                                {isContextExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                            </button>
                            {isContextExpanded && (
                                <div className="px-8 pb-5 animate-in slide-in-from-top-2 duration-300">
                                    <div className="p-4 bg-white dark:bg-card rounded-2xl border border-slate-200/50 shadow-sm">
                                        <p className="text-[11px] font-bold text-slate-500 leading-relaxed italic mb-3">
                                            "{tutorContext.questionText.slice(0, 100)}..."
                                        </p>
                                        <div className="flex flex-wrap gap-2">
                                            <span className="px-3 py-1 bg-indigo-50 text-indigo-600 rounded-full text-[9px] font-black uppercase tracking-widest">{tutorContext.subject}</span>
                                            <span className="px-3 py-1 bg-orange-50 text-orange-600 rounded-full text-[9px] font-black uppercase tracking-widest">{tutorContext.topic}</span>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Messages Container */}
                    <div
                        ref={scrollRef}
                        className="flex-1 overflow-y-auto p-4 sm:p-8 space-y-6 sm:space-y-8 scroll-smooth"
                    >
                        {messages.length === 0 && !loading && (
                            <div className="text-center py-16 space-y-6">
                                <div className="w-24 h-24 bg-slate-50 dark:bg-muted rounded-[2.5rem] flex items-center justify-center mx-auto border border-slate-100 dark:border-border shadow-inner">
                                    <Sparkles className="w-10 h-10 text-indigo-200" />
                                </div>
                                <div className="space-y-2">
                                    <h4 className="text-base font-black text-slate-900 dark:text-slate-100 uppercase tracking-tight">Smart Assistant Ready</h4>
                                    <p className="text-xs text-slate-400 font-bold max-w-[240px] mx-auto leading-relaxed tracking-tight">
                                        Ask me anything about your current session.
                                    </p>
                                </div>
                            </div>
                        )}

                        {messages.map((msg, i) => (
                            <div
                                key={i}
                                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-4 duration-500`}
                            >
                                <div className={`max-w-[90%] p-4 sm:p-6 rounded-[1.5rem] sm:rounded-[2rem] text-sm font-bold leading-relaxed tracking-tight relative group ${msg.role === 'user'
                                    ? 'bg-slate-900 text-white rounded-tr-none'
                                    : msg.type === 'concept'
                                        ? 'bg-indigo-600 text-white rounded-tl-none shadow-xl shadow-indigo-200'
                                        : 'bg-white dark:bg-card text-slate-800 border border-slate-100 dark:border-border rounded-tl-none shadow-sm'
                                    }`}>
                                    {msg.role === 'assistant' && (
                                        <div className={`absolute -top-3 -left-3 w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center shadow-lg border-2 border-white dark:border-slate-900 ${msg.type === 'concept' ? 'bg-white dark:bg-slate-800' : 'bg-slate-900'
                                            }`}>
                                            {msg.type === 'concept' ? <BookOpen className="w-4 h-4 text-indigo-600" /> : <Zap className="w-4 h-4 text-white" />}
                                        </div>
                                    )}
                                    <p className="relative z-10">{msg.content}</p>
                                </div>
                            </div>
                        ))}

                        {loading && (
                            <div className="flex justify-start">
                                <div className="bg-white/50 dark:bg-slate-800/50 p-5 rounded-[2rem] rounded-tl-none border border-slate-100 dark:border-border flex items-center gap-4 shadow-sm animate-pulse">
                                    <div className="w-8 h-8 bg-slate-100 rounded-full flex items-center justify-center">
                                        <Loader2 className="w-4 h-4 animate-spin text-indigo-600" />
                                    </div>
                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-0.5">Thinking...</span>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Input & Suggestions Footer */}
                    <div className="p-6 sm:p-8 bg-white/50 dark:bg-slate-900/50 border-t border-slate-100 dark:border-border backdrop-blur-md">
                        {/* Suggestion Chips */}
                        <div className="flex gap-2 mb-6 overflow-x-auto pb-2 scrollbar-none no-scrollbar">
                            {suggestions.map((s, i) => (
                                <button
                                    key={i}
                                    onClick={() => sendMessage(s.prompt)}
                                    className="px-4 py-2.5 bg-white dark:bg-card border border-slate-100 dark:border-border rounded-full flex items-center gap-2 whitespace-nowrap shadow-sm hover:border-indigo-200 hover:bg-indigo-50/50 transition-all active:scale-95 group"
                                >
                                    <s.icon className="w-3 h-3 text-slate-400 group-hover:text-indigo-600 transition-colors" />
                                    <span className="text-[10px] font-black text-slate-600 dark:text-slate-400 uppercase tracking-widest">{s.label}</span>
                                </button>
                            ))}
                        </div>

                        <div className="relative group">
                            <input
                                type="text"
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
                                placeholder="TYPE QUERY..."
                                className="w-full bg-slate-50 dark:bg-muted border border-slate-100 dark:border-border rounded-2xl h-14 pl-6 pr-16 text-xs font-black tracking-widest placeholder:text-slate-300 focus:outline-none focus:ring-4 focus:ring-indigo-100 transition-all shadow-inner uppercase"
                            />
                            <button
                                onClick={() => sendMessage()}
                                disabled={loading || !input.trim()}
                                className="absolute right-2 top-2 w-10 h-10 bg-slate-900 text-white rounded-xl flex items-center justify-center hover:bg-slate-800 disabled:opacity-50 transition-all active:scale-90 shadow-xl shadow-slate-200"
                            >
                                <ChevronRight className="w-6 h-6" />
                            </button>
                        </div>
                        <p className="text-[8px] font-black text-slate-300 text-center mt-6 uppercase tracking-[0.3em]">
                            Italostudy Smart System
                        </p>
                    </div>
                </div>
            )}
        </div>
    );
}
