import React, { createContext, useContext, useState, ReactNode } from 'react';

interface Message {
    role: 'user' | 'assistant';
    content: string;
}

interface TutorContext {
    questionText: string;
    userAnswer?: string;
    correctAnswer?: string;
    explanation?: string;
    subject?: string;
    topic?: string;
}

interface AIContextType {
    isTutorOpen: boolean;
    setTutorOpen: (open: boolean) => void;
    tutorContext: TutorContext | null;
    setTutorContext: (context: TutorContext) => void;
    askTutor: (context: TutorContext) => void;
}

const AIContext = createContext<AIContextType | undefined>(undefined);

export function AIProvider({ children }: { children: ReactNode }) {
    const [isTutorOpen, setTutorOpen] = useState(false);
    const [tutorContext, setTutorContext] = useState<TutorContext | null>(null);

    const askTutor = (context: TutorContext) => {
        setTutorContext(context);
        setTutorOpen(true);
    };

    return (
        <AIContext.Provider value={{
            isTutorOpen,
            setTutorOpen,
            tutorContext,
            setTutorContext,
            askTutor
        }}>
            {children}
        </AIContext.Provider>
    );
}

export function useAI() {
    const context = useContext(AIContext);
    if (context === undefined) {
        throw new Error('useAI must be used within an AIProvider');
    }
    return context;
}
