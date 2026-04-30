/**
 * useDashboardPrefetch
 *
 * Starts fetching the critical Stage 1 dashboard data immediately after
 * a user is authenticated — before they even navigate to /dashboard.
 *
 * The data is stored in a module-level singleton cache so the Dashboard
 * component can consume it instantly on first render, eliminating the
 * loading state for returning users.
 *
 * Architecture:
 *  - Fires 4 parallel Supabase queries (same as Dashboard Stage 1)
 *  - Stores results in a shared WeakMap-style module cache keyed by userId
 *  - Dashboard reads from cache first, then refetches in background
 *  - Cache expires after 5 minutes to prevent stale data
 */

import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

// ─── Module-level Cache ───────────────────────────────────────────────────────
// Lives outside React — survives re-renders and navigation between pages.
interface DashboardCacheEntry {
  userId: string;
  examId: string;
  fetchedAt: number;
  tests: any[] | null;
  practiceResponses: any[] | null;
  mockSubmissions: any[] | null;
  learningProgress: any[] | null;
}

const CACHE_TTL_MS = 1000 * 60 * 5; // 5 minutes

let _cache: DashboardCacheEntry | null = null;

/**
 * Read the prefetched dashboard data from cache.
 * Returns null if cache is empty, stale, or for a different user/exam.
 */
export function readDashboardCache(
  userId: string,
  examId: string
): Omit<DashboardCacheEntry, 'userId' | 'examId' | 'fetchedAt'> | null {
  if (!_cache) return null;
  if (_cache.userId !== userId || _cache.examId !== examId) return null;
  if (Date.now() - _cache.fetchedAt > CACHE_TTL_MS) {
    _cache = null;
    return null;
  }
  return {
    tests: _cache.tests,
    practiceResponses: _cache.practiceResponses,
    mockSubmissions: _cache.mockSubmissions,
    learningProgress: _cache.learningProgress,
  };
}

/**
 * Invalidate the cache. Call this after any mutation (test finished, profile updated)
 * or when the user logs out.
 */
export function invalidateDashboardCache() {
  _cache = null;
}

/**
 * Manually update the cache with fresh data. 
 * Use this in the Dashboard component after it performs a full refresh.
 */
export function writeDashboardCache(userId: string, examId: string, data: Partial<Omit<DashboardCacheEntry, 'userId' | 'examId' | 'fetchedAt'>>) {
  _cache = {
    userId,
    examId,
    fetchedAt: Date.now(),
    tests: data.tests ?? _cache?.tests ?? null,
    practiceResponses: data.practiceResponses ?? _cache?.practiceResponses ?? null,
    mockSubmissions: data.mockSubmissions ?? _cache?.mockSubmissions ?? null,
    learningProgress: data.learningProgress ?? _cache?.learningProgress ?? null,
  };
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

interface UseDashboardPrefetchArgs {
  userId: string | undefined;
  examId: string | undefined;
  enabled?: boolean;
}

export function useDashboardPrefetch({
  userId,
  examId,
  enabled = true,
}: UseDashboardPrefetchArgs) {
  const hasPrefetched = useRef(false);

  useEffect(() => {
    if (!enabled || !userId || !examId) return;
    if (hasPrefetched.current) return;

    // Don't refetch if we already have a valid cache for this user/exam
    if (readDashboardCache(userId, examId)) return;

    hasPrefetched.current = true;

    const prefetch = async () => {
      try {
        // Fire all 4 Stage 1 queries in parallel — exactly mirrors Dashboard.loadAllDashboardData Stage 1
        const [testsRes, practiceRes, mockRes, learningRes] = await Promise.all([
          (supabase as any)
            .from('tests')
            .select('total_questions, correct_answers, created_at, test_type, status, is_mock')
            .eq('exam_type', examId)
            .eq('user_id', userId),

          (supabase as any)
            .from('user_practice_responses')
            .select('subject, is_correct, question_id')
            .eq('user_id', userId)
            .eq('exam_type', examId),

          supabase
            .from('mock_exam_submissions')
            .select('id')
            .eq('user_id', userId),

          supabase
            .from('learning_progress')
            .select('last_accessed_at')
            .eq('user_id', userId),
        ]);

        // Store in module cache
        _cache = {
          userId,
          examId,
          fetchedAt: Date.now(),
          tests: testsRes.data ?? null,
          practiceResponses: practiceRes.data ?? null,
          mockSubmissions: mockRes.data ?? null,
          learningProgress: learningRes.data ?? null,
        };
      } catch (err) {
        // Silent fail — Dashboard will fetch normally on arrival
        console.warn('[DashboardPrefetch] Prefetch failed silently:', err);
      }
    };

    // Slight delay so it doesn't compete with the initial auth render
    const timer = setTimeout(prefetch, 800);
    return () => clearTimeout(timer);
  }, [userId, examId, enabled]);
}

export default useDashboardPrefetch;
