import { lazy, Suspense } from "react";
const Tutors = lazy(() => import("./pages/Tutors"));
const Admin = lazy(() => import("./pages/Admin"));
const Faq = lazy(() => import("./pages/Faq"));
const Contact = lazy(() => import("./pages/Contact"));
const Certificates = lazy(() => import("./pages/Certificates"));
const CertificateVerification = lazy(
  () => import("./pages/CertificateVerification"),
);
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { AuthProvider } from "@/contexts/AuthContext";
import { LanguageProvider } from "@/contexts/LanguageContext";
import ErrorBoundary from "@/components/ErrorBoundary";
import ProtectedRoute from "@/components/ProtectedRoute";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import ResetPassword from "./pages/ResetPassword";
import Courses from "./pages/Courses";
import CourseDetail from "./pages/CourseDetail";
import Dashboard from "./pages/Dashboard";
import Community from "./pages/Community";
import CommunityPost from "./pages/CommunityPost";
import LiveClass from "./pages/LiveClass";
import ClassRecording from "./pages/ClassRecording";
import AssignmentDetail from "./pages/AssignmentDetail";
import TeacherAnalytics from "./pages/TeacherAnalytics";
import Achievements from "./pages/Achievements";
import Leaderboard from "./pages/Leaderboard";
import Profile from "./pages/Profile";
import NotFound from "./pages/NotFound";
import ScrollToHash from "@/components/ScrollToHash";

const queryClient = new QueryClient();

const App = () => (
  <ErrorBoundary>
    <ThemeProvider
      attribute="class"
      defaultTheme="dark"
      enableSystem
      disableTransitionOnChange
    >
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <LanguageProvider>
            <AuthProvider>
              <Toaster />
              <Sonner />
              <BrowserRouter>
                <ScrollToHash />
                <Suspense
                  fallback={
                    <div role="status" className="p-12 text-center">
                      Loading page…
                    </div>
                  }
                >
                  <Routes>
                    <Route path="/" element={<Index />} />
                    <Route path="/auth" element={<Auth />} />
                    <Route path="/reset-password" element={<ResetPassword />} />
                    <Route path="/faq" element={<Faq />} />
                    <Route path="/contact" element={<Contact />} />
                    <Route
                      path="/certificates"
                      element={
                        <ProtectedRoute>
                          <Certificates />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/certificates/verify/:token"
                      element={<CertificateVerification />}
                    />
                    <Route path="/tutors" element={<Tutors />} />
                    <Route path="/courses" element={<Courses />} />
                    <Route path="/courses/:id" element={<CourseDetail />} />
                    <Route
                      path="/dashboard"
                      element={
                        <ProtectedRoute>
                          <Dashboard />
                        </ProtectedRoute>
                      }
                    />
                    <Route path="/community" element={<Community />} />
                    <Route path="/community/:id" element={<CommunityPost />} />
                    <Route
                      path="/live/:roomName"
                      element={
                        <ProtectedRoute>
                          <LiveClass />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/recordings/:classId"
                      element={
                        <ProtectedRoute>
                          <ClassRecording />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/assignments/:assignmentId"
                      element={
                        <ProtectedRoute>
                          <AssignmentDetail />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/analytics"
                      element={
                        <ProtectedRoute allowedRoles={["teacher", "admin"]}>
                          <TeacherAnalytics />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/achievements"
                      element={
                        <ProtectedRoute>
                          <Achievements />
                        </ProtectedRoute>
                      }
                    />
                    <Route path="/leaderboard" element={<Leaderboard />} />
                    <Route
                      path="/profile"
                      element={
                        <ProtectedRoute>
                          <Profile />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/admin"
                      element={
                        <ProtectedRoute requiredRole="admin">
                          <Admin />
                        </ProtectedRoute>
                      }
                    />
                    <Route path="*" element={<NotFound />} />
                  </Routes>
                </Suspense>
              </BrowserRouter>
            </AuthProvider>
          </LanguageProvider>
        </TooltipProvider>
      </QueryClientProvider>
    </ThemeProvider>
  </ErrorBoundary>
);

export default App;
