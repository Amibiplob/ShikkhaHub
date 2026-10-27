import { lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import ProtectedRoute from "@/features/auth/ProtectedRoute";
import ScrollToHash from "@/components/shared/ScrollToHash";
import Index from "@/pages/Index";
const Tutors = lazy(() => import("@/pages/Tutors"));
const Admin = lazy(() => import("@/pages/Admin"));
const Faq = lazy(() => import("@/pages/Faq"));
const Contact = lazy(() => import("@/pages/Contact"));
const Certificates = lazy(() => import("@/pages/Certificates"));
const CertificateVerification = lazy(
  () => import("@/pages/CertificateVerification"),
);
const Auth = lazy(() => import("@/pages/Auth"));
const ResetPassword = lazy(() => import("@/pages/ResetPassword"));
const Courses = lazy(() => import("@/pages/Courses"));
const CourseDetail = lazy(() => import("@/pages/CourseDetail"));
const Dashboard = lazy(() => import("@/pages/Dashboard"));
const Community = lazy(() => import("@/pages/Community"));
const CommunityPost = lazy(() => import("@/pages/CommunityPost"));
const LiveClass = lazy(() => import("@/pages/LiveClass"));
const ClassRecording = lazy(() => import("@/pages/ClassRecording"));
const AssignmentDetail = lazy(() => import("@/pages/AssignmentDetail"));
const TeacherAnalytics = lazy(() => import("@/pages/TeacherAnalytics"));
const Achievements = lazy(() => import("@/pages/Achievements"));
const Leaderboard = lazy(() => import("@/pages/Leaderboard"));
const Profile = lazy(() => import("@/pages/Profile"));
const NotFound = lazy(() => import("@/pages/NotFound"));

export default function AppRoutes() {
  return (
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
  );
}
