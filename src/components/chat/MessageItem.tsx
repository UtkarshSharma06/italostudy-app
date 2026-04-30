import { format } from "date-fns";
import { useState, useRef, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { FileIcon, Trash2, Reply, Download, MoreHorizontal, Ban, ShieldAlert, Pin, Eye, Sparkles, Video, CornerUpRight } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { getOptimizedImageUrl } from "@/lib/image-optimizer";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetDescription,
    SheetFooter,
    SheetClose
} from "@/components/ui/sheet";
import { Copy } from "lucide-react";

export interface Message {
    id: string;
    content: string | null;
    file_url: string | null;
    file_type: string | null;
    file_name: string | null;
    created_at: string;
    user_id: string;
    reply_to_id: string | null;
    recipient_id?: string | null;
    is_deleted: boolean;
    view_count?: number;
    community_id?: string;
    batch_id?: string | null;
    profiles: {
        display_name: string | null;
        email: string | null;
        avatar_url: string | null;
        username: string | null;
    };
    reply_to?: {
        id: string;
        profiles: {
            display_name: string | null;
        };
        content: string | null;
        file_url?: string | null;
        file_type?: string | null;
        file_name?: string | null;
    };
    link_preview?: {
        title: string;
        description: string;
        image_url: string;
        url: string;
    } | null;
}

interface MessageItemProps {
    message: Message;
    onReply: (message: Message) => void;
    onDelete: (id: string) => void;
    onBan?: (userId: string, username: string) => void;
    onRestrict?: (userId: string, username: string) => void;
    isAdmin: boolean;
    isPinned?: boolean;
    onPin?: (messageId: string) => void;
    onUnpin?: () => void;
    onImageClick?: (imageUrl: string) => void;
    searchQuery?: string;
    reactions?: any[];
    batchMessages?: Message[];
    onView?: () => void;
    onScrollToMessage?: (messageId: string) => void;
}

const REACTION_OPTIONS = ["👍", "❤️", "😂", "😮", "😢", "🙏"];

const renderContent = (content: string, isOwn: boolean, searchQuery?: string) => {
    // Split by @mentions and URLs
    const parts = content.split(/(@[a-zA-Z0-9_]+|https?:\/\/[^\s]+|www\.[^\s]+)/g);

    return parts.map((part, i) => {
        if (part.startsWith('@')) {
            return (
                <span key={i} className={`font-bold ${isOwn ? 'text-indigo-100 bg-indigo-500/30' : 'text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/30'} px-1 py-0.5 rounded mx-0.5`}>
                    {part}
                </span>
            );
        }

        if (part.match(/^https?:\/\//) || part.startsWith('www.')) {
            const href = part.startsWith('www.') ? `https://${part}` : part;
            return (
                <a
                    key={i}
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`underline hover:no-underline break-all font-medium ${isOwn ? 'text-blue-700 dark:text-blue-300' : 'text-blue-600 dark:text-blue-400'}`}
                    onClick={(e) => e.stopPropagation()}
                >
                    {part}
                </a>
            );
        }

        // Highlight text if searchQuery exists
        if (searchQuery && part.toLowerCase().includes(searchQuery.toLowerCase())) {
            const subParts = part.split(new RegExp(`(${searchQuery})`, 'gi'));
            return (
                <span key={i}>
                    {subParts.map((subPart, j) =>
                        subPart.toLowerCase() === searchQuery.toLowerCase() ? (
                            <mark key={j} className="bg-yellow-200 dark:bg-yellow-500/50 text-black dark:text-white rounded-sm px-0.5">
                                {subPart}
                            </mark>
                        ) : subPart
                    )}
                </span>
            );
        }

        return part;
    });
};

export function MessageItem({ message, onReply, onDelete, onBan, onRestrict, isAdmin, isPinned, onPin, onUnpin, onImageClick, searchQuery, reactions = [], batchMessages, onView, onScrollToMessage }: MessageItemProps) {
    const { user } = useAuth();
    const isOwn = user?.id === message.user_id;
    const [showReactionPicker, setShowReactionPicker] = useState(false);
    const longPressTimer = useRef<NodeJS.Timeout | null>(null); // Timer ref
    const messageRef = useRef<HTMLDivElement>(null);

    // View Tracking
    useEffect(() => {
        if (!onView || message.is_deleted) return;

        const observer = new IntersectionObserver(
            (entries) => {
                if (entries[0].isIntersecting) {
                    onView();
                    observer.disconnect();
                }
            },
            { threshold: 0.5 }
        );

        if (messageRef.current) {
            observer.observe(messageRef.current);
        }

        return () => observer.disconnect();
    }, [message.id, onView, message.is_deleted]);

    const handleReaction = async (emoji: string) => {
        try {
            const { error } = await (supabase as any).rpc('toggle_message_reaction', {
                p_message_id: message.id,
                p_emoji: emoji
            });
            if (error) throw error;
            setShowReactionPicker(false);
        } catch (err) {
            console.error('Error toggling reaction:', err);
        }
    };

    // Mobile Long Press Handling
    const [isSheetOpen, setIsSheetOpen] = useState(false);
    const isLongPressRef = useRef(false);

    const startLongPress = (e: React.MouseEvent | React.TouchEvent) => {
        if ('button' in e && e.button !== 0) return; // Only left click
        isLongPressRef.current = false;
        longPressTimer.current = setTimeout(() => {
            isLongPressRef.current = true;
            if (navigator.vibrate) navigator.vibrate(50);
            setIsSheetOpen(true);
        }, 500);
    };

    const endLongPress = () => {
        if (longPressTimer.current) {
            clearTimeout(longPressTimer.current);
            longPressTimer.current = null;
        }
    };

    const cancelLongPress = () => {
        if (longPressTimer.current) {
            clearTimeout(longPressTimer.current);
            longPressTimer.current = null;
        }
    };

    const handleCopy = () => {
        if (message.content) {
            navigator.clipboard.writeText(message.content);
            // toast({ title: "Copied" }); // toast not in props, skipping or assuming parent handles
        }
        setIsSheetOpen(false);
    };

    // Group reactions by emoji
    const groupedReactions = reactions.reduce((acc: Record<string, { count: number, users: string[], hasReacted: boolean }>, curr) => {
        if (!acc[curr.emoji]) {
            acc[curr.emoji] = { count: 0, users: [], hasReacted: false };
        }
        acc[curr.emoji].count++;
        acc[curr.emoji].users.push(curr.user_id);
        if (curr.user_id === user?.id) acc[curr.emoji].hasReacted = true;
        return acc;
    }, {});

    if (message.is_deleted) {
        return (
            <div className="flex justify-center my-4">
                <span className="text-[10px] uppercase tracking-wider text-slate-400 bg-slate-50 dark:bg-slate-900 px-3 py-1 rounded-full border border-slate-100 dark:border-slate-800">
                    Message deleted
                </span>
            </div>
        );
    }

    if (message.recipient_id) {
        return (
            <div className="flex justify-center my-4 w-full">
                <span className="text-[12px] text-slate-500 dark:text-slate-400 bg-amber-50/80 dark:bg-amber-900/20 px-4 py-1.5 rounded-lg border border-amber-100/50 dark:border-amber-800/30 shadow-sm max-w-[80%] text-center leading-relaxed">
                    {message.content?.includes('Welcome to community') ? 'Welcome to community, You' : message.content}
                </span>
            </div>
        );
    }

    return (
        <div
            className={`group flex w-full animate-in fade-in slide-in-from-bottom-1 duration-200 ${isOwn ? 'justify-end' : 'justify-start'} mb-1 relative`}
            onMouseDown={startLongPress}
            onMouseUp={endLongPress}
            onMouseLeave={cancelLongPress}
            onTouchStart={startLongPress}
            onTouchEnd={endLongPress}
            onTouchMove={cancelLongPress}
            ref={messageRef}
            id={`message-${message.id}`}
        >
            {/* Forward Action (Outside Bubble) */}
            {(message.file_url || (batchMessages && batchMessages.length > 0)) && (
                <div className={`absolute top-1/2 -translate-y-1/2 ${isOwn ? 'left-[-40px]' : 'right-[-40px]'} opacity-0 group-hover:opacity-100 transition-opacity hidden md:flex`}>
                    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full bg-black/5 hover:bg-black/10 dark:bg-white/5 dark:hover:bg-white/10 text-slate-500">
                        <CornerUpRight className="h-4 w-4" />
                    </Button>
                </div>
            )}

            <div className={`flex gap-2 max-w-[85%] sm:max-w-[70%] md:max-w-[60%] ${isOwn ? 'flex-row-reverse' : 'flex-row'}`}>
                <Avatar className="w-8 h-8">
                    <AvatarImage src={getOptimizedImageUrl(message.profiles?.avatar_url, 64, 64)} />
                    <AvatarFallback className="bg-indigo-100 text-indigo-600 text-[10px] font-bold">
                        {message.profiles?.display_name?.substring(0, 2).toUpperCase() || 'U'}
                    </AvatarFallback>
                </Avatar>

                {/* Message Bubble Wrapper */}
                <div className="relative min-w-0 w-fit max-w-full">
                    <div
                        className={`relative px-3 py-2 shadow-[0_1px_0.5px_rgba(0,0,0,0.13)] text-[14.2px] leading-[19px] break-words overflow-hidden
                        ${isOwn
                                ? 'bg-[#d9fdd3] dark:bg-[#005c4b] text-slate-900 dark:text-slate-100 rounded-tr-none rounded-tl-lg rounded-bl-lg rounded-br-lg'
                                : 'bg-white dark:bg-[#202c33] text-slate-900 dark:text-slate-100 rounded-tl-none rounded-tr-lg rounded-bl-lg rounded-br-lg'
                            }`}
                        style={{
                            clipPath: isOwn
                                ? 'polygon(0 0, 100% 0, 100% 100%, 0 100%)'
                                : 'polygon(0 0, 100% 0, 100% 100%, 0 100%)',
                            padding: (message.file_url || (batchMessages && batchMessages.length > 0)) && !message.content ? '3px' : undefined
                        }}
                    >
                        {/* Tail SVG for visual flair (simulated) */}
                        {isOwn && (
                            <span className="absolute top-0 right-[-8px] w-0 h-0 border-[8px] border-transparent border-t-[#d9fdd3] dark:border-t-[#005c4b] border-l-[#d9fdd3] dark:border-l-[#005c4b] hidden md:block" />
                        )}
                        {!isOwn && (
                            <span className="absolute top-0 left-[-8px] w-0 h-0 border-[8px] border-transparent border-t-white dark:border-t-[#202c33] border-r-white dark:border-r-[#202c33] hidden md:block" />
                        )}

                        {/* Metadata (Name) - only for others in groups */}
                        {!isOwn && (
                            <div className="text-[12.5px] font-bold text-[#e542a3] mb-0.5 leading-4 cursor-pointer hover:underline">
                                {message.profiles?.display_name || message.profiles?.username || 'Unknown'}
                            </div>
                        )}

                        {/* Reply Context */}
                        {message.reply_to && (
                            <div
                                className={`mb-1 rounded-[4px] border-l-[4px] px-2 py-1 flex flex-col cursor-pointer transition-colors hover:opacity-80
                                ${isOwn ? 'bg-[#cbf5c4] dark:bg-[#025043] border-[#06cf9c]' : 'bg-slate-100 dark:bg-[#35424b] border-[#aebac1]'}`}
                                onClick={() => onScrollToMessage?.(message.reply_to!.id)}
                            >
                                <span className={`text-[11px] font-bold ${isOwn ? 'text-[#008069] dark:text-[#00a884]' : 'text-[#e542a3]'}`}>
                                    {message.reply_to.profiles?.display_name || message.reply_to.profiles?.username || 'Unknown'}
                                </span>
                                <span className="text-[11px] truncate text-slate-600 dark:text-slate-300 opacity-80 line-clamp-1">
                                    {message.reply_to.content?.trim() || 
                                     (message.reply_to.file_type?.startsWith('image/') ? '📷 Photo' : 
                                      message.reply_to.file_type?.startsWith('video/') ? '🎥 Video' : 
                                      message.reply_to.file_name || '📎 Attachment')}
                                </span>
                            </div>
                        )}

                        <div className="flex flex-col">
                            {/* File Attachment / Grid */}
                            {(message.file_url || (batchMessages && batchMessages.length > 0)) && (
                                <div className="mb-1 relative">
                                    {batchMessages && batchMessages.length > 1 ? (
                                        <div className={`grid gap-0.5 rounded-lg overflow-hidden border border-black/5 dark:border-white/5 bg-black/5 dark:bg-white/5 ${batchMessages.length === 2 ? 'grid-cols-2' :
                                            batchMessages.length === 3 ? 'grid-cols-2' :
                                                'grid-cols-2'
                                            }`}>
                                            {batchMessages.slice(0, 4).map((m, i) => {
                                                const isLast = i === 3 && batchMessages.length > 4;
                                                const isThirdAndOnlyThree = i === 2 && batchMessages.length === 3;

                                                return (
                                                    <div
                                                        key={m.id}
                                                        className={`relative overflow-hidden group/image cursor-pointer ${isThirdAndOnlyThree ? 'col-span-2 aspect-[2/1]' : 'aspect-square'
                                                            }`}
                                                        onClick={() => onImageClick?.(m.file_url!)}
                                                    >
                                                        <img
                                                            src={getOptimizedImageUrl(m.file_url, 300, 300)}
                                                            alt="attachment"
                                                            className="w-full h-full object-cover hover:brightness-90 transition-all duration-300"
                                                        />

                                                        {/* Video Indicator */}
                                                        {m.file_type?.startsWith('video/') && (
                                                            <div className="absolute bottom-1.5 left-1.5 flex items-center gap-1 text-white bg-black/40 px-1.5 py-0.5 rounded-md text-[10px] backdrop-blur-sm">
                                                                <Video className="w-3.5 h-3.5" />
                                                                <span>0:30</span>
                                                            </div>
                                                        )}

                                                        {isLast && (
                                                            <div className="absolute inset-0 bg-black/50 flex items-center justify-center backdrop-blur-[2px]">
                                                                <span className="text-white text-3xl font-light">+{batchMessages.length - 3}</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    ) : (message.file_url && (
                                        message.file_type?.startsWith('image/') || message.file_type?.startsWith('video/') ? (
                                            <div className="group/image relative rounded-lg overflow-hidden bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/5">
                                                <img
                                                    src={getOptimizedImageUrl(message.file_url, 500)}
                                                    alt="attachment"
                                                    className="w-full h-auto max-h-[350px] object-cover cursor-pointer hover:scale-[1.01] transition-transform duration-300"
                                                    onClick={() => onImageClick?.(message.file_url!)}
                                                />
                                                {message.file_type?.startsWith('video/') && (
                                                    <div className="absolute inset-0 flex items-center justify-center">
                                                        <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center text-white border border-white/30">
                                                            <Video className="w-6 h-6 fill-current" />
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        ) : (
                                            <a
                                                href={message.file_url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className={`flex items-center gap-3 p-3 rounded-lg border ${isOwn ? 'bg-[#cbf5c4]/50 dark:bg-[#025043]/50 border-[#06cf9c]/20' : 'bg-slate-50 dark:bg-[#2a3942] border-slate-100 dark:border-slate-700'}`}
                                            >
                                                <div className="h-10 w-10 bg-red-100 dark:bg-red-900/30 rounded-lg flex items-center justify-center text-red-500 shrink-0">
                                                    <FileIcon className="h-5 w-5" />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm font-medium truncate opacity-90">{message.file_name || 'Attachment'}</p>
                                                    <p className="text-[10px] opacity-60">Click to download</p>
                                                </div>
                                                <Download className="h-4 w-4 opacity-50" />
                                            </a>
                                        )
                                    ))}
                                </div>
                            )}

                            {/* Link Preview */}
                            {message.link_preview && (
                                <a
                                    href={message.link_preview.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className={`mt-1 mb-2 flex flex-col rounded-lg overflow-hidden border transition-colors hover:opacity-90 max-w-[240px] shadow-sm
                                    ${isOwn ? 'bg-[#cbf5c4] border-[#06cf9c]/30' : 'bg-slate-50 dark:bg-[#35424b] border-slate-200 dark:border-slate-700'}`}
                                    onClick={(e) => e.stopPropagation()}
                                >
                                    {message.link_preview.image_url && (
                                        <div className="w-full h-24 overflow-hidden border-b border-inherit">
                                            <img
                                                src={message.link_preview.image_url}
                                                alt="Preview"
                                                className="w-full h-full object-cover"
                                            />
                                        </div>
                                    )}
                                    <div className="p-2 space-y-0.5">
                                        <h4 className={`text-[12px] font-bold truncate ${isOwn ? 'text-[#008069] dark:text-[#00a884]' : 'text-indigo-600 dark:text-indigo-400'}`}>
                                            {message.link_preview.title}
                                        </h4>
                                        {message.link_preview.description && (
                                            <p className="text-[10px] leading-[13px] opacity-70 line-clamp-2">
                                                {message.link_preview.description}
                                            </p>
                                        )}
                                        <span className="text-[9px] opacity-50 block truncate lowercase font-medium">
                                            {new URL(message.link_preview.url).hostname}
                                        </span>
                                    </div>
                                </a>
                            )}

                            {/* Text Content */}
                            {message.content && (
                                <div className="pr-16 relative z-10 whitespace-pre-wrap text-[13.5px] leading-relaxed">
                                    {renderContent(message.content, isOwn, searchQuery)}
                                </div>
                            )}

                            {/* Timestamp & Status */}
                            <div className={`${(message.file_url || (batchMessages && batchMessages.length > 0)) && !message.content ? 'absolute bottom-1.5 right-1.5 bg-black/30 backdrop-blur-sm px-1.5 py-0.5 rounded-full text-white' : 'flex items-center justify-end gap-1.5 mt-[-6px]'} ${message.content ? 'float-right' : 'w-full'} z-20`}>
                                <span className={`text-[10px] ${((message.file_url || (batchMessages && batchMessages.length > 0)) && !message.content) ? 'text-white' : (isOwn ? 'text-slate-500 dark:text-[#8696a0]' : 'text-slate-400 dark:text-[#8696a0]')} flex items-center gap-1`}>
                                    <Eye className="h-3 w-3 opacity-70" />
                                    {message.view_count || 0}
                                </span>
                                <span className={`text-[10px] ${((message.file_url || (batchMessages && batchMessages.length > 0)) && !message.content) ? 'text-white' : (isOwn ? 'text-slate-500 dark:text-[#8696a0]' : 'text-slate-400 dark:text-[#8696a0]')} min-w-[45px] text-right`}>
                                    {format(new Date(message.created_at), 'HH:mm')}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Reactions Display - Outside overflow-hidden bubble */}
                    {Object.keys(groupedReactions).length > 0 && (
                        <div className={`absolute -bottom-3 ${isOwn ? 'right-2' : 'left-2'} flex items-center gap-0.5 z-20`}>
                            <div className="flex -space-x-1 items-center bg-white dark:bg-[#202c33] rounded-full px-1.5 py-0.5 shadow-sm border border-slate-100 dark:border-slate-800">
                                {Object.keys(groupedReactions).map(emoji => (
                                    <button
                                        key={emoji}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleReaction(emoji);
                                        }}
                                        className={`text-[12px] hover:scale-110 transition-transform ${groupedReactions[emoji].hasReacted ? 'grayscale-0' : 'grayscale-[0.5]'}`}
                                        title={groupedReactions[emoji].users.length.toString()}
                                    >
                                        {emoji}
                                    </button>
                                ))}
                                {reactions.length > 1 && (
                                    <span className="text-[9px] font-bold text-slate-500 ml-1">
                                        {reactions.length}
                                    </span>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Reaction Picker Overlay - Outside overflow-hidden bubble */}
                    {showReactionPicker && (
                        <div className={`absolute top-[-50px] ${isOwn ? 'right-0' : 'left-0'} z-[100] animate-in zoom-in duration-200`}>
                            <div className="flex items-center gap-1.5 bg-white dark:bg-[#202c33] p-2 rounded-full shadow-2xl border border-slate-200 dark:border-slate-700">
                                {REACTION_OPTIONS.map(emoji => (
                                    <button
                                        key={emoji}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleReaction(emoji);
                                        }}
                                        className="text-xl hover:scale-150 transition-transform px-1 hover:brightness-110 active:scale-95"
                                    >
                                        {emoji}
                                    </button>
                                ))}
                            </div>
                            <div className="fixed inset-0 z-[-1] cursor-default" onClick={(e) => {
                                e.stopPropagation();
                                setShowReactionPicker(false);
                            }} />
                        </div>
                    )}
                </div>

                {/* Dropdown Options (Desktop) */}
                <div className="opacity-0 group-hover:opacity-100 transition-opacity self-start mt-2 px-1 relative hidden md:block">
                    <DropdownMenu>
                        {/* ... keep existing dropdown content ... */}
                        <DropdownMenuTrigger className="focus:outline-none">
                            <div className="w-6 h-6 rounded-full bg-slate-200/50 hover:bg-slate-300 dark:bg-slate-700/50 dark:hover:bg-slate-600 flex items-center justify-center text-slate-500 dark:text-slate-300">
                                <MoreHorizontal className="w-3 h-3" />
                            </div>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align={isOwn ? "end" : "start"}>
                            <DropdownMenuItem onClick={() => setShowReactionPicker(true)}>
                                <Sparkles className="w-3 h-3 mr-2 text-amber-500" /> React
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => onReply(message)}>
                                <Reply className="w-3 h-3 mr-2" /> Reply
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={handleCopy}>
                                <Copy className="w-3 h-3 mr-2" /> Copy
                            </DropdownMenuItem>
                            {(isAdmin || onPin) && (
                                <DropdownMenuItem onClick={() => onPin?.(message.id)}>
                                    <Pin className="w-3 h-3 mr-2" /> Pin Message
                                </DropdownMenuItem>
                            )}
                            {isOwn && (
                                <DropdownMenuItem onClick={() => onDelete(message.id)} className="text-red-500 focus:text-red-500">
                                    <Trash2 className="w-3 h-3 mr-2" /> Delete
                                </DropdownMenuItem>
                            )}
                            {isAdmin && !isOwn && (
                                <>
                                    <DropdownMenuItem onClick={() => onDelete(message.id)} className="text-red-500 focus:text-red-500">
                                        <Trash2 className="w-3 h-3 mr-2" /> Delete (Admin)
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => onBan?.(message.user_id, message.profiles?.username || 'user')} className="text-red-500 focus:text-red-500">
                                        <Ban className="w-3 h-3 mr-2" /> Ban User
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => onRestrict?.(message.user_id, message.profiles?.username || 'user')} className="text-amber-500 focus:text-amber-500">
                                        <ShieldAlert className="w-3 h-3 mr-2" /> Restrict
                                    </DropdownMenuItem>
                                </>
                            )}
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>

                {/* Mobile Long Press Sheet */}
                <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
                    <SheetContent side="bottom" className="rounded-t-[1.5rem] p-4 pb-8 z-[100]">
                        <SheetHeader className="mb-4">
                            <SheetTitle>Message Options</SheetTitle>
                        </SheetHeader>
                        <div className="grid gap-3">
                            {/* Reactions in Sheet */}
                            <div className="flex items-center gap-2 justify-center mb-2 p-2 bg-secondary/20 rounded-full overflow-x-auto">
                                {REACTION_OPTIONS.map(emoji => (
                                    <button
                                        key={emoji}
                                        onClick={() => { handleReaction(emoji); setIsSheetOpen(false); }}
                                        className="text-2xl hover:scale-125 transition-transform px-2"
                                    >
                                        {emoji}
                                    </button>
                                ))}
                            </div>

                            <Button variant="outline" className="justify-start gap-4 h-12" onClick={() => { onReply(message); setIsSheetOpen(false); }}>
                                <Reply size={18} /> Reply
                            </Button>
                            <Button variant="outline" className="justify-start gap-4 h-12" onClick={handleCopy}>
                                <Copy size={18} /> Copy
                            </Button>
                            {(isAdmin || onPin) && (
                                <Button variant="outline" className="justify-start gap-4 h-12" onClick={() => { onPin?.(message.id); setIsSheetOpen(false); }}>
                                    <Pin size={18} /> {isPinned ? "Unpin" : "Pin"}
                                </Button>
                            )}
                            {isOwn && (
                                <Button variant="ghost" className="justify-start gap-4 h-12 text-red-500 hover:text-red-600 hover:bg-red-50" onClick={() => { onDelete(message.id); setIsSheetOpen(false); }}>
                                    <Trash2 size={18} /> Delete
                                </Button>
                            )}
                            {isAdmin && !isOwn && (
                                <Button variant="ghost" className="justify-start gap-4 h-12 text-red-500 hover:text-red-600 hover:bg-red-50" onClick={() => { onBan?.(message.user_id, message.profiles?.username || 'user'); setIsSheetOpen(false); }}>
                                    <Ban size={18} /> Ban User
                                </Button>
                            )}
                        </div>
                    </SheetContent>
                </Sheet>
            </div>
        </div>
    );
}
