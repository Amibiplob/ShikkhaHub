import type { AppRole } from "./auth-context";
import { useAuth } from "@/features/auth/useAuth";

/**
 * Central place for role-based capability checks (RBAC).
 * Components should ask "can I do X?" instead of checking roles inline.
 */
export const usePermissions = () => {
  const { user, roles, hasRole, loading } = useAuth();

  const isAdmin = hasRole("admin");
  const isTeacher = hasRole("teacher");
  const isStudent = hasRole("student");
  const isStaff = isAdmin || isTeacher;

  const hasAnyRole = (allowed: AppRole[]) => allowed.some((r) => hasRole(r));

  return {
    loading,
    user,
    roles,
    isAdmin,
    isTeacher,
    isStudent,
    isStaff,
    hasRole,
    hasAnyRole,
    // capabilities
    can: {
      createCourse: isStaff,
      editAnyCourse: isAdmin,
      manageLiveClasses: isStaff,
      gradeSubmissions: isStaff,
      viewAnalytics: isStaff,
      manageUsers: isAdmin,
      manageRoles: isAdmin,
      moderateCommunity: isAdmin,
      enroll: !!user,
    },
  };
};

export default usePermissions;
