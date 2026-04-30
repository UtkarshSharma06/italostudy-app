import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { Capacitor } from '@capacitor/core';
import { Browser } from '@capacitor/browser';
import { invalidateDashboardCache } from '@/hooks/useDashboardPrefetch';

interface AuthContextType {
  user: User | null;
  profile: any | null;
  session: Session | null;
  loading: boolean;
  signUp: (email: string, password: string, displayName?: string) => Promise<{ data: any; error: Error | null }>;
  signIn: (email: string, password: string) => Promise<{ data: any; error: Error | null }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  syncCart: (newCart?: any[]) => Promise<void>;
  signInWithGoogle: (redirectTo?: string) => Promise<{ error: Error | null }>;
  resetPassword: (email: string) => Promise<{ error: Error | null }>;
  mfa: {
    enroll: () => Promise<{ data: any; error: any }>;
    challengeAndVerify: (factorId: string, code: string) => Promise<{ error: any }>;
    unenroll: (factorId: string) => Promise<{ error: any }>;
    listFactors: () => Promise<{ data: any; error: any }>;
    getAAL: () => Promise<{ data: any; error: any }>;
  };
  aal: string | null;
  hasMFA: boolean;
  allowedTabs: string[];
  permissions: {
    can_edit: boolean;
    can_delete: boolean;
    can_export: boolean;
  };
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<any | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [aal, setAal] = useState<string | null>(null);
  const [hasMFA, setHasMFA] = useState(false);
  const [allowedTabs, setAllowedTabs] = useState<string[]>([]);
  const [permissions, setPermissions] = useState({
    can_edit: false,
    can_delete: false,
    can_export: false
  });

  // ─── Profile Caching Logic ──────────────────────────────────────────────────
  // Cache the profile in localStorage to allow instant UI hydration on revisit.
  const PROFILE_CACHE_KEY = 'italostudy_auth_profile_v1';
  
  const writeProfileCache = (data: any) => {
    try {
      if (data) localStorage.setItem(PROFILE_CACHE_KEY, JSON.stringify(data));
      else localStorage.removeItem(PROFILE_CACHE_KEY);
    } catch { /* silent fail */ }
  };

  const readProfileCache = () => {
    try {
      const raw = localStorage.getItem(PROFILE_CACHE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch { return null; }
  };

  useEffect(() => {
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);

        // Cross-domain session detection for marketing site
        const domain = window.location.hostname.includes('italostudy.com') ? '.italostudy.com' : window.location.hostname;
        if (session?.user) {
          document.cookie = `italostudy_logged_in=true; path=/; domain=${domain}; max-age=31536000; SameSite=Lax`;
        } else if (event === 'SIGNED_OUT') {
          document.cookie = `italostudy_logged_in=; path=/; domain=${domain}; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax`;
        }

        if (session?.user) {
          fetchProfile(session.user.id);
          updateAALStatus();
        } else {
          setProfile(null);
          setAllowedTabs([]);
          setPermissions({ can_edit: false, can_delete: false, can_export: false });
          setLoading(false);
        }
      }
    );

    // Initial check: Stale-While-Revalidate pattern
    // If cached profile exists → set loading=false instantly, refresh in background
    // If no cache → wait for fresh fetch (first-time user or cleared cache)
    supabase.auth.getSession().then(async ({ data: { session: initialSession } }) => {
      setSession(initialSession);
      const initialUser = initialSession?.user ?? null;
      setUser(initialUser);

      if (initialUser) {
        const cached = readProfileCache();

        if (cached && cached.id === initialUser.id) {
          // ✅ Cache HIT: hydrate instantly, unlock UI, refresh silently in background
          setProfile(cached);
          setLoading(false); // ← skeleton disappears immediately for returning users

          // Background revalidation — does NOT block UI
          Promise.all([
            fetchProfile(initialUser.id),
            updateAALStatus(),
          ]);
        } else {
          // ❌ Cache MISS: must wait for fresh data (first load or cleared cache)
          await Promise.all([
            fetchProfile(initialUser.id),
            updateAALStatus(),
          ]);
          setLoading(false);
        }
      } else {
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, display_name, first_name, last_name, username, email, avatar_url, selected_exam, subscription_tier, selected_plan, is_banned, created_at, role, phone_number, study_hours, target_score, telegram_verification_token, telegram_chat_id, subscription_expiry_date')
        .eq('id', userId)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error("Network or Auth error fetching profile:", error);
        return;
      }

      if (data) {
        writeProfileCache(data);
        if ((data as any).is_banned) {
          await supabase.auth.signOut();
          setProfile(null);
          setUser(null);
          setSession(null);
          setAllowedTabs([]);
          setPermissions({ can_edit: false, can_delete: false, can_export: false });
          window.location.href = '/auth?banned=true';
          return;
        }

        // Fetch admin permissions if sub_admin or admin
        if (data.role === 'admin' || data.role === 'sub_admin') {
          const { data: permData } = await supabase
            .from('admin_permissions')
            .select('allowed_tabs, permissions')
            .eq('user_id', userId)
            .maybeSingle();

          if (permData) {
            setAllowedTabs(permData.allowed_tabs || []);
            if (permData.permissions) {
              setPermissions(permData.permissions as any);
            }
          }
        }

        // Auto-sync Google avatar if missing
        const { data: { user: authUser } } = await supabase.auth.getUser();

        // Auto-generate Telegram verification token if missing
        if (!data.telegram_verification_token) {
          const newToken = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
          await supabase.from('profiles').update({ telegram_verification_token: newToken }).eq('id', userId);
          data.telegram_verification_token = newToken;
        }

        // Sync Cart from Cloud to Local on login/refresh
        await syncCart((data as any).cart || []);

        setProfile(data);
      } else {
        // Handle case where profile is not found (deleted)
        await supabase.auth.signOut();
        setProfile(null);
        setUser(null);
        setSession(null);
        setAllowedTabs([]);
        setPermissions({ can_edit: false, can_delete: false, can_export: false });
        window.location.href = '/auth?deleted=true';
      }
    } catch (error) {
      console.error("Error fetching profile:", error);
    }
  };

  // Realtime Profile Updates
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('profile_changes')
      .on(
        'postgres_changes',
        {
          event: '*', // Listen for ALL events (UPDATE, DELETE, etc.)
          schema: 'public',
          table: 'profiles',
          filter: `id=eq.${user.id}`
        },
        async (payload: any) => {
          if (payload.eventType === 'DELETE' || payload.new?.is_banned) {
            const redirectParams = payload.eventType === 'DELETE' ? 'deleted=true' : 'banned=true';
            
            supabase.auth.signOut().then(() => {
              setProfile(null);
              setUser(null);
              setSession(null);
              setAllowedTabs([]);
              setPermissions({ can_edit: false, can_delete: false, can_export: false });
              window.location.href = `/auth?${redirectParams}`;
            });
          } else {
            setProfile(payload.new);
            // Refresh permissions if role changed
            if (payload.new.role === 'sub_admin' || payload.new.role === 'admin') {
              const { data: permData } = await supabase
                .from('admin_permissions')
                .select('allowed_tabs, permissions')
                .eq('user_id', user.id)
                .maybeSingle();

              if (permData) {
                setAllowedTabs(permData.allowed_tabs || []);
                if (permData.permissions) {
                  setPermissions(permData.permissions as any);
                }
              }
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const syncCart = async (newCart?: any[]) => {
    try {
      if (!user) return;
      
      const CART_KEY = 'italostudy_cart';
      
      if (newCart) {
        // Direct update: set both local and cloud to this specific cart
        console.log("🛒 Syncing local changes to cloud...");
        localStorage.setItem(CART_KEY, JSON.stringify(newCart));
        await (supabase as any).from('profiles').update({ cart: newCart }).eq('id', user.id);
        window.dispatchEvent(new Event('cart-updated'));
        return;
      }

      // Merge Logic (when no newCart is passed, e.g. on login)
      const localCartRaw = localStorage.getItem(CART_KEY);
      const localCart = localCartRaw ? JSON.parse(localCartRaw) : [];
      
      // Get latest cloud cart if not provided in refreshProfile
      const { data: profileData } = await (supabase as any).from('profiles').select('cart').eq('id', user.id).single();
      const cloudCart = (profileData as any)?.cart || [];

      if (!Array.isArray(localCart)) return;

      // Merge local cart into cloud cart
      let mergedCart = [...cloudCart];
      let hasChanges = false;

      localCart.forEach((localItem: any) => {
        const existingIdx = mergedCart.findIndex((cloudItem: any) => cloudItem.id === localItem.id);
        if (existingIdx > -1) {
          if (localItem.quantity > mergedCart[existingIdx].quantity) {
            mergedCart[existingIdx].quantity = localItem.quantity;
            hasChanges = true;
          }
        } else {
          mergedCart.push(localItem);
          hasChanges = true;
        }
      });

      if (hasChanges) {
        console.log("🛒 Merging guest cart into cloud account...");
        await (supabase as any).from('profiles').update({ cart: mergedCart }).eq('id', user.id);
      }

      localStorage.setItem(CART_KEY, JSON.stringify(mergedCart));
      window.dispatchEvent(new Event('cart-updated'));
    } catch (err) {
      console.error("Cart Sync Error:", err);
    }
  };

  const updateAALStatus = async () => {
    const { data: aalData } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
    const { data: factorsData } = await supabase.auth.mfa.listFactors();

    setAal(aalData?.currentLevel ?? null);
    setHasMFA(factorsData?.all?.some(f => f.status === 'verified') ?? false);
  };

  const signUp = async (email: string, password: string, displayName?: string) => {
    const redirectUrl = `${window.location.origin}/`;

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: {
          display_name: displayName,
        },
      },
    });

    return { data, error: error as Error | null };
  };

  const signIn = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    return { data, error: error as Error | null };
  };

  const signOut = async () => {
    invalidateDashboardCache(); // Clear prefetch cache before sign-out
    await supabase.auth.signOut();
    setProfile(null);
    setUser(null);
    setSession(null);
    setAllowedTabs([]);
    setPermissions({ can_edit: false, can_delete: false, can_export: false });
  };

  const signInWithGoogle = async (redirectTo?: string) => {
    const isNative = Capacitor.isNativePlatform();

    if (isNative) {
      try {
        const { GoogleAuth } = await import('@codetrix-studio/capacitor-google-auth');
        const googleUser = await GoogleAuth.signIn();

        if (googleUser && googleUser.authentication.idToken) {
          const { data, error } = await supabase.auth.signInWithIdToken({
            provider: 'google',
            token: googleUser.authentication.idToken,
          });
          if (!error) return { error: null };
          console.error("Native Token Sign-In failed:", error);
        }
      } catch (err: any) {
        console.warn("Native Google Auth Error/Cancelled, trying browser flow:", err);
        if (err.message?.includes("cancelled") || err.code === "CANCELLED") {
          return { error: null };
        }
      }
    }
    // Web Browser Flow (or Fallback for Native)
    const finalRedirect = isNative ? 'com.italostudy.app://google-auth' : (redirectTo || `${window.location.origin}/dashboard`);

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: finalRedirect,
        skipBrowserRedirect: false
      }
    });

    return { error: error as Error | null };
  };
  const resetPassword = async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    return { error: error as Error | null };
  };

  const mfa = {
    enroll: async () => {
      const { data, error } = await supabase.auth.mfa.enroll({
        factorType: 'totp'
      });
      return { data, error };
    },
    challengeAndVerify: async (factorId: string, code: string) => {
      const { data: challengeData, error: challengeError } = await supabase.auth.mfa.challenge({
        factorId
      });
      if (challengeError) return { error: challengeError };

      const { error: verifyError } = await supabase.auth.mfa.verify({
        factorId,
        challengeId: challengeData.id,
        code
      });
      return { error: verifyError };
    },
    unenroll: async (factorId: string) => {
      const { error } = await supabase.auth.mfa.unenroll({
        factorId
      });
      return { error };
    },
    listFactors: async () => {
      const { data, error } = await supabase.auth.mfa.listFactors();
      return { data, error };
    },
    getAAL: async () => {
      const { data, error } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
      return { data, error };
    }
  };

  return (
    <AuthContext.Provider value={{
      user,
      profile,
      session,
      loading,
      signUp,
      signIn,
      signOut,
      refreshProfile: () => fetchProfile(user?.id ?? ''),
      syncCart,
      signInWithGoogle,
      resetPassword,
      mfa,
      aal,
      hasMFA,
      allowedTabs,
      permissions
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
