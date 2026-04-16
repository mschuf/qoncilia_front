import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import type { ProtectedRouteProps } from "../types/components/protected-route.types";

export default function ProtectedRoute({
  children,
  roles,
  requiredModule
}: ProtectedRouteProps) {
  const { isAuthenticated, role, hasModule } = useAuth();
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  if (Array.isArray(roles) && roles.length > 0 && (!role || !roles.includes(role))) {
    return <Navigate to="/" replace />;
  }

  if (requiredModule && !hasModule(requiredModule)) {
    return <Navigate to="/" replace />;
  }

  return children;
}
