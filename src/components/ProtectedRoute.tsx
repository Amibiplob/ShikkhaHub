import { Link, Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Loader2, ShieldAlert } from "lucide-react";

type AppRole = "admin" | "teacher" | "student";

interface ProtectedRouteProps {
  children: React.ReactNode;
  /** Single required role (kept for backwards compatibility). */
  requiredRole?: AppRole;
  /** Any one of these roles grants access. */
  allowedRoles?: AppRole[];
}

const ProtectedRoute = ({ children, requiredRole, allowedRoles }: ProtectedRouteProps) => {
  const { user, loading, hasRole } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" state={{ from: `${location.pathname}${location.search}${location.hash}` }} replace />;
  }

  const required = allowedRoles ?? (requiredRole ? [requiredRole] : []);
  const permitted = required.length === 0 || required.some((r) => hasRole(r));

  if (!permitted) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 px-4 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-destructive/10 text-destructive">
          <ShieldAlert className="h-7 w-7" />
        </div>
        <h1 className="text-2xl font-bold">You don't have access to this page</h1>
        <p className="max-w-md text-muted-foreground">
          This area is limited to {required.join(" or ")} accounts. If you think this is a mistake, ask an
          administrator to update your role.
        </p>
        <div className="flex gap-3">
          <Button asChild><Link to="/dashboard">Go to dashboard</Link></Button>
          <Button asChild variant="outline"><Link to="/courses">Browse courses</Link></Button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

export default ProtectedRoute;
