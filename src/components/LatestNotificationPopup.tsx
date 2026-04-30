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
            const subscription = supabase
                .channel('public:site_notifications_popup')
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
                subscription.unsubscribe();
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

            const latest = filtered[0];

            // 2. Strict Logic: Check if we've already shown THIS specific notification in this session
            // This prevents annoying the user if they navigate between pages, 
            // but ensures they see EVERY new notification at least once after it is issued.
            const sessionShownKey = `shown_notif_${latest.id}`;
            const sessionShown = sessionStorage.getItem(sessionShownKey);
            if (sessionShown) return;

            // 3. Persistent Logic: Check if the user has EVER read this specific notification in the DB
            const { data: readStatus } = await supabase
                .from('user_notifications_read')
                .select('*')
                .eq('user_id', user.id)
                .eq('notification_id', latest.id)
                .maybeSingle();

            if (!readStatus) {
                // Not read yet! Show the popup
                setLatestNotification(latest);
                setIsVisible(true);
                // Mark as shown in this session ONLY for this specific ID
                sessionStorage.setItem(sessionShownKey, 'true');
            }
        } catch (err) {
            console.error('Error checking latest notification:', err);
        }
    };

    const handleClose = async () => {
        setIsVisible(false);

        // Mark as read when dismissed to persist across sessions/devices
        if (latestNotification && user) {
            try {
                const { error } = await supabase.from('user_notifications_read').upsert({
                    user_id: user.id,
                    notification_id: latestNotification.id
                });

                if (error) throw error;
            } catch (err) {
                console.error('Error marking notification as read:', err);
            }
        }
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
