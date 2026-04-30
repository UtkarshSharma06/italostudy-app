import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { toast } from "sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Analytics as VercelAnalytics } from "@vercel/analytics/react";
import { SpeedInsights as VercelSpeedInsights } from "@vercel/speed-insights/react";
import { Capacitor } from '@capacitor/core';
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, HashRouter, Routes, Route, Navigate, useNavigate } from "react-router-dom";
import { AuthProvider } from "@/lib/auth";
import { ThemeProvider, useTheme } from "next-themes";
import { lazy, Suspense, useEffect, useState } from "react";
import { LiveEditProvider } from "@/contexts/LiveEditContext";
import { useRef } from "react";
import SecurityEnforcer from "@/components/SecurityEnforcer";
import { getSkeletonForPath, LayoutSkeleton } from '@/lib/skeletons';
import { Helmet } from "react-helmet-async";
import { useTranslation } from "react-i18next";

import { ExamProvider } from "@/context/ExamContext";
import { AIProvider } from "@/context/AIContext";
import { isPublicRoute as checkPublicRoute } from "@/lib/routes";


import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import NetworkStatus from "@/components/NetworkStatus";
import CookieConsent from "@/components/CookieConsent";

import ProtectedRoute from "@/components/auth/ProtectedRoute";
import { Device } from '@capacitor/device';
import { StatusBar, Style } from '@capacitor/status-bar';
import { App as CapApp } from '@capacitor/app';
import { Preferences } from '@capacitor/preferences';

// Helper to check for cached profile without triggering full Auth hook
const readProfileCache = () => {
  try {
    const raw = localStorage.getItem('italostudy_auth_profile_v1');
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
};

import { APKOnboarding } from "@/mobile/components/APKOnboarding";
import { PricingProvider, usePricing } from "@/context/PricingContext";
import { usePlanAccess } from "@/hooks/usePlanAccess";
import { SubscriptionLockout } from "@/components/SubscriptionLockout";
import GlobalErrorBoundary from "@/components/GlobalErrorBoundary";
import { useDashboardPrefetch } from "@/hooks/useDashboardPrefetch";
// Delayed Import for better TTI
const PricingModal = lazy(() => import("@/components/PricingModal"));

// Lazy Load Pages
const Auth = lazy(() => import("./pages/Auth"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Subjects = lazy(() => import("./pages/Subjects"));
const Practice = lazy(() => import("./pages/Practice"));
const MockExams = lazy(() => import("./pages/MockExams"));
const Analytics = lazy(() => import("./pages/Analytics"));
const Labs = lazy(() => import("./pages/Labs"));
const Test = lazy(() => import("./pages/Test"));
const Results = lazy(() => import("./pages/Results"));
const History = lazy(() => import("./pages/History"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const Bookmarks = lazy(() => import("./pages/Bookmarks"));

const InternationalMockWaitingRoom = lazy(() => import("./pages/InternationalMockWaitingRoom"));
const NotFound = lazy(() => import("./pages/NotFound"));
const Pricing = lazy(() => import("./pages/Pricing"));
const Learning = lazy(() => import("./pages/Learning"));
const StartTest = lazy(() => import("./pages/StartTest"));
const SpeakingLobby = lazy(() => import("./pages/speaking/SpeakingLobby"));
const SpeakingSession = lazy(() => import("./pages/speaking/SpeakingSession"));
const ReadingTest = lazy(() => import("./pages/reading/ReadingTest"));
const ReadingResult = lazy(() => import("./pages/reading/ReadingResult"));
const ListeningTest = lazy(() => import("./pages/listening/ListeningTest"));
const ListeningResult = lazy(() => import("./pages/listening/ListeningResult"));
const WritingTest = lazy(() => import("./pages/writing/WritingTest"));
const WritingHistory = lazy(() => import("./pages/writing/WritingHistory"));
const SpeakingHistory = lazy(() => import("./pages/speaking/SpeakingHistory"));
const ReadingHistory = lazy(() => import("./pages/reading/ReadingHistory"));
const ListeningHistory = lazy(() => import("./pages/listening/ListeningHistory"));
const Settings = lazy(() => import("./pages/Settings"));
const IELTSFlow = lazy(() => import("./pages/IELTSFlow"));
const MockExamResults = lazy(() => import("./pages/MockExamResults"));
const MockGuidelines = lazy(() => import("./pages/MockGuidelines"));
const Community = lazy(() => import("./pages/Community"));
const Onboarding = lazy(() => import("./pages/Onboarding"));
const Concierge = lazy(() => import("./pages/Concierge"));
const ConsultantDashboard = lazy(() => import("./pages/ConsultantDashboard"));
const ConsultantActivation = lazy(() => import("./pages/ConsultantActivation"));
const ConsultantApply = lazy(() => import("./pages/ConsultantApply"));
const ConciergeApply = lazy(() => import("./pages/ConciergeApply"));
const ConciergeUpgrade = lazy(() => import("./pages/ConciergeUpgrade"));
const CommunityUpgrade = lazy(() => import("./pages/CommunityUpgrade"));
const ApplicationDetail = lazy(() => import("./pages/ApplicationDetail"));
const StudentApplicationStatus = lazy(() => import("./pages/StudentApplicationStatus"));
const ConsultantApplicationReview = lazy(() => import("./pages/ConsultantApplicationReview"));
const ConsultantApplicationChat = lazy(() => import("./pages/ConsultantApplicationChat"));
const ConsultantApplicationOffer = lazy(() => import("./pages/ConsultantApplicationOffer"));
const StudentProfile = lazy(() => import("./pages/StudentProfile"));
const DownloadApp = lazy(() => import("./pages/DownloadApp"));
const Billing = lazy(() => import("./pages/Billing"));
const DetailedAnalysis = lazy(() => import("./pages/DetailedAnalysis"));
const StudyPlanner = lazy(() => import("./pages/StudyPlanner"));
const PaymentCallback = lazy(() => import("./pages/PaymentCallback"));

const MobileBilling = lazy(() => import("@/mobile/pages/MobileBilling"));
const MobileDetailedAnalysis = lazy(() => import("@/mobile/pages/MobileDetailedAnalysis"));


// Store Cluster removed (externalized)


// Authority clusters removed (moved to marketing site)


const AnnouncementBar = lazy(() => import("./components/AnnouncementBar"));

const MobileAuth = lazy(() => import("./mobile/pages/MobileAuth"));
const MobileDashboard = lazy(() => import("./mobile/pages/MobileDashboard"));
const MobilePractice = lazy(() => import("./mobile/pages/MobilePractice"));

const MobileResults = lazy(() => import("./mobile/pages/MobileResults"));
const MobileStartTest = lazy(() => import("./mobile/pages/MobileStartTest"));
const MobileOnboarding = lazy(() => import("./mobile/pages/MobileOnboarding"));
const MobilePricing = lazy(() => import("./mobile/pages/MobilePricing"));
const MobileSubjects = lazy(() => import("./mobile/pages/MobileSubjects"));
const MobileLearning = lazy(() => import("./mobile/pages/MobileLearning"));
const MobileCommunity = lazy(() => import("./mobile/pages/MobileCommunity"));
const MobileCommunityUpgrade = lazy(() => import("./mobile/pages/MobileCommunityUpgrade"));
const MobileSettings = lazy(() => import("./mobile/pages/MobileSettings"));
const MobileTest = lazy(() => import("./mobile/pages/MobileTest"));
const MobileHistory = lazy(() => import("./mobile/pages/MobileHistory"));
const MobileMockExams = lazy(() => import("./mobile/pages/MobileMockExams"));
const MobileLabs = lazy(() => import("./mobile/pages/MobileLabs"));
const MobileConcierge = lazy(() => import("./mobile/pages/MobileConcierge"));
const MobileConciergeApply = lazy(() => import("./mobile/pages/MobileConciergeApply"));
const MobileConciergeUpgrade = lazy(() => import("./mobile/pages/MobileConciergeUpgrade"));
const MobileStudentApplicationStatus = lazy(() => import("./mobile/pages/MobileStudentApplicationStatus"));

const MobileMockWaitingRoom = lazy(() => import("./mobile/pages/MobileMockWaitingRoom"));
const MobileSectionedTest = lazy(() => import("./mobile/pages/MobileSectionedTest"));
const MobileStudentProfile = lazy(() => import("./mobile/pages/MobileStudentProfile"));
const MobileNotifications = lazy(() => import("./mobile/pages/MobileNotifications"));
// Mobile Store removed (externalized)

const MobileMockGuidelines = lazy(() => import("./mobile/pages/MobileMockGuidelines"));

const PublicSolutions = lazy(() => import("./pages/PublicSolutions"));

const MobileBookmarks = lazy(() => import("./mobile/pages/MobileBookmarks"));
const MobileLayout = lazy(() => import("./mobile/components/MobileLayout"));
const MobileIELTSPlayer = lazy(() => import("./mobile/pages/MobileIELTSPlayer"));
const MobileSpeakingLobby = lazy(() => import("./mobile/pages/MobileSpeakingLobby"));
const MobileSpeakingSession = lazy(() => import("./mobile/pages/MobileSpeakingSession"));
import { AppUpdateChecker } from "./mobile/components/AppUpdateChecker";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,            // data is "fresh" for 5 min
      gcTime: 1000 * 60 * 15,             // keep in memory 15 min (was 10)
      retry: 1,
      refetchOnWindowFocus: false,         // don't re-fetch on tab switch
      refetchOnReconnect: 'always',        // always re-fetch on reconnect
      placeholderData: (prev: any) => prev, // show stale data while loading new
    },
  },
});

// Premium Loading Fallback
const PageLoader = () => {
  return (
    <LayoutSkeleton>
      {getSkeletonForPath(window.location.pathname)}
    </LayoutSkeleton>
  );
};

// Computed once at startup — tells the Suspense boundary whether the first
// page load is a public route. If yes, fallback = null (no spinner shown).
// If protected, fallback = <PageLoader /> (skeleton shown).
const isInitialPublic = checkPublicRoute(window.location.pathname);

// Helper to guess if user is logged in before async auth check resolves
const isProbablyAuthenticated = () => {
  try {
    const hasSupabaseToken = Object.keys(localStorage).some(key => key.endsWith('-auth-token'));
    const hasProfileCache = !!localStorage.getItem('italostudy_auth_profile_v1');
    const hasLoggedCookie = document.cookie.includes('italostudy_logged_in=true');
    return hasSupabaseToken || hasProfileCache || hasLoggedCookie;
  } catch { return false; }
};

const initialAuthHint = isProbablyAuthenticated();


const ForceStaticRedirect = () => {
  // In dev mode, the Vite middleware already serves the HTML that boots React,
  // so redirecting would cause an infinite loop. Only redirect in production.
  if (import.meta.env.DEV) return null;
  window.location.replace(window.location.pathname);
  return null;
};

const HardRedirect = () => {
  window.location.replace(window.location.pathname);
  return null;
};

const StatusRedirect = () => {
  useEffect(() => {
    window.location.replace('/status.html');
  }, []);
  return null;
};

const HardRedirectToMarketing = ({ path }: { path: string }) => {
  useEffect(() => {
    const slug = window.location.pathname.split('/').pop();
    const fullPath = (path === 'blog' || path === 'resources') && slug && slug !== path 
      ? `${path}/${slug}` 
      : path;
    window.location.replace(`https://italostudy.com/${fullPath}`);
  }, [path]);
  return null;
};

const HardRedirectToStore = () => {
  useEffect(() => {
    const path = window.location.pathname.replace(/^\/store/, '').replace(/^\/mobile\/store/, '');
    window.location.replace(`https://store.italostudy.com${path}`);
  }, []);
  return null;
};

const HardRedirectToAdmin = () => {
  useEffect(() => {
    const path = window.location.pathname.replace(/^\/admin/, '');
    window.location.replace(`https://admin.italostudy.com${path}`);
  }, []);
  return null;
};

const StaticHtmlWrapper = ({ fileName }: { fileName: string }) => {
  return (
    <div className="fixed inset-0 z-[100] bg-background">
      <iframe 
        src={`/${fileName}`} 
        className="w-full h-full border-none"
        title="Static Content"
      />
    </div>
  );
};

const WebRouter = ({ user, authLoading }: { user: any, authLoading: boolean }) => (
  <Routes>
    {/* Entry Points */}
    <Route path="/" element={
      authLoading ? <PageLoader /> : 
      user ? <ProtectedRoute allowedRoles={['user', 'admin', 'sub_admin']}><Dashboard /></ProtectedRoute> : 
      <Navigate to="/auth" replace />
    } />
    <Route path="/dashboard" element={<Navigate to="/" replace />} />
    <Route path="/auth" element={<Auth />} />
    <Route path="/reset-password" element={<ResetPassword />} />
    
    {/* Core Student Features */}
    <Route path="/onboarding" element={<ProtectedRoute allowedRoles={['user', 'admin', 'sub_admin', 'consultant']}><Onboarding /></ProtectedRoute>} />
    <Route path="/dashboard" element={<ProtectedRoute allowedRoles={['user', 'admin', 'sub_admin']}><Dashboard /></ProtectedRoute>} />
    <Route path="/community" element={<ProtectedRoute allowedRoles={['user', 'admin', 'sub_admin', 'consultant']}><Community /></ProtectedRoute>} />
    <Route path="/community/upgrade" element={<ProtectedRoute allowedRoles={['user', 'admin', 'sub_admin', 'consultant']}><CommunityUpgrade /></ProtectedRoute>} />
    <Route path="/subjects" element={<ProtectedRoute allowedRoles={['user', 'admin', 'sub_admin', 'consultant']}><Subjects /></ProtectedRoute>} />
    <Route path="/practice" element={<ProtectedRoute allowedRoles={['user', 'admin', 'sub_admin', 'consultant']}><Practice /></ProtectedRoute>} />
    <Route path="/mock-exams" element={<ProtectedRoute allowedRoles={['user', 'admin', 'sub_admin', 'consultant']}><MockExams /></ProtectedRoute>} />
    <Route path="/analytics" element={<ProtectedRoute allowedRoles={['user', 'admin', 'sub_admin', 'consultant']}><Analytics /></ProtectedRoute>} />
    <Route path="/labs" element={<ProtectedRoute allowedRoles={['user', 'admin', 'sub_admin', 'consultant']}><Labs /></ProtectedRoute>} />
    <Route path="/test/:testId" element={<ProtectedRoute allowedRoles={['user', 'admin', 'sub_admin', 'consultant']}><Test /></ProtectedRoute>} />
    <Route path="/results/:testId" element={<ProtectedRoute allowedRoles={['user', 'admin', 'sub_admin', 'consultant']}><Results /></ProtectedRoute>} />
    <Route path="/history" element={<ProtectedRoute allowedRoles={['user', 'admin', 'sub_admin', 'consultant']}><History /></ProtectedRoute>} />
    <Route path="/settings" element={<ProtectedRoute allowedRoles={['user', 'admin', 'sub_admin', 'consultant']}><Settings /></ProtectedRoute>} />
    <Route path="/billing" element={<ProtectedRoute allowedRoles={['user', 'admin', 'sub_admin', 'consultant']}><Billing /></ProtectedRoute>} />
    <Route path="/bookmarks" element={<ProtectedRoute allowedRoles={['user', 'admin', 'sub_admin', 'consultant']}><Bookmarks /></ProtectedRoute>} />
    <Route path="/study-planner" element={<ProtectedRoute allowedRoles={['user', 'admin', 'sub_admin', 'consultant']}><StudyPlanner /></ProtectedRoute>} />

    {/* Study & Content Cluster */}
    <Route path="/learning" element={<ProtectedRoute allowedRoles={['user', 'admin', 'sub_admin', 'consultant']}><Learning /></ProtectedRoute>} />
    <Route path="/start-test" element={<ProtectedRoute allowedRoles={['user', 'admin', 'sub_admin', 'consultant']}><StartTest /></ProtectedRoute>} />
    
    {/* Marketing Redirects */}
    <Route path="/blog" element={<HardRedirectToMarketing path="blog" />} />
    <Route path="/blog/:slug" element={<HardRedirectToMarketing path="blog" />} />
    <Route path="/resources" element={<HardRedirectToMarketing path="resources" />} />
    <Route path="/resources/:slug" element={<HardRedirectToMarketing path="resources" />} />
    <Route path="/method" element={<HardRedirectToMarketing path="method" />} />
    <Route path="/exams" element={<HardRedirectToMarketing path="exams" />} />
    <Route path="/imat" element={<HardRedirectToMarketing path="imat" />} />
    <Route path="/cent-s" element={<HardRedirectToMarketing path="cent-s" />} />
    <Route path="/contact" element={<HardRedirectToMarketing path="contact" />} />
    <Route path="/about" element={<HardRedirectToMarketing path="about" />} />
    <Route path="/privacy" element={<HardRedirectToMarketing path="privacy" />} />
    <Route path="/terms" element={<HardRedirectToMarketing path="terms" />} />
    <Route path="/refund" element={<HardRedirectToMarketing path="refund" />} />
    
    {/* Exam Experience Cluster */}
    <Route path="/waiting-room/:sessionId" element={<InternationalMockWaitingRoom />} />
    <Route path="/solutions/:sessionId" element={<PublicSolutions />} />
    <Route path="/mock-results/:id" element={<ProtectedRoute allowedRoles={['user', 'admin', 'sub_admin', 'consultant']}><MockExamResults /></ProtectedRoute>} />
    <Route path="/detailed-analysis/:testId" element={<ProtectedRoute allowedRoles={['user', 'admin', 'sub_admin', 'consultant']}><DetailedAnalysis /></ProtectedRoute>} />
    <Route path="/mock-guidelines" element={<ProtectedRoute allowedRoles={['user', 'admin', 'sub_admin', 'consultant']}><MockGuidelines /></ProtectedRoute>} />

    {/* IELTS Cluster */}
    <Route path="/reading/:testId" element={<ProtectedRoute allowedRoles={['user', 'admin', 'sub_admin', 'consultant']}><ReadingTest /></ProtectedRoute>} />
    <Route path="/listening/:testId" element={<ProtectedRoute allowedRoles={['user', 'admin', 'sub_admin', 'consultant']}><ListeningTest /></ProtectedRoute>} />
    <Route path="/writing/:taskId" element={<ProtectedRoute allowedRoles={['user', 'admin', 'sub_admin', 'consultant']}><WritingTest /></ProtectedRoute>} />
    <Route path="/speaking" element={<ProtectedRoute allowedRoles={['user', 'admin', 'sub_admin', 'consultant']}><SpeakingLobby /></ProtectedRoute>} />
    <Route path="/speaking/:sessionId" element={<ProtectedRoute allowedRoles={['user', 'admin', 'sub_admin', 'consultant']}><SpeakingSession /></ProtectedRoute>} />
    <Route path="/ielts-flow/:sessionId" element={<ProtectedRoute allowedRoles={['user', 'admin', 'sub_admin', 'consultant']}><IELTSFlow /></ProtectedRoute>} />

    {/* Store Cluster (Externalized) */}
    <Route path="/store" element={<HardRedirectToStore />} />
    <Route path="/store/*" element={<HardRedirectToStore />} />

    {/* Admin Cluster (Externalized) */}
    <Route path="/admin" element={<HardRedirectToAdmin />} />
    <Route path="/admin/*" element={<HardRedirectToAdmin />} />

    {/* University Application Cluster */}
    <Route path="/apply-university" element={<ProtectedRoute allowedRoles={['user', 'admin', 'sub_admin', 'consultant']}><Concierge /></ProtectedRoute>} />
    <Route path="/apply-university/apply" element={<ProtectedRoute allowedRoles={['user', 'admin', 'sub_admin', 'consultant']}><ConciergeApply /></ProtectedRoute>} />
    <Route path="/apply-university/status/:id" element={<ProtectedRoute allowedRoles={['user', 'admin', 'sub_admin', 'consultant']}><StudentApplicationStatus /></ProtectedRoute>} />
    <Route path="/apply-university/application/:id" element={<ProtectedRoute allowedRoles={['consultant', 'admin', 'sub_admin', 'user']}><ApplicationDetail /></ProtectedRoute>} />
    <Route path="/apply-university/upgrade" element={<ProtectedRoute allowedRoles={['user', 'admin', 'sub_admin', 'consultant']}><ConciergeUpgrade /></ProtectedRoute>} />
    <Route path="/consultant/dashboard" element={<ProtectedRoute allowedRoles={['consultant', 'admin', 'sub_admin']}><ConsultantDashboard /></ProtectedRoute>} />
    <Route path="/consultant/application/:id" element={<ProtectedRoute allowedRoles={['consultant', 'admin', 'sub_admin']}><ConsultantApplicationReview /></ProtectedRoute>} />
    
    <Route path="/student/:id" element={<ProtectedRoute allowedRoles={['user', 'admin', 'sub_admin', 'consultant']}><StudentProfile /></ProtectedRoute>} />
    <Route path="/u/:username" element={<ProtectedRoute allowedRoles={['user', 'admin', 'sub_admin', 'consultant']}><StudentProfile /></ProtectedRoute>} />
    
    {/* Misc */}
    <Route path="/pricing" element={<Pricing />} />
    <Route path="/payment/callback" element={<PaymentCallback />} />
    <Route path="/download-app" element={<DownloadApp />} />
    
    <Route path="*" element={<Navigate to="/" replace />} />
  </Routes>
);

const MobileRouter = ({ user, isNative, authLoading }: { user: any, isNative: boolean, authLoading: boolean }) => {
  return (
    <AppUpdateChecker>
      <Routes>
        <Route path="/" element={
          authLoading ? <PageLoader /> : 
          user ? <Navigate to="/mobile/dashboard" replace /> : <Navigate to="/auth" replace />
        } />
        <Route path="/auth" element={<MobileAuth />} />
        <Route path="/mobile/auth" element={<MobileAuth />} />

        {/* Premium Custom Mobile Pages */}
        <Route path="/mobile/dashboard" element={<ProtectedRoute allowedRoles={['user', 'admin', 'sub_admin']}><MobileDashboard /></ProtectedRoute>} />
        <Route path="/mobile/practice" element={<ProtectedRoute allowedRoles={['user', 'admin', 'sub_admin', 'consultant']}><MobilePractice /></ProtectedRoute>} />
        <Route path="/mobile/analytics" element={<ProtectedRoute allowedRoles={['user', 'admin', 'sub_admin', 'consultant']}><Analytics /></ProtectedRoute>} />
        <Route path="/mobile/settings" element={<ProtectedRoute allowedRoles={['user', 'admin', 'sub_admin', 'consultant']}><MobileSettings /></ProtectedRoute>} />
        <Route path="/mobile/billing" element={<ProtectedRoute allowedRoles={['user', 'admin', 'sub_admin', 'consultant']}><MobileBilling /></ProtectedRoute>} />
        <Route path="/mobile/notifications" element={<ProtectedRoute allowedRoles={['user', 'admin', 'sub_admin', 'consultant']}><MobileNotifications /></ProtectedRoute>} />
        
        {/* Coverage for all other features */}
        <Route path="/resources" element={<HardRedirectToMarketing path="resources" />} />
        <Route path="/resources/:slug" element={<HardRedirectToMarketing path="resources" />} />
        <Route path="/mobile/community" element={<ProtectedRoute allowedRoles={['user', 'admin', 'sub_admin', 'consultant']}><MobileCommunity /></ProtectedRoute>} />
        <Route path="/mobile/community/upgrade" element={<ProtectedRoute allowedRoles={['user', 'admin', 'sub_admin', 'consultant']}><MobileCommunityUpgrade /></ProtectedRoute>} />
        <Route path="/mobile/subjects" element={<ProtectedRoute allowedRoles={['user', 'admin', 'sub_admin', 'consultant']}><MobileSubjects /></ProtectedRoute>} />
        <Route path="/mobile/learning" element={<ProtectedRoute allowedRoles={['user', 'admin', 'sub_admin', 'consultant']}><MobileLearning /></ProtectedRoute>} />
        <Route path="/mobile/mock-exams" element={<ProtectedRoute allowedRoles={['user', 'admin', 'sub_admin', 'consultant']}><MobileMockExams /></ProtectedRoute>} />
        <Route path="/mobile/history" element={<ProtectedRoute allowedRoles={['user', 'admin', 'sub_admin', 'consultant']}><MobileHistory /></ProtectedRoute>} />
        <Route path="/mobile/bookmarks" element={<ProtectedRoute allowedRoles={['user', 'admin', 'sub_admin', 'consultant']}><MobileBookmarks /></ProtectedRoute>} />

        {/* Consultant & University (Mobile Native) */}
        <Route path="/mobile/apply-university" element={<ProtectedRoute allowedRoles={['user', 'admin', 'sub_admin', 'consultant']}><MobileConcierge /></ProtectedRoute>} />
        <Route path="/mobile/apply-university/status/:id" element={<ProtectedRoute allowedRoles={['user', 'admin', 'sub_admin', 'consultant']}><MobileStudentApplicationStatus /></ProtectedRoute>} />
        <Route path="/mobile/apply-university/upgrade" element={<ProtectedRoute allowedRoles={['user', 'admin', 'sub_admin', 'consultant']}><MobileConciergeUpgrade /></ProtectedRoute>} />
        
        {/* Mobile Store native routes (Externalized) */}
        <Route path="/mobile/store" element={<HardRedirectToStore />} />
        <Route path="/mobile/store/*" element={<HardRedirectToStore />} />

        {/* Immersive Mobile Experiences */}
        <Route path="/mobile/labs" element={<ProtectedRoute allowedRoles={['user', 'admin', 'sub_admin', 'consultant']}><MobileLabs /></ProtectedRoute>} />
        <Route path="/mobile/test/:testId" element={<ProtectedRoute allowedRoles={['user', 'admin', 'sub_admin', 'consultant']}><MobileTest /></ProtectedRoute>} />
        <Route path="/mobile/sectioned-test/:testId" element={<ProtectedRoute allowedRoles={['user', 'admin', 'sub_admin', 'consultant']}><MobileSectionedTest /></ProtectedRoute>} />
        <Route path="/mobile/results/:testId" element={<ProtectedRoute allowedRoles={['user', 'admin', 'sub_admin', 'consultant']}><MobileResults /></ProtectedRoute>} />
        <Route path="/mobile/detailed-analysis/:testId" element={<ProtectedRoute allowedRoles={['user', 'admin', 'sub_admin', 'consultant']}><MobileDetailedAnalysis /></ProtectedRoute>} />
        <Route path="/mobile/waiting-room/:sessionId" element={<MobileMockWaitingRoom />} />
        <Route path="/mobile/solutions/:sessionId" element={<PublicSolutions />} />
        <Route path="/mobile/mock-guidelines" element={<ProtectedRoute allowedRoles={['user', 'admin', 'sub_admin', 'consultant']}><MobileMockGuidelines /></ProtectedRoute>} />
        <Route path="/mobile/start-test" element={<ProtectedRoute allowedRoles={['user', 'admin', 'sub_admin', 'consultant']}><MobileStartTest /></ProtectedRoute>} />
        <Route path="/mobile/study-planner" element={<ProtectedRoute allowedRoles={['user', 'admin', 'sub_admin', 'consultant']}><StudyPlanner /></ProtectedRoute>} />
        <Route path="/mobile/onboarding" element={<ProtectedRoute allowedRoles={['user', 'admin', 'sub_admin', 'consultant']}><MobileOnboarding /></ProtectedRoute>} />
        <Route path="/mobile/pricing" element={<MobilePricing />} />

        {/* IELTS Mobile Experience */}
        <Route path="/mobile/reading/:testId" element={<ProtectedRoute allowedRoles={['user', 'admin', 'sub_admin', 'consultant']}><MobileIELTSPlayer /></ProtectedRoute>} />
        <Route path="/mobile/listening/:testId" element={<ProtectedRoute allowedRoles={['user', 'admin', 'sub_admin', 'consultant']}><MobileIELTSPlayer /></ProtectedRoute>} />
        <Route path="/mobile/writing/:taskId" element={<ProtectedRoute allowedRoles={['user', 'admin', 'sub_admin', 'consultant']}><MobileIELTSPlayer /></ProtectedRoute>} />
        <Route path="/mobile/speaking" element={<ProtectedRoute allowedRoles={['user', 'admin', 'sub_admin', 'consultant']}><MobileSpeakingLobby /></ProtectedRoute>} />
        <Route path="/mobile/speaking/:sessionId" element={<ProtectedRoute allowedRoles={['user', 'admin', 'sub_admin', 'consultant']}><MobileSpeakingSession /></ProtectedRoute>} />

        {/* Student Profile */}
        <Route path="/mobile/student/:id" element={<ProtectedRoute allowedRoles={['user', 'admin', 'sub_admin', 'consultant']}><MobileStudentProfile /></ProtectedRoute>} />
        <Route path="/mobile/u/:username" element={<ProtectedRoute allowedRoles={['user', 'admin', 'sub_admin', 'consultant']}><MobileStudentProfile /></ProtectedRoute>} />
        
        {/* Support old non-prefixed paths for a smoother transition if bookmarks exist */}
        <Route path="/community" element={<Navigate to="/mobile/community" replace />} />
        <Route path="/subjects" element={<Navigate to="/mobile/subjects" replace />} />
        <Route path="/learning" element={<Navigate to="/mobile/learning" replace />} />
        <Route path="/mock-exams" element={<Navigate to="/mobile/mock-exams" replace />} />
        <Route path="/history" element={<Navigate to="/mobile/history" replace />} />
        <Route path="/bookmarks" element={<Navigate to="/mobile/bookmarks" replace />} />
        <Route path="/test/:testId" element={<ProtectedRoute allowedRoles={['user', 'admin', 'sub_admin', 'consultant']}><MobileTest /></ProtectedRoute>} />
        <Route path="/results/:testId" element={<ProtectedRoute allowedRoles={['user', 'admin', 'sub_admin', 'consultant']}><MobileResults /></ProtectedRoute>} />
        <Route path="/waiting-room/:sessionId" element={<MobileMockWaitingRoom />} />
        <Route path="/solutions/:sessionId" element={<PublicSolutions />} />
        <Route path="/start-test" element={<ProtectedRoute allowedRoles={['user', 'admin', 'sub_admin', 'consultant']}><MobileStartTest /></ProtectedRoute>} />

        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/download-app" element={<DownloadApp />} />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AppUpdateChecker>
  );
};

const App = () => {
  const [isMobile, setIsMobile] = useState<boolean | null>(() => {
    const isTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    const isSmall = window.innerWidth <= 1024;
    const isMobileUA = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    return isMobileUA || (isSmall && isTouch);
  });
  const [isNative, setIsNative] = useState(() => Capacitor.isNativePlatform());
  const [onboardingCompleted, setOnboardingCompleted] = useState<boolean | null>(true);
  const { setTheme } = useTheme();

  useEffect(() => {
    const checkPlatform = () => {
      const mobile = window.innerWidth <= 1024;
      setIsMobile(mobile);
    };
    
    checkPlatform();
    window.addEventListener('resize', checkPlatform);
    return () => window.removeEventListener('resize', checkPlatform);
  }, []);

  useEffect(() => {
    let mounted = true;

    const checkPlatform = async () => {
      try {
        const info = await Device.getInfo();
        const native = info.platform === 'android' || info.platform === 'ios';

        if (mounted) {
          setIsNative(native);
          const isSmall = window.innerWidth <= 1024;
          const isMobileUA = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
          setIsMobile(native || isMobileUA || isSmall);

          if (native) {
            const { value } = await Preferences.get({ key: 'onboarding_completed' });
            setOnboardingCompleted(value === 'true');
            setTheme('dark');
            await StatusBar.hide();
            await StatusBar.setOverlaysWebView({ overlay: true });
            await StatusBar.setStyle({ style: Style.Dark });
          } else {
            setOnboardingCompleted(true);
            setTheme('light');
          }
        }
      } catch (e) {
        if (mounted) {
          const isSmall = window.innerWidth <= 1024;
          const isMobileUA = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
          setIsMobile(isMobileUA || isSmall);
        }
      }
    };

    const handleResize = () => {
      if (mounted) {
        const isSmall = window.innerWidth <= 1024;
        const isMobileUA = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
        setIsMobile(Capacitor.isNativePlatform() || isMobileUA || isSmall);
      }
    };

    const handleGlobalError = async (event: ErrorEvent | PromiseRejectionEvent) => {
      const error = 'error' in event ? event.error : event.reason;
      const message = 'error' in event ? event.message : (event.reason?.message || 'Unhandled Rejection');
      
      try {
        await supabase.rpc('log_site_health_event' as any, {
          p_event_type: 'error',
          p_severity: 'high',
          p_url: window.location.pathname,
          p_message: message,
          p_metadata: {
            stack: error?.stack,
            userAgent: navigator.userAgent,
            type: event.type
          }
        });
      } catch (e) {
        console.error("Failed to log global error:", e);
      }
    };

    window.addEventListener('error', handleGlobalError);
    window.addEventListener('unhandledrejection', handleGlobalError);

    checkPlatform();
    window.addEventListener('resize', handleResize);
    return () => {
      mounted = false;
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('error', handleGlobalError);
      window.removeEventListener('unhandledrejection', handleGlobalError);
    };
  }, []);

  // ─── Intelligent Multi-Wave Prefetching ────────────────────────────────────
  // Pages are loaded in the background in 3 waves to avoid competing with
  // user interactions while still ensuring the most-visited pages feel instant.
  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = [];

    // WAVE 1 (5s): Critical modal components + Dashboard for logged-in users
    timers.push(setTimeout(async () => {
      try {
        const criticalImports: Promise<any>[] = [
          import("@/components/PricingModal"),
          import("./pages/Pricing"),
        ];
        
        // If user is already authenticated, prioritize the Dashboard chunk
        if (readProfileCache()) {
          criticalImports.push(import("./pages/Dashboard"));
          criticalImports.push(import("./mobile/pages/MobileDashboard"));
        }

        await Promise.all(criticalImports);
      } catch { /* silent fail */ }
    }, 5000));

    // WAVE 2 (15s): Destination pages — Store, Practice
    timers.push(setTimeout(async () => {
      try {
        await Promise.all([
          import("./pages/Practice"),
        ]);
        // Defer secondary chunks
        const secondaryTimeout = setTimeout(() => {
          import("./pages/MockExams");
          import("./mobile/pages/MobileMockExams");
        }, 5000);
        timers.push(secondaryTimeout);
      } catch { /* silent fail */ }
    }, 15000));

    // WAVE 3 (25s): Authority content cluster (Removed)
    timers.push(setTimeout(async () => {
      try {
        await Promise.all([
          import("./pages/Community"),
        ]);
      } catch { /* silent fail */ }
    }, 25000));

    return () => timers.forEach(clearTimeout);
  }, []);




  // Removed blocking null check to enable instant hydration of prerendered HTML


  return (
    <AppProviders>
      <AuthBridge
        isNative={isNative}
        onboardingCompleted={onboardingCompleted}
        setOnboardingCompleted={setOnboardingCompleted}
        isMobile={isMobile}
      />
    </AppProviders>
  );
};

const AppProviders = ({ children }: { children: React.ReactNode }) => {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem={true} disableTransitionOnChange>
        <GlobalErrorBoundary>
          <AuthProvider>
            <PricingProvider>
              <ExamProvider>
                <AIProvider>
                  <TooltipProvider>
                    <LiveEditProvider>
                      {children}
                    </LiveEditProvider>
                  </TooltipProvider>
                </AIProvider>
              </ExamProvider>
            </PricingProvider>
          </AuthProvider>
        </GlobalErrorBoundary>
      </ThemeProvider>
    </QueryClientProvider>
  );
};

// Internal component to handle auth-sensitive routing
const AuthBridge = ({ isNative, onboardingCompleted, setOnboardingCompleted, isMobile }: any) => {
  const { user, profile, loading: authLoading, refreshProfile } = useAuth();
  const { isPricingModalOpen, isCheckoutOpen } = usePricing();
  const { shouldBlockAccess, refreshLimit, isGlobal, isElite, isAdmin, plan, tier } = usePlanAccess();

  // ── Pre-load Dashboard data immediately after auth resolves ───────────────
  // Fires 4 parallel queries in background so Dashboard has data ready on arrival
  useDashboardPrefetch({
    userId: user?.id,
    examId: profile?.selected_exam,
    enabled: !!user && !!profile?.selected_exam && !authLoading,
  });

  // No silent auto-downgrade — SubscriptionLockout handles the user choice explicitly


  return (
    <>
      {/* SubscriptionLockout: shown as overlay when subscription expired */}
      {shouldBlockAccess && <SubscriptionLockout />}

      <Suspense fallback={(isInitialPublic || !initialAuthHint) ? null : <PageLoader />}>
        {isMobile ? (
          // Use HashRouter ONLY for Native APK, BrowserRouter for Mobile Web
          isNative ? (
            <HashRouter>
              <ToasterProvider />
              <SecurityEnforcer />
              <DeepLinkHandler />
              <MobileRouter user={user} isNative={isNative} authLoading={authLoading} />
              {(isPricingModalOpen || isCheckoutOpen) && (
                <Suspense fallback={null}>
                  <PricingModal />
                </Suspense>
              )}
            </HashRouter>
          ) : (
            <BrowserRouter>
              <ToasterProvider />
              <SecurityEnforcer />
              <MobileRouter user={user} isNative={isNative} authLoading={authLoading} />
              {(isPricingModalOpen || isCheckoutOpen) && (
                <Suspense fallback={null}>
                  <PricingModal />
                </Suspense>
              )}
            </BrowserRouter>
          )
        ) : (
          <BrowserRouter>
            <ToasterProvider />
            <SecurityEnforcer />
            <WebRouter user={user} authLoading={authLoading} />
            {(isPricingModalOpen || isCheckoutOpen) && (
              <Suspense fallback={null}>
                <PricingModal />
              </Suspense>
            )}
          </BrowserRouter>
        )}
      </Suspense>
      <VercelAnalytics />
      <VercelSpeedInsights />
      <NetworkStatus />
      <CookieConsent />
    </>
  );
};

const ToasterProvider = () => {
  return (
    <>
      <Toaster />
      <Sonner position="top-center" richColors />
    </>
  );
};

// Component to handle native deep links and auth redirects
const DeepLinkHandler = () => {
  const navigate = useNavigate();

  useEffect(() => {
    // Store the listener handle so we only remove THIS specific listener on cleanup
    let listenerHandle: { remove: () => Promise<void> } | null = null;

    const setup = async () => {
      listenerHandle = await CapApp.addListener('appUrlOpen', async (data: { url: string }) => {
        const url = new URL(data.url);
        const hash = url.hash.substring(1);
        const params = new URLSearchParams(hash);

        const accessToken = params.get('access_token');
        const refreshToken = params.get('refresh_token');

        if (accessToken && refreshToken) {
          const { error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken
          });

          if (!error) {
            // Clear the token hash from the URL so tokens don't persist
            // in browser history or the address bar
            window.history.replaceState({}, '', window.location.pathname);
            navigate('/mobile/dashboard');
          } else {
            console.error('DeepLink Error:', error.message);
          }
        }
      });
    };

    setup();

    // Only remove THIS listener — not all Capacitor App listeners globally
    return () => {
      listenerHandle?.remove();
    };
  }, [navigate]);

  return null;
};

export default App;
