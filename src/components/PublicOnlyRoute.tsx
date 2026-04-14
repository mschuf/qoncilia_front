import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import type { PublicOnlyRouteProps } from "../types/components/public-only-route.types";

export default function PublicOnlyRoute({ children }: PublicOnlyRouteProps) {
  const { isAuthenticated } = useAuth();

  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  return children;
}
