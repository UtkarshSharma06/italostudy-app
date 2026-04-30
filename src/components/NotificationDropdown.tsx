import { useState, useEffect } from 'react';
import { Bell, X, Clock, Sparkles, ChevronRight, ExternalLink } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { formatDistanceToNow } from 'date-fns';
import { useAuth } from '@/lib/auth';
import { useExam } from '@/context/ExamContext';
import { motion, AnimatePresence } from 'framer-motion';
import NotificationView from './NotificationView';

interface Notification {
    id: string;
    title: string | null;
    short_description: string | null;
    content_html: string;
    content_type?: 'html' | 'image';
    image_url?: string;
    created_at: string;
    exam_type: string | null;
    is_read?: boolean;
    show_minimal?: boolean;
    button_label?: string | null;
    link_url?: string | null;
    link_type?: string | null;
}

export default function NotificationDropdown() {
    const navigate = useNavigate();
    const { user, profile } = useAuth() as any;
    const { activeExam } = useExam();
    const [isOpen, setIsOpen] = useState(false);
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [selectedNotification, setSelectedNotification] = useState<Notification | null>(null);
    const [isNotificationViewOpen, setIsNotificationViewOpen] = useState(false);
    const [isExpanded, setIsExpanded] = useState(false);
    const [allNotifications, setAllNotifications] = useState<Notification[]>([]);
    const [isLoadingAll, setIsLoadingAll] = useState(false);

    useEffect(() => {
        if (user) {
            fetchNotifications();
            const subscription = supabase
                .channel('public:site_notifications')
                .on('postgres_changes', { event: '*', schema: 'public', table: 'site_notifications' }, () => {
                    fetchNotifications();
                })
                .subscribe();

            return () => {
                subscription.unsubscribe();
            };
        }
    }, [user, activeExam?.id]);

    const fetchNotifications = async () => {
        if (!user) return;

        // Check if user has Global plan
        const hasGlobalPlan = profile?.selected_plan?.toLowerCase().includes('global') ||
            profile?.subscription_tier?.toLowerCase().includes('global');

        // Fetch active notifications filtered by exam type AND role/plan
        let query = supabase
            .from('site_notifications')
            .select('*')
            .eq('is_active', true)
            .order('created_at', { ascending: false });

        // Filter by exam type: current exam OR general (null or empty string)
        if (activeExam?.id) {
            query = query.or(`exam_type.is.null,exam_type.eq.,exam_type.eq.${activeExam.id}`);
        } else {
            query = query.or('exam_type.is.null,exam_type.eq.');
        }

        const { data: notifs, error: notifError } = await query.limit(50);

        // Client-side filtering for target_role based on role AND plan
        const filtered = (notifs || []).filter(n => {
            if (!n.target_role || n.target_role === 'all') return true;
            if (n.target_role === profile?.role) return true;
            if (n.target_role === 'global') return hasGlobalPlan;
            return false;
        });

        if (notifError) {
            console.error('Error fetching notifications:', notifError);
            return;
        }

        // Fetch read status for this user
        const { data: readStatus } = await supabase
            .from('user_notifications_read')
            .select('notification_id')
            .eq('user_id', user.id);

        const readIds = new Set((readStatus || []).map(r => r.notification_id));

        const processedNotifs = filtered.slice(0, 3).map(n => ({
            ...n,
            is_read: readIds.has(n.id)
        }));

        setNotifications(processedNotifs as Notification[]);
        setUnreadCount(processedNotifs.filter(n => !n.is_read).length);
    };

    const fetchAllNotifications = async () => {
        if (!user) return;
        setIsLoadingAll(true);

        // Check if user has Global plan
        const hasGlobalPlan = profile?.selected_plan?.toLowerCase().includes('global') ||
            profile?.subscription_tier?.toLowerCase().includes('global');

        let query = supabase
            .from('site_notifications')
            .select('*')
            .eq('is_active', true)
            .order('created_at', { ascending: false });

        if (activeExam?.id) {
            query = query.or(`exam_type.is.null,exam_type.eq.,exam_type.eq.${activeExam.id}`);
        } else {
            query = query.or('exam_type.is.null,exam_type.eq.');
        }

        const { data: notifs, error } = await query;

        if (error) {
            console.error('Error fetching all notifications:', error);
            setIsLoadingAll(false);
            return;
        }

        // Client-side filtering for target_role based on role AND plan
        const filtered = (notifs || []).filter(n => {
            if (!n.target_role || n.target_role === 'all') return true;
            if (n.target_role === profile?.role) return true;
            if (n.target_role === 'global') return hasGlobalPlan;
            return false;
        });

        const { data: readStatus } = await supabase
            .from('user_notifications_read')
            .select('notification_id')
            .eq('user_id', user.id);

        const readIds = new Set((readStatus || []).map(r => r.notification_id));

        const processedNotifs = filtered.map(n => ({
            ...n,
            is_read: readIds.has(n.id)
        }));

        setAllNotifications(processedNotifs as Notification[]);
        setIsLoadingAll(false);
    };

    const markAsRead = async (notificationId: string) => {
        if (!user) return;

        // Optimistic Update
        setNotifications(prev => prev.map(n =>
            n.id === notificationId ? { ...n, is_read: true } : n
        ));
        setUnreadCount(prev => Math.max(0, prev - 1));

        try {
            const { error } = await supabase
                .from('user_notifications_read')
                .upsert({
                    user_id: user.id,
                    notification_id: notificationId
                });

            if (error) {
                // Rollback if error
                fetchNotifications();
            }
        } catch (error) {
            console.error('Error marking notification as read:', error);
            fetchNotifications();
        }
    };

    const handleNotificationClick = (notification: Notification) => {
        if (!notification.is_read) {
            markAsRead(notification.id);
        }
        setSelectedNotification(notification);
        setIsNotificationViewOpen(true);
        // Delay closing the dropdown slightly to allow for a smoother transition feel
        setTimeout(() => setIsOpen(false), 150);
    };

    if (!user) return null;

    if (!user) return null;

    return (
        <>
            <button
                onClick={() => setIsOpen(true)}
                className="relative w-[30px] h-[30px] rounded-full border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all flex items-center justify-center group shadow-sm active:scale-95 bg-white dark:bg-slate-900"
            >
                <Bell className={`w-3.5 h-3.5 transition-colors ${unreadCount > 0 ? 'text-indigo-600' : 'text-slate-600 dark:text-slate-400 group-hover:text-indigo-600'}`} />
                {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 w-5 h-5 bg-gradient-to-br from-indigo-500 to-purple-600 text-white text-[10px] font-black rounded-full flex items-center justify-center shadow-lg animate-pulse ring-2 ring-white dark:ring-slate-900">
                        {unreadCount}
                    </span>
                )}
            </button>

            <AnimatePresence>
                {isOpen && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="fixed inset-0 bg-black/20 z-40"
                            onClick={() => setIsOpen(false)}
                        />
                        <motion.div
                            initial={{ opacity: 0, y: 10, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 10, scale: 0.95 }}
                            transition={{ type: "spring", damping: 25, stiffness: 300 }}
                            className="fixed top-16 right-4 sm:right-6 w-[calc(100vw-32px)] sm:w-[350px] max-h-[calc(100vh-120px)] sm:max-h-[500px] z-50 flex flex-col pointer-events-auto border border-slate-200 bg-white shadow-2xl rounded-sm overflow-hidden"
                        >
                            {/* Header */}
                            <div className="bg-white px-4 py-3 border-b border-slate-100 shrink-0">
                                <div className="flex items-center justify-between">
                                    <h4 className="text-[13px] font-bold text-slate-900 uppercase tracking-widest">Notifications</h4>
                                    <button
                                        onClick={() => setIsOpen(false)}
                                        className="text-slate-400 hover:text-slate-600 transition-colors"
                                    >
                                        <X className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>

                            {/* Notifications List */}
                            <div className="bg-white overflow-y-auto flex-1 min-h-0">
                                {notifications.length === 0 ? (
                                    <div className="p-8 text-center">
                                        <p className="text-[13px] font-semibold text-slate-500">No new notifications</p>
                                    </div>
                                ) : (
                                    <div className="flex flex-col">
                                        {notifications.map((notification) => (
                                            <motion.button
                                                key={notification.id}
                                                whileTap={{ scale: 0.99 }}
                                                onClick={() => handleNotificationClick(notification)}
                                                className="w-full p-4 transition-colors group text-left relative flex items-start gap-3 hover:bg-slate-900 hover:text-white bg-white text-slate-900 border-b border-slate-100 last:border-0"
                                            >
                                                <div className="flex-1 min-w-0">
                                                    <h5 className="text-[13px] font-bold leading-tight line-clamp-2">
                                                        {notification.title || 'Update'}
                                                    </h5>

                                                    {notification.short_description && (
                                                        <p className="text-[11px] mt-1 line-clamp-2 text-slate-500 group-hover:text-slate-300 transition-colors">
                                                            {notification.short_description}
                                                        </p>
                                                    )}
                                                </div>

                                                {!notification.is_read && (
                                                    <div className="shrink-0 w-2 h-2 bg-indigo-600 rounded-full mt-1.5 shadow-sm" />
                                                )}
                                            </motion.button>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Footer */}
                            <div 
                                className="p-3 border-t border-slate-100 bg-slate-50 shrink-0 flex items-center justify-center hover:bg-slate-100 cursor-pointer transition-colors"
                                onClick={() => {
                                    setIsOpen(false);
                                    setIsExpanded(true);
                                    fetchAllNotifications();
                                }}
                            >
                                <span className="text-[12px] font-bold text-slate-900">See All Notifications</span>
                            </div>
                        </motion.div>
                    </>
                )}

                {/* Expanded Hover Card Overlay */}
                {isExpanded && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="fixed inset-0 bg-black/60 z-[60]"
                            onClick={() => setIsExpanded(false)}
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 10 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 10 }}
                            className="fixed inset-4 sm:inset-auto sm:top-1/2 sm:left-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2 sm:w-[500px] sm:max-h-[80vh] bg-white rounded-sm shadow-2xl z-[70] flex flex-col overflow-hidden border border-slate-200"
                        >
                            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-white shrink-0">
                                <h3 className="text-base font-bold text-slate-900 tracking-wide uppercase">Notification Center</h3>
                                <button
                                    onClick={() => setIsExpanded(false)}
                                    className="text-slate-400 hover:text-slate-600 transition-colors"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            <div className="flex-1 overflow-y-auto bg-white">
                                {isLoadingAll ? (
                                    <div className="flex flex-col items-center justify-center py-20 gap-4">
                                        <div className="w-8 h-8 border-2 border-slate-100 border-t-slate-900 rounded-full animate-spin" />
                                        <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Loading...</p>
                                    </div>
                                ) : allNotifications.length === 0 ? (
                                    <div className="text-center py-20">
                                        <p className="text-sm font-semibold text-slate-500">No notifications to display.</p>
                                    </div>
                                ) : (
                                    <div className="flex flex-col">
                                        {allNotifications.map((notification) => (
                                            <button
                                                key={notification.id}
                                                onClick={() => {
                                                    handleNotificationClick(notification);
                                                    setIsExpanded(false);
                                                }}
                                                className="w-full px-6 py-5 bg-white text-slate-900 border-b border-slate-100 transition-colors group text-left relative flex items-start gap-4 hover:bg-slate-900 hover:text-white last:border-0"
                                            >
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center justify-between mb-1">
                                                        <h4 className="text-[14px] font-bold leading-tight">
                                                            {notification.title || 'Broadcast'}
                                                        </h4>
                                                        <span className="text-[10px] font-semibold text-slate-400 group-hover:text-slate-400 shrink-0">
                                                            {new Date(notification.created_at).toLocaleDateString()}
                                                        </span>
                                                    </div>
                                                    <p className="text-[12px] text-slate-500 group-hover:text-slate-300 line-clamp-2 mt-1">
                                                        {notification.short_description || 'Click to view details.'}
                                                    </p>
                                                </div>
                                                {!notification.is_read && (
                                                    <div className="shrink-0 w-2 h-2 bg-indigo-600 rounded-full mt-1.5 shadow-sm" />
                                                )}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>

            {selectedNotification && (
                <NotificationView
                    isOpen={isNotificationViewOpen}
                    onClose={() => setIsNotificationViewOpen(false)}
                    title={selectedNotification.title || 'Update'}
                    content={selectedNotification.content_html}
                    content_type={selectedNotification.content_type}
                    image_url={selectedNotification.image_url}
                    created_at={selectedNotification.created_at}
                    short_description={selectedNotification.short_description || ''}
                    show_minimal={selectedNotification.show_minimal}
                    button_label={selectedNotification.button_label}
                    link_url={selectedNotification.link_url}
                    link_type={selectedNotification.link_type}
                />
            )}
        </>
    );
}
