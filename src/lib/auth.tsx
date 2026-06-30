import { createContext, useContext, useEffect, useState, useRef, ReactNode } from 'react';
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

  // ─── Guard: prevent double fetchProfile ──────────────────────────────────────
  // Both getSession() and onAuthStateChange fire on mount. Without this flag,
  // fetchProfile() runs twice in parallel causing 2 unnecessary re-renders.
  const profileFetchInFlight = useRef<string | null>(null);

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
          // FIX: Never await inside onAuthStateChange — it holds a Supabase
          // navigator lock. Blocking here causes a 5s lock timeout that
          // prevents getSession() from resolving, leaving auth.loading=true
          // and the entire dashboard stuck on skeletons.
          if (profileFetchInFlight.current !== session.user.id) {
            fetchProfile(session.user.id);
          }
        } else {
          profileFetchInFlight.current = null;
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
        // Mark that getSession() has claimed the fetch for this user.
        // onAuthStateChange (INITIAL_SESSION) will see this and skip its own fetch.
        profileFetchInFlight.current = initialUser.id;

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
          // ❌ Cache MISS: must wait for fresh profile (first load or cleared cache)
          // ✅ FIX: Only await fetchProfile — updateAALStatus does 2 sequential
          // lock-acquiring MFA calls that slow down login by 1-3s. Fire it in background.
          await fetchProfile(initialUser.id);
          setLoading(false);
          // MFA status loads in background — doesn't block dashboard render
          updateAALStatus();
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
        .select('id, display_name, first_name, last_name, username, email, avatar_url, selected_exam, subscription_tier, selected_plan, is_banned, created_at, role, phone_number, study_hours, target_score, telegram_verification_token, telegram_chat_id, subscription_expiry_date, cart')
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

        // FIX #3: Telegram token generation is non-blocking — fire-and-forget.
        // Previously this was an awaited write in the hot login path (+200ms).
        if (!data.telegram_verification_token) {
          const newToken = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
          data.telegram_verification_token = newToken; // Update local data immediately
          // Write to DB in the background — does NOT block profile rendering
          Promise.resolve(
            supabase.from('profiles').update({ telegram_verification_token: newToken }).eq('id', userId)
          ).then(() => { /* silent */ }).catch(() => { /* silent */ });
        }

        // FIX #7: Use cart already fetched in the SELECT above.
        // Previously syncCart() did an EXTRA supabase.from('profiles').select('cart')
        // which was a completely redundant round-trip.
        syncCartFromCloud((data as any).cart || []);

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
    } finally {
      // Always clear the in-flight lock so future explicit refreshes work
      profileFetchInFlight.current = null;
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
            // Guard against store-side writes wiping the subscription plan.
            // The store's syncCart() writes to profiles.cart which triggers this
            // listener. We must not let a cart update overwrite subscription fields.
            const newData = payload.new;
            const SUBSCRIPTION_FIELDS = [
              'selected_plan', 'subscription_tier', 'subscription_expiry_date', 'is_banned', 'role'
            ];
            const subscriptionChanged = SUBSCRIPTION_FIELDS.some(
              (f) => newData[f] !== profile?.[f]
            );

            if (subscriptionChanged) {
              // Full replace — a real subscription change happened
              setProfile(newData);

              // Fire premium animation if user was just upgraded from explorer
              const oldPlan = profile?.selected_plan || 'explorer';
              const newPlan = newData?.selected_plan;
              if (oldPlan === 'explorer' && newPlan && newPlan !== 'explorer') {
                window.dispatchEvent(new Event('premium-upgrade-success'));
              }
            } else {
              // Selective merge — only safe non-subscription fields changed (e.g., cart)
              setProfile((prev: any) => prev ? { ...prev, ...newData } : newData);
            }

            // Refresh permissions if role changed
            if (newData.role === 'sub_admin' || newData.role === 'admin') {
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

  // ─── FIX #7: Cart sync split into two functions ──────────────────────────────
  // syncCartFromCloud: called on login with already-fetched cloudCart data.
  //   Merges with localStorage without doing an extra Supabase SELECT.
  // syncCart: the original public API for components to push cart changes to cloud.
  const syncCartFromCloud = (cloudCart: any[]) => {
    try {
      const CART_KEY = 'italostudy_cart';
      const localCartRaw = localStorage.getItem(CART_KEY);
      const localCart = localCartRaw ? JSON.parse(localCartRaw) : [];

      if (!Array.isArray(localCart)) {
        localStorage.setItem(CART_KEY, JSON.stringify(cloudCart));
        window.dispatchEvent(new Event('cart-updated'));
        return;
      }

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

      localStorage.setItem(CART_KEY, JSON.stringify(mergedCart));
      window.dispatchEvent(new Event('cart-updated'));

      // Push merge result to cloud only if something changed — fire-and-forget
      if (hasChanges && user) {
        (supabase as any).from('profiles').update({ cart: mergedCart }).eq('id', user.id)
          .then(() => { /* silent */ }).catch(() => { /* silent */ });
      }
    } catch (err) {
      console.error("Cart Sync Error:", err);
    }
  };

  const syncCart = async (newCart?: any[]) => {
    try {
      if (!user) return;

      const CART_KEY = 'italostudy_cart';

      if (newCart) {
        // Direct update: set both local and cloud to this specific cart
        localStorage.setItem(CART_KEY, JSON.stringify(newCart));
        await (supabase as any).from('profiles').update({ cart: newCart }).eq('id', user.id);
        window.dispatchEvent(new Event('cart-updated'));
        return;
      }

      // Merge Logic (manual call with no cart passed — fetch fresh cloud data)
      const localCartRaw = localStorage.getItem(CART_KEY);
      const localCart = localCartRaw ? JSON.parse(localCartRaw) : [];

      const { data: profileData } = await (supabase as any).from('profiles').select('cart').eq('id', user.id).single();
      const cloudCart = (profileData as any)?.cart || [];

      if (!Array.isArray(localCart)) return;

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
        await (supabase as any).from('profiles').update({ cart: mergedCart }).eq('id', user.id);
      }

      localStorage.setItem(CART_KEY, JSON.stringify(mergedCart));
      window.dispatchEvent(new Event('cart-updated'));
    } catch (err) {
      console.error("Cart Sync Error:", err);
    }
  };

  const updateAALStatus = async () => {
    try {
      const { data: aalData } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
      const { data: factorsData } = await supabase.auth.mfa.listFactors();

      setAal(aalData?.currentLevel ?? null);
      setHasMFA(factorsData?.all?.some(f => f.status === 'verified') ?? false);
    } catch (e) {
      // Supabase lock contention — safe to ignore, MFA state will be checked on next action
      console.warn('MFA status check deferred:', (e as Error)?.message);
    }
  };

  const signUp = async (email: string, password: string, displayName?: string) => {
    // On native, redirect confirmation links to the app's custom URL scheme.
    // On web, redirect to the origin so the browser handles it normally.
    const isNative = Capacitor.isNativePlatform();
    const redirectUrl = isNative
      ? 'com.italostudy.app://email-confirm'
      : `${window.location.origin}/`;

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
      // ── Step 1: Try native Google Sign-In (fastest, no browser popup) ──────
      // Uses @codetrix-studio/capacitor-google-auth to get an ID token directly
      // and exchange it with Supabase — zero browser required.
      try {
        const { GoogleAuth } = await import('@codetrix-studio/capacitor-google-auth');
        const googleUser = await GoogleAuth.signIn();

        if (googleUser && googleUser.authentication.idToken) {
          const { error } = await supabase.auth.signInWithIdToken({
            provider: 'google',
            token: googleUser.authentication.idToken,
          });
          if (!error) return { error: null };
          console.error('[Auth] Native token sign-in failed, falling back to browser:', error);
        }
      } catch (err: any) {
        // User cancelled the native picker — do NOT fall through to browser
        if (
          err.message?.includes('cancelled') ||
          err.message?.includes('canceled') ||
          err.code === 'CANCELLED' ||
          err.code === 12501  // Google Sign-In cancelled error code
        ) {
          return { error: null };
        }
        // Any other error → fall through to browser OAuth
        console.warn('[Auth] Native Google Auth error, falling back to browser OAuth:', err);
      }

      // ── Step 2: Browser-based OAuth fallback (PKCE) ───────────────────────
      // CRITICAL: skipBrowserRedirect: true — we get the URL back and open it
      // ourselves via @capacitor/browser so the deep link com.italostudy.app://
      // callback is captured by the app (not lost in the system browser).
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: 'com.italostudy.app://google-auth',
          skipBrowserRedirect: true,  // ← Don't let Supabase open the browser
        }
      });

      if (error) return { error: error as Error };

      // Open the OAuth URL in the Capacitor in-app browser
      if (data?.url) {
        await Browser.open({ url: data.url, windowName: '_self' });
      }

      return { error: null };
    }

    // ── Web browser flow (desktop + mobile web) ───────────────────────────────
    // FIX: Always use /auth as the OAuth callback destination.
    // The /dashboard route is a <Navigate to="/" replace /> which strips the
    // PKCE ?code= query param before Supabase can exchange it.
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth`,
        skipBrowserRedirect: false,
      }
    });

    return { error: error as Error | null };
  };
  const resetPassword = async (email: string) => {
    const isNative = Capacitor.isNativePlatform();
    const redirectUrl = isNative
      ? 'com.italostudy.app://reset-password'
      : `${window.location.origin}/reset-password`;
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: redirectUrl,
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
