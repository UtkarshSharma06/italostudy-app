import { Navigate } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { Loader2 } from "lucide-react";

export default function AdminRoute({ children }: { children: React.ReactNode }) {
    const { user, profile, loading } = useAuth();

    if (loading) {
        return (
            <div className="h-screen w-full flex items-center justify-center bg-slate-50 dark:bg-black">
                <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
            </div>
        );
    }

    // Access is determined solely by the role column in the profiles table (server-side).
    // To grant admin access: set role = 'admin' or 'sub_admin' in the Supabase profiles table.
    // Do NOT add email checks here — email lists in frontend code are exposed in the JS bundle.
    const isAdminRole = profile?.role === 'admin' || profile?.role === 'sub_admin';

    if (!user || !isAdminRole) {
        return <Navigate to="/404" replace />;
    }

    return <>{children}</>;
}

