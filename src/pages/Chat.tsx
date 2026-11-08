import React, { useState, useEffect, useRef } from 'react';
import { useChat } from '@ai-sdk/react';
import { supabase } from '@/integrations/supabase/client';
import ReactMarkdown from 'react-markdown';
import TextareaAutosize from 'react-textarea-autosize';
import { Send, Loader2, Sparkles, User, Brain, Video, MessageSquare, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from 'sonner';

export default function Chat() {
  const [token, setToken] = useState<string | null>(null);
  const [mode, setMode] = useState<'chat' | 'video'>('video');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setToken(data.session?.access_token || null);
    });
  }, []);

  const chatOptions = React.useMemo(() => ({
    api: `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat`,
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    body: { mode }
  }), [token, mode]);

  const { messages, append, isLoading } = useChat(chatOptions);
  const [localInput, setLocalInput] = useState('');

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isLoading]);

  // Basic markdown component rendering with video extraction
  const renderMessageContent = (content: string) => {
    const videoRegex = /\[VIDEO:(.*?)\]/g;
    const parts = content.split(videoRegex);

    if (parts.length > 1) {
       return (
         <div className="space-y-4">
           {parts.map((part, index) => {
             // Every odd index is a captured group (the video URL)
             if (index % 2 === 1) {
               return (
                 <div key={index} className="w-full max-w-xl mt-4 rounded-xl overflow-hidden border border-border shadow-sm bg-black">
                   <video controls className="w-full h-auto aspect-video" src={part} />
                 </div>
               );
             }
             // Even index is normal text
             return part ? <ReactMarkdown key={index} className="prose prose-sm md:prose-base dark:prose-invert max-w-none prose-p:leading-relaxed prose-pre:bg-muted/50">{part}</ReactMarkdown> : null;
           })}
         </div>
       );
    }
    
    return <ReactMarkdown className="prose prose-sm md:prose-base dark:prose-invert max-w-none prose-p:leading-relaxed prose-pre:bg-muted/50">{content}</ReactMarkdown>;
  };

  if (!token) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="animate-spin w-8 h-8 text-primary" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100dvh-64px)] md:h-[calc(100vh-64px)] w-full bg-background">
      {/* Header - Minimal for Claude feel */}
      <div className="shrink-0 h-14 md:h-16 border-b border-border/40 bg-background/80 backdrop-blur-sm sticky top-0 z-10 flex items-center px-4 md:px-6">
        <h1 className="text-lg font-medium flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-primary" />
          Doubtster
        </h1>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto w-full scroll-smooth min-h-0">
        <div className="max-w-3xl mx-auto w-full px-4 pt-8 md:pt-10 pb-6 space-y-8">
          {messages.length === 0 && (
            <div className="mt-16 md:mt-32 flex flex-col items-center justify-center text-center animate-in fade-in duration-700 zoom-in-95">
              <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mb-6 shadow-sm border border-primary/20 text-primary">
                <Sparkles className="w-8 h-8" />
              </div>
              <h2 className="text-2xl md:text-3xl font-semibold tracking-tight mb-3">How can I help you today?</h2>
              <p className="text-muted-foreground text-base max-w-md">
                Ask a question about your studies or paste a topic, and I'll find relevant video solutions and explain them to you.
              </p>
            </div>
          )}
          
          {messages.map(m => (
            <div key={m.id} className={`flex w-full ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              {m.role === 'user' ? (
                <div className="max-w-[92%] md:max-w-[75%] bg-muted/60 dark:bg-muted/40 rounded-3xl rounded-tr-sm px-5 py-3 md:px-6 md:py-4 text-[15px] leading-relaxed shadow-sm">
                  {renderMessageContent(m.content)}
                </div>
              ) : (
                <div className="flex gap-3 md:gap-4 w-full max-w-full md:max-w-[90%] animate-in fade-in duration-300">
                  <div className="w-7 h-7 md:w-8 md:h-8 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0 mt-0.5">
                    <Sparkles className="w-3.5 h-3.5 md:w-4 md:h-4 text-primary" />
                  </div>
                  <div className="flex-1 text-[15px] leading-relaxed text-foreground/90 min-w-0">
                    {renderMessageContent(m.content)}
                  </div>
                </div>
              )}
            </div>
          ))}
          
          {isLoading && messages.length > 0 && messages[messages.length - 1].role === 'user' && (
            <div className="flex justify-start w-full animate-in fade-in duration-300">
              <div className="flex gap-4 w-full max-w-[90%]">
                <div className="w-8 h-8 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0 mt-0.5">
                  <Sparkles className="w-4 h-4 text-primary" />
                </div>
                <div className="flex-1 flex items-center gap-2 pt-1.5">
                  <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                  <span className="text-sm font-medium text-muted-foreground animate-pulse">Thinking...</span>
                </div>
              </div>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input */}
      <div className="shrink-0 bg-background pt-2 pb-4 md:pb-6 px-4">
        <div className="max-w-3xl mx-auto w-full">
          <form 
            onSubmit={async (e) => {
              e.preventDefault();
              if (!localInput.trim()) return;
              const content = localInput;
              setLocalInput('');
              try {
                await append({ content, role: 'user' });
              } catch (err: any) {
                console.error("Failed to append message:", err);
                toast.error(err.message || "Failed to send message. Is the backend deployed?");
              }
            }} 
            className="w-full bg-background/70 backdrop-blur-xl border border-border/80 shadow-[0_4px_24px_rgba(0,0,0,0.06)] dark:shadow-[0_4px_24px_rgba(0,0,0,0.2)] rounded-3xl p-2 flex flex-col ring-1 ring-black/5 dark:ring-white/5 transition-all focus-within:shadow-[0_6px_30px_rgba(0,0,0,0.08)] dark:focus-within:shadow-[0_6px_30px_rgba(0,0,0,0.3)] focus-within:border-primary/40"
          >
            <TextareaAutosize
              value={localInput}
              onChange={(e) => setLocalInput(e.target.value)}
              placeholder="Ask anything..."
              className="w-full bg-transparent border-none focus:outline-none focus:ring-0 resize-none px-4 py-3 min-h-[52px] max-h-[40vh] text-[15px] leading-relaxed"
              onKeyDown={async (e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  if (localInput.trim()) {
                    const content = localInput;
                    setLocalInput('');
                    try {
                      await append({ content, role: 'user' });
                    } catch (err: any) {
                      console.error("Failed to append message:", err);
                      toast.error(err.message || "Failed to send message.");
                    }
                  }
                }
              }}
            />
            <div className="flex justify-between items-center px-3 pb-1.5 pt-2">
              <div className="flex items-center gap-2">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-8 rounded-full text-xs font-medium text-muted-foreground hover:text-foreground px-3">
                      {mode === 'video' ? <Video className="w-3.5 h-3.5 mr-1.5" /> : <MessageSquare className="w-3.5 h-3.5 mr-1.5" />}
                      {mode === 'video' ? 'Video Solution' : 'Text Chat'}
                      <ChevronDown className="w-3 h-3 ml-1 opacity-70" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="rounded-xl border-border/60 shadow-lg min-w-[140px]">
                    <DropdownMenuItem onClick={() => setMode('chat')} className="text-sm rounded-lg cursor-pointer">
                      <MessageSquare className="w-4 h-4 mr-2" /> Text Chat
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setMode('video')} className="text-sm rounded-lg cursor-pointer">
                      <Video className="w-4 h-4 mr-2" /> Video Solution
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              <Button 
                type="submit" 
                disabled={!localInput.trim() || isLoading}
                size="icon" 
                className={`rounded-full h-9 w-9 shrink-0 transition-all duration-200 ${
                  localInput.trim() && !isLoading 
                    ? 'bg-primary text-primary-foreground hover:bg-primary/90 shadow-md hover:scale-105 active:scale-95' 
                    : 'bg-muted text-muted-foreground/50 hover:bg-muted'
                }`}
              >
                {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-[16px] h-[16px] ml-0.5" />}
              </Button>
            </div>
          </form>
          <div className="text-[11px] text-muted-foreground/60 font-medium text-center mt-2.5">
            AI can make mistakes. Verify important information.
          </div>
        </div>
      </div>
    </div>
  );
}
