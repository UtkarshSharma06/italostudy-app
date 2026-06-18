import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';

interface Enrollment {
    id: string;
    course_id: string;
    expires_at: string;
    purchased_at: string;
    amount_paid_eur: number;
    status: string;
}

interface UseCourseAccessReturn {
    hasAccess: boolean;
    enrollment: Enrollment | null;
    isLoading: boolean;
    refetch: () => void;
}

export function useCourseAccess(courseId: string | undefined): UseCourseAccessReturn {
    const { user } = useAuth() as any;
    const [hasAccess, setHasAccess] = useState(false);
    const [enrollment, setEnrollment] = useState<Enrollment | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    const check = async () => {
        if (!user || !courseId) { setIsLoading(false); return; }
        setIsLoading(true);
        // cast to `any` — new tables not in generated types yet; will resolve after migration + type regen
        const { data } = await (supabase as any)
            .from('course_enrollments')
            .select('*')
            .eq('user_id', user.id)
            .eq('course_id', courseId)
            .eq('status', 'active')
            .gt('expires_at', new Date().toISOString())
            .maybeSingle();
        setEnrollment(data as any || null);
        setHasAccess(!!data);
        setIsLoading(false);
    };

    useEffect(() => { check(); }, [user?.id, courseId]);

    return { hasAccess, enrollment, isLoading, refetch: check };
}
