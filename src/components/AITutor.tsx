import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import {
    GraduationCap,
    Send,
    Loader2,
    MessageCircle,
    X,
} from 'lucide-react';

interface Message {
    role: 'user' | 'assistant';
    content: string;
}

interface AITutorProps {
    questionText: string;
    userAnswer: string;
    correctAnswer: string;
    explanation: string;
    subject: string;
    topic: string;
}

export default function AITutor({
    questionText,
    userAnswer,
    correctAnswer,
    explanation,
    subject,
    topic,
}: AITutorProps) {
    const [chatOpen, setChatOpen] = useState(false);
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const { toast } = useToast();

    const sendMessage = async () => {
        if (!input.trim()) return;

        const userMessage: Message = { role: 'user', content: input };
        setMessages((prev) => [...prev, userMessage]);
        setInput('');
        setLoading(true);

        try {
            const { data, error } = await supabase.functions.invoke('ask-tutor', {
                body: {
                    question: input,
                    context: {
                        questionText,
                        userAnswer,
                        correctAnswer,
                        explanation,
                        subject,
                        topic,
                    },
                    conversationHistory: messages,
                },
            });

            if (error) throw error;

            const assistantMessage: Message = {
                role: 'assistant',
                content: data.response || 'Sorry, I could not generate a response.',
            };
            setMessages((prev) => [...prev, assistantMessage]);
        } catch (error) {
            console.error('Error asking tutor:', error);
            toast({
                title: 'Error',
                description: 'Failed to get response from tutor',
                variant: 'destructive',
            });
        } finally {
            setLoading(false);
        }
    };

    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    };

    return (
        <div className="mt-4 p-4 rounded-xl bg-gradient-to-r from-primary/10 to-purple/10 border border-primary/20">
            {/* Tutor Header */}
            <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center">
                        <GraduationCap className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                        <h3 className="font-semibold text-foreground">Expert Tutor</h3>
                        <p className="text-xs text-muted-foreground">Get personalized guidance</p>
                    </div>
                </div>
            </div>

            {/* Explanation Section */}
            <div className="space-y-3 mb-4">
                <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20">
                    <p className="text-sm">
                        <span className="font-medium text-destructive">You selected:</span>{' '}
                        {userAnswer}
                    </p>
                </div>
                <div className="p-3 rounded-lg bg-success/10 border border-success/20">
                    <p className="text-sm">
                        <span className="font-medium text-success">Correct answer:</span>{' '}
                        {correctAnswer}
                    </p>
                </div>
                {explanation && (
                    <div className="p-3 rounded-lg bg-secondary/50">
                        <p className="text-sm font-medium mb-1">Explanation:</p>
                        <p className="text-sm text-muted-foreground">{explanation}</p>
                    </div>
                )}
            </div>

            {/* Chat Toggle Button */}
            {!chatOpen ? (
                <Button
                    onClick={() => setChatOpen(true)}
                    className="w-full"
                    variant="default"
                >
                    <MessageCircle className="w-4 h-4 mr-2" />
                    Need more help? Ask the Tutor
                </Button>
            ) : (
                <div className="space-y-3">
                    {/* Chat Header */}
                    <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">Chat with Tutor</span>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setChatOpen(false)}
                        >
                            <X className="w-4 h-4" />
                        </Button>
                    </div>

                    {/* Chat Messages */}
                    <div className="max-h-64 overflow-y-auto space-y-2 p-3 rounded-lg bg-background/50 border border-border">
                        {messages.length === 0 ? (
                            <p className="text-sm text-muted-foreground text-center py-4">
                                Ask me anything about this question!
                            </p>
                        ) : (
                            messages.map((msg, idx) => (
                                <div
                                    key={idx}
                                    className={`p-3 rounded-lg ${msg.role === 'user'
                                        ? 'bg-primary/10 ml-8'
                                        : 'bg-secondary/50 mr-8'
                                        }`}
                                >
                                    <p className="text-sm font-medium mb-1">
                                        {msg.role === 'user' ? 'You' : 'Tutor'}
                                    </p>
                                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                                        {msg.content}
                                    </p>
                                </div>
                            ))
                        )}
                        {loading && (
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <Loader2 className="w-4 h-4 animate-spin" />
                                <span>Tutor is thinking...</span>
                            </div>
                        )}
                    </div>

                    {/* Chat Input */}
                    <div className="flex gap-2">
                        <input
                            type="text"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyPress={handleKeyPress}
                            placeholder="Ask a question..."
                            disabled={loading}
                            className="flex-1 px-3 py-2 rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary text-sm"
                        />
                        <Button
                            onClick={sendMessage}
                            disabled={loading || !input.trim()}
                            size="sm"
                        >
                            <Send className="w-4 h-4" />
                        </Button>
                    </div>
                </div>
            )}
        </div>
    );
}
