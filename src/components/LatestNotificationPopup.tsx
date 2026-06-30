import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { useExam } from '@/context/ExamContext';
import NotificationView from './NotificationView';

export default function LatestNotificationPopup() {
    const { user, profile } = useAuth() as any;
    const { activeExam } = useExam();
    const [latestNotification, setLatestNotification] = useState<any>(null);
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        if (user && activeExam) {
            checkLatestNotification();

            // Real-time subscription for newly added notifications
            // Unique channel name to avoid React remount collisions
            const channelName = `site_notifications_popup_${Math.random().toString(36).substring(7)}`;
            const subscription = supabase
                .channel(channelName)
                .on('postgres_changes',
                    { event: 'INSERT', schema: 'public', table: 'site_notifications' },
                    (payload) => {
                        const newNotif = payload.new;
                        // Check if it's active and targets the current user's exam (or general)
                        // AND check role/plan targeting
                        const targetRole = newNotif.target_role || 'all';
                        const userRole = profile?.role || 'user';
                        const hasGlobalPlan = profile?.selected_plan?.toLowerCase().includes('global') ||
                            profile?.subscription_tier?.toLowerCase().includes('global');

                        const isRoleMatch = targetRole === 'all' || targetRole === userRole ||
                            (targetRole === 'global' && hasGlobalPlan);
                        const isExamMatch = !newNotif.exam_type || newNotif.exam_type === activeExam.id;

                        if (newNotif.is_active && isExamMatch && isRoleMatch) {
                            checkLatestNotification(); // Refresh and potentially show the new one
                        }
                    }
                )
                .subscribe();

            return () => {
                supabase.removeChannel(subscription);
            };
        }
    }, [user, activeExam?.id, profile?.role]);

    const checkLatestNotification = async () => {
        if (!user) return;

        try {
            // Check if user has Global plan
            const hasGlobalPlan = profile?.selected_plan?.toLowerCase().includes('global') ||
                profile?.subscription_tier?.toLowerCase().includes('global');

            // 1. Fetch the latest active notification for this exam AND role
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

            const { data: notifs, error } = await query.limit(10);

            if (error || !notifs || notifs.length === 0) return;

            // Client-side filtering for target_role based on role AND plan
            const filtered = notifs.filter(n => {
                if (!n.target_role || n.target_role === 'all') return true;
                if (n.target_role === profile?.role) return true;
                if (n.target_role === 'global') return hasGlobalPlan;
                return false;
            });

            if (filtered.length === 0) return;

            // 2. Find the first unread notification in the filtered list
            const notifIds = filtered.map(n => n.id);
            const { data: readStatuses } = await supabase
                .from('user_notifications_read')
                .select('notification_id')
                .eq('user_id', user.id)
                .in('notification_id', notifIds);

            const readIds = new Set(readStatuses?.map(r => r.notification_id) || []);

            let firstUnread = null;
            for (const notif of filtered) {
                const sessionShownKey = `shown_notif_${user.id}_${notif.id}`;
                if (!readIds.has(notif.id) && !sessionStorage.getItem(sessionShownKey)) {
                    firstUnread = notif;
                    break;
                }
            }

            if (!firstUnread) return;

            const sessionShownKey = `shown_notif_${user.id}_${firstUnread.id}`;

            // Show the popup
            setLatestNotification(firstUnread);
            setIsVisible(true);
            // Mark as shown in this session
            sessionStorage.setItem(sessionShownKey, 'true');

            // Mark as read in DB immediately so it NEVER shows again even if they don't click X
            const markAsRead = async () => {
                const { error } = await supabase.from('user_notifications_read').upsert({
                    user_id: user.id,
                    notification_id: firstUnread.id
                });
                if (error) console.error('Error marking as read:', error);
            };
            markAsRead();

        } catch (err) {
            console.error('Error checking latest notification:', err);
        }
    };

    const handleClose = async () => {
        setIsVisible(false);

        // After closing, wait a moment and check for the next unread notification
        // (It is already marked as read in the DB when it was shown)
        setTimeout(() => {
            checkLatestNotification();
        }, 600);
    };

    if (!latestNotification) return null;

    return (
        <NotificationView
            isOpen={isVisible}
            onClose={handleClose}
            title={latestNotification.title}
            content={latestNotification.content_html}
            content_type={latestNotification.content_type}
            image_url={latestNotification.image_url}
            created_at={latestNotification.created_at}
            short_description={latestNotification.short_description}
            show_minimal={latestNotification.show_minimal}
            button_label={latestNotification.button_label}
            link_url={latestNotification.link_url}
            link_type={latestNotification.link_type}
        />
    );
}
