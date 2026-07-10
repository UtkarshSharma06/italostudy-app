import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { toast } from "sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Analytics as VercelAnalytics } from "@vercel/analytics/react";
import { SpeedInsights as VercelSpeedInsights } from "@vercel/speed-insights/react";
import { Capacitor } from '@capacitor/core';
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, HashRouter, Routes, Route, Navigate, useNavigate, useParams, Outlet } from "react-router-dom";
import { AuthProvider } from "@/lib/auth";
import { ThemeProvider, useTheme } from "next-themes";
import { lazy, Suspense, useEffect, useState } from "react";
import { LiveEditProvider } from "@/contexts/LiveEditContext";
import { useRef } from "react";
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
import { SystemSettingsProvider } from "@/context/SystemSettingsContext";
import { usePlanAccess } from "@/hooks/usePlanAccess";
import { SubscriptionLockout } from "@/components/SubscriptionLockout";
import GlobalErrorBoundary from "@/components/GlobalErrorBoundary";
import { useDashboardPrefetch } from "@/hooks/useDashboardPrefetch";
// Delayed Import for better TTI
const PricingModal = lazy(() => import("@/components/PricingModal"));
import Layout from "@/components/Layout";

import Dashboard from "./pages/Dashboard";
import Practice from "./pages/Practice";
import MockExams from "./pages/MockExams";
import Analytics from "./pages/Analytics";
import History from "./pages/History";
import Bookmarks from "./pages/Bookmarks";
import NotesAndPdfs from "./pages/NotesAndPdfs";
import Community from "./pages/Community";
import Courses from "./pages/Courses";

// Lazy Load Pages
const Auth = lazy(() => import("./pages/Auth"));
const Subjects = lazy(() => import("./pages/Subjects"));
const Labs = lazy(() => import("./pages/Labs"));
const Test = lazy(() => import("./pages/Test"));
const Results = lazy(() => import("./pages/Results"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const SubjectNotes = lazy(() => import("./pages/SubjectNotes"));

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
const CourseDetail = lazy(() => import("./pages/CourseDetail"));
const CourseCheckout = lazy(() => import("./pages/CourseCheckout"));
const CourseSubjectView = lazy(() => import("./pages/CourseSubjectView"));
const CourseChapterView = lazy(() => import("./pages/CourseChapterView"));
const CoursePaymentCallback = lazy(() => import("./pages/CoursePaymentCallback"));
const BundlePaymentCallback = lazy(() => import("./pages/BundlePaymentCallback"));

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
const MobileNotesAndPdfs = lazy(() => import("./mobile/pages/MobileNotesAndPdfs"));
const MobileSubjectNotes = lazy(() => import("./mobile/pages/MobileSubjectNotes"));
const MobileLayout = lazy(() => import("./mobile/components/MobileLayout"));
const MobileIELTSPlayer = lazy(() => import("./mobile/pages/MobileIELTSPlayer"));
const MobileSpeakingLobby = lazy(() => import("./mobile/pages/MobileSpeakingLobby"));
const MobileSpeakingSession = lazy(() => import("./mobile/pages/MobileSpeakingSession"));
const SecurityEnforcer = lazy(() => import("@/components/SecurityEnforcer"));
const AppUpdateChecker = lazy(() => import("./mobile/components/AppUpdateChecker").then(m => ({ default: m.AppUpdateChecker })));
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

const DynamicRedirect = ({ to }: { to: string }) => {
  const params = useParams();
  let path = to;
  Object.keys(params).forEach(key => {
    if (params[key]) {
      path = path.replace(`:${key}`, params[key] as string);
    }
  });
  return <Navigate to={path} replace />;
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
      user ? <Navigate to="/dashboard" replace /> : 
      <Navigate to="/auth" replace />
    } />
    <Route path="/auth" element={<Auth />} />
    <Route path="/reset-password" element={<ResetPassword />} />
    
    {/* Core Student Features */}
    <Route path="/onboarding" element={<ProtectedRoute allowedRoles={['user', 'admin', 'sub_admin', 'consultant']}><Onboarding /></ProtectedRoute>} />
    <Route path="/community/upgrade" element={<ProtectedRoute allowedRoles={['user', 'admin', 'sub_admin', 'consultant']}><CommunityUpgrade /></ProtectedRoute>} />
    <Route path="/labs" element={<ProtectedRoute allowedRoles={['user', 'admin', 'sub_admin', 'consultant']}><Labs /></ProtectedRoute>} />
    <Route path="/test/:testId" element={<ProtectedRoute allowedRoles={['user', 'admin', 'sub_admin', 'consultant']}><Test /></ProtectedRoute>} />
    <Route path="/results/:testId" element={<ProtectedRoute allowedRoles={['user', 'admin', 'sub_admin', 'consultant']}><Results /></ProtectedRoute>} />
    <Route path="/billing" element={<ProtectedRoute allowedRoles={['user', 'admin', 'sub_admin', 'consultant']}><Billing /></ProtectedRoute>} />
    <Route path="/notes/:subjectId" element={<ProtectedRoute allowedRoles={['user', 'admin', 'sub_admin', 'consultant']}><SubjectNotes /></ProtectedRoute>} />
    <Route path="/study-planner" element={<ProtectedRoute allowedRoles={['user', 'admin', 'sub_admin', 'consultant']}><StudyPlanner /></ProtectedRoute>} />
    <Route path="/learning" element={<ProtectedRoute allowedRoles={['user', 'admin', 'sub_admin', 'consultant']}><Learning /></ProtectedRoute>} />
    <Route path="/start-test" element={<ProtectedRoute allowedRoles={['user', 'admin', 'sub_admin', 'consultant']}><StartTest /></ProtectedRoute>} />

    {/* Persistent Sidebar Tabs (No Flicker) */}
    <Route element={<Layout><Outlet /></Layout>}>
      <Route path="/dashboard" element={<ProtectedRoute allowedRoles={['user', 'admin', 'sub_admin']}><Dashboard /></ProtectedRoute>} />
      <Route path="/subjects" element={<ProtectedRoute allowedRoles={['user', 'admin', 'sub_admin', 'consultant']}><Subjects /></ProtectedRoute>} />
      <Route path="/community" element={<ProtectedRoute allowedRoles={['user', 'admin', 'sub_admin', 'consultant']}><Community /></ProtectedRoute>} />
      <Route path="/practice" element={<ProtectedRoute allowedRoles={['user', 'admin', 'sub_admin', 'consultant']}><Practice /></ProtectedRoute>} />
      <Route path="/mock-exams" element={<ProtectedRoute allowedRoles={['user', 'admin', 'sub_admin', 'consultant']}><MockExams /></ProtectedRoute>} />
      <Route path="/analytics" element={<ProtectedRoute allowedRoles={['user', 'admin', 'sub_admin', 'consultant']}><Analytics /></ProtectedRoute>} />
      <Route path="/history" element={<ProtectedRoute allowedRoles={['user', 'admin', 'sub_admin', 'consultant']}><History /></ProtectedRoute>} />
      <Route path="/settings" element={<ProtectedRoute allowedRoles={['user', 'admin', 'sub_admin', 'consultant']}><Settings /></ProtectedRoute>} />
      <Route path="/bookmarks" element={<ProtectedRoute allowedRoles={['user', 'admin', 'sub_admin', 'consultant']}><Bookmarks /></ProtectedRoute>} />
      <Route path="/notes" element={<ProtectedRoute allowedRoles={['user', 'admin', 'sub_admin', 'consultant']}><NotesAndPdfs /></ProtectedRoute>} />
      <Route path="/courses" element={<ProtectedRoute allowedRoles={['user', 'admin', 'sub_admin', 'consultant']}><Courses /></ProtectedRoute>} />
    </Route>

    {/* Courses Cluster */}
    <Route path="/courses/:courseId" element={<ProtectedRoute allowedRoles={['user', 'admin', 'sub_admin', 'consultant']}><CourseDetail /></ProtectedRoute>} />
    <Route path="/courses/:courseId/checkout" element={<ProtectedRoute allowedRoles={['user', 'admin', 'sub_admin', 'consultant']}><CourseCheckout /></ProtectedRoute>} />
    <Route path="/courses/:courseId/subject/:subjectId" element={<ProtectedRoute allowedRoles={['user', 'admin', 'sub_admin', 'consultant']}><CourseSubjectView /></ProtectedRoute>} />
    <Route path="/courses/:courseId/subject/:subjectId/chapter/:chapterId" element={<ProtectedRoute allowedRoles={['user', 'admin', 'sub_admin', 'consultant']}><CourseChapterView /></ProtectedRoute>} />
    {/* Course payment callback — SEPARATE from /payment/callback (subscriptions) and store orders */}
    {/* No ProtectedRoute — callback handles session rehydration internally after payment redirect */}
    <Route path="/course-payment/callback" element={<CoursePaymentCallback />} />
    {/* Bundle payment callback — verifies course + guides subscription completion */}
    <Route path="/bundle-payment/callback" element={<BundlePaymentCallback />} />
    
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
        {/* FIX: Redirect bare /dashboard to /mobile/dashboard to prevent double-redirect */}
        <Route path="/dashboard" element={<Navigate to="/mobile/dashboard" replace />} />

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
        <Route path="/mobile/notes" element={<ProtectedRoute allowedRoles={['user', 'admin', 'sub_admin', 'consultant']}><MobileNotesAndPdfs /></ProtectedRoute>} />
        <Route path="/mobile/notes/:subjectId" element={<ProtectedRoute allowedRoles={['user', 'admin', 'sub_admin', 'consultant']}><MobileSubjectNotes /></ProtectedRoute>} />

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
        <Route path="/notes" element={<Navigate to="/mobile/notes" replace />} />
        <Route path="/study-planner" element={<Navigate to="/mobile/study-planner" replace />} />
        <Route path="/practice" element={<Navigate to="/mobile/practice" replace />} />
        <Route path="/analytics" element={<Navigate to="/mobile/analytics" replace />} />
        <Route path="/settings" element={<Navigate to="/mobile/settings" replace />} />
        <Route path="/billing" element={<Navigate to="/mobile/billing" replace />} />
        <Route path="/pricing" element={<Navigate to="/mobile/pricing" replace />} />
        <Route path="/onboarding" element={<Navigate to="/mobile/onboarding" replace />} />
        <Route path="/labs" element={<Navigate to="/mobile/labs" replace />} />
        <Route path="/apply-university" element={<Navigate to="/mobile/apply-university" replace />} />
        <Route path="/apply-university/status/:id" element={<DynamicRedirect to="/mobile/apply-university/status/:id" />} />
        <Route path="/apply-university/upgrade" element={<Navigate to="/mobile/apply-university/upgrade" replace />} />
        <Route path="/community/upgrade" element={<Navigate to="/mobile/community/upgrade" replace />} />
        <Route path="/detailed-analysis/:testId" element={<DynamicRedirect to="/mobile/detailed-analysis/:testId" />} />
        <Route path="/mock-guidelines" element={<Navigate to="/mobile/mock-guidelines" replace />} />
        <Route path="/reading/:testId" element={<DynamicRedirect to="/mobile/reading/:testId" />} />
        <Route path="/listening/:testId" element={<DynamicRedirect to="/mobile/listening/:testId" />} />
        <Route path="/writing/:taskId" element={<DynamicRedirect to="/mobile/writing/:taskId" />} />
        <Route path="/speaking" element={<Navigate to="/mobile/speaking" replace />} />
        <Route path="/speaking/:sessionId" element={<DynamicRedirect to="/mobile/speaking/:sessionId" />} />
        <Route path="/student/:id" element={<DynamicRedirect to="/mobile/student/:id" />} />
        <Route path="/u/:username" element={<DynamicRedirect to="/mobile/u/:username" />} />
        <Route path="/test/:testId" element={<ProtectedRoute allowedRoles={['user', 'admin', 'sub_admin', 'consultant']}><MobileTest /></ProtectedRoute>} />
        <Route path="/results/:testId" element={<ProtectedRoute allowedRoles={['user', 'admin', 'sub_admin', 'consultant']}><MobileResults /></ProtectedRoute>} />
        <Route path="/waiting-room/:sessionId" element={<MobileMockWaitingRoom />} />
        <Route path="/solutions/:sessionId" element={<PublicSolutions />} />
        <Route path="/start-test" element={<ProtectedRoute allowedRoles={['user', 'admin', 'sub_admin', 'consultant']}><MobileStartTest /></ProtectedRoute>} />

        {/* Courses Cluster — wrapped in MobileLayout for native header + dock */}
        <Route path="/courses" element={
          <ProtectedRoute allowedRoles={['user', 'admin', 'sub_admin', 'consultant']}>
            <MobileLayout><Courses isMobileLayout={true} /></MobileLayout>
          </ProtectedRoute>
        } />
        <Route path="/courses/:courseId" element={
          <ProtectedRoute allowedRoles={['user', 'admin', 'sub_admin', 'consultant']}>
            <MobileLayout><CourseDetail isMobileLayout={true} /></MobileLayout>
          </ProtectedRoute>
        } />
        <Route path="/courses/:courseId/checkout" element={
          <ProtectedRoute allowedRoles={['user', 'admin', 'sub_admin', 'consultant']}>
            <MobileLayout><CourseCheckout isMobileLayout={true} /></MobileLayout>
          </ProtectedRoute>
        } />
        <Route path="/courses/:courseId/subject/:subjectId" element={
          <ProtectedRoute allowedRoles={['user', 'admin', 'sub_admin', 'consultant']}>
            <MobileLayout><CourseSubjectView isMobileLayout={true} /></MobileLayout>
          </ProtectedRoute>
        } />
        <Route path="/courses/:courseId/subject/:subjectId/chapter/:chapterId" element={
          <ProtectedRoute allowedRoles={['user', 'admin', 'sub_admin', 'consultant']}>
            <MobileLayout><CourseChapterView isMobileLayout={true} /></MobileLayout>
          </ProtectedRoute>
        } />

        <Route path="/course-payment/callback" element={<CoursePaymentCallback />} />
        <Route path="/bundle-payment/callback" element={<BundlePaymentCallback />} />
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
    // FIX: Do NOT call immediately — useState() already computed the correct value
    // synchronously. Just set up the resize listener.
    // For resize, use isSmall WITHOUT the touch check: a desktop user explicitly
    // dragging their window below 1024px should switch to the mobile layout.
    const handleResize = () => {
      const isSmall = window.innerWidth <= 1024;
      const isMobileUA = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      const newVal = Capacitor.isNativePlatform() || isMobileUA || isSmall;
      setIsMobile(prev => prev === newVal ? prev : newVal);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    let mounted = true;

    const checkPlatform = async () => {
      try {
        const info = await Device.getInfo();
        const native = info.platform === 'android' || info.platform === 'ios';

        if (mounted) {
          setIsNative(native);
          // FIX: Only update isMobile if the value actually changes — prevents
          // an unnecessary re-render (and router swap) when Capacitor resolves.
          const newIsMobile = native || /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || window.innerWidth <= 1024;
          setIsMobile(prev => prev === newIsMobile ? prev : newIsMobile);

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
          const newIsMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || window.innerWidth <= 1024;
          setIsMobile(prev => prev === newIsMobile ? prev : newIsMobile);
        }
      }
    };

    // NOTE: Resize is handled by the first useEffect only. No duplicate listener here.

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
    return () => {
      mounted = false;
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
      <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false} disableTransitionOnChange>
        <GlobalErrorBoundary>
          <AuthProvider>
            <SystemSettingsProvider>
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
            </SystemSettingsProvider>
          </AuthProvider>
        </GlobalErrorBoundary>
      </ThemeProvider>
    </QueryClientProvider>
  );
};

// Isolated component — usePlanAccess re-renders never propagate up to the router.
// Previously this lived inside AuthBridge which caused the entire router tree
// (and Dashboard) to re-render each time its 3 DB queries resolved.
const PlanGuard = () => {
  const { shouldBlockAccess } = usePlanAccess();
  return shouldBlockAccess ? <SubscriptionLockout /> : null;
};

// Internal component to handle auth-sensitive routing
const AuthBridge = ({ isNative, onboardingCompleted, setOnboardingCompleted, isMobile }: any) => {
  const { user, profile, loading: authLoading, refreshProfile } = useAuth();
  const { isPricingModalOpen, isCheckoutOpen } = usePricing();

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
      {/* SubscriptionLockout: isolated in PlanGuard to prevent router re-renders */}
      <PlanGuard />

      <Suspense fallback={(isInitialPublic || !initialAuthHint) ? null : <PageLoader />}>
        {isMobile ? (
          // Use HashRouter ONLY for Native APK, BrowserRouter for Mobile Web
          isNative ? (
            <HashRouter>
              <ToasterProvider />
              <Suspense fallback={null}><SecurityEnforcer /></Suspense>
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
              <Suspense fallback={null}><SecurityEnforcer /></Suspense>
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
            <Suspense fallback={null}><SecurityEnforcer /></Suspense>
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
// Supports both:
//   1. PKCE flow  → com.italostudy.app://google-auth?code=XXXX  (Supabase default)
//   2. Implicit   → com.italostudy.app://google-auth#access_token=XXX (legacy fallback)
const DeepLinkHandler = () => {
  const navigate = useNavigate();

  useEffect(() => {
    let listenerHandle: { remove: () => Promise<void> } | null = null;

    const setup = async () => {
      listenerHandle = await CapApp.addListener('appUrlOpen', async (data: { url: string }) => {
        try {
          const url = new URL(data.url);

          // ── PKCE flow: Supabase returns ?code= in query string ────────────
          // This is the correct path when flowType: 'pkce' is set in the client.
          const code = url.searchParams.get('code');
          if (code) {
            const { error } = await supabase.auth.exchangeCodeForSession(code);
            if (!error) {
              navigate('/mobile/dashboard', { replace: true });
            } else {
              console.error('[DeepLink] PKCE exchange failed:', error.message);
            }
            return;
          }

          // ── Implicit flow fallback: tokens in URL hash ────────────────────
          // Handles older OAuth providers or non-PKCE configurations.
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
              navigate('/mobile/dashboard', { replace: true });
            } else {
              console.error('[DeepLink] Implicit setSession failed:', error.message);
            }
            return;
          }

          // ── Other deep links (payment callbacks, etc.) ────────────────────
          const path = url.pathname || '/';
          if (path && path !== '/') {
            navigate(path, { replace: true });
          }
        } catch (e) {
          console.error('[DeepLink] Failed to parse URL:', data.url, e);
        }
      });
    };

    setup();

    // Only remove THIS specific listener on cleanup
    return () => {
      listenerHandle?.remove();
    };
  }, [navigate]);

  return null;
};

export default App;
