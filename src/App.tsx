import { Suspense, lazy } from "react";
import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import { AnimatePresence } from "framer-motion";
import ProtectedRoute from "@/ProtectedRoute";
import PublicOnlyRoute from "@/PublicOnlyRoute";
import { useAuth } from "./context/AuthContext";
import { APP_MODULE_VALUES } from "./utils/modules";
import { ROLE_VALUES } from "./utils/role";

const AppLayout = lazy(() => import("./layouts/AppLayout"));
const ConciliationHistoryPage = lazy(() => import("./pages/ConciliationHistoryPage"));
const ConciliationWorkbenchPage = lazy(() => import("./pages/ConciliationWorkbenchPage"));
const HomePage = lazy(() => import("./pages/HomePage"));
const LayoutManagementPage = lazy(() => import("./pages/LayoutManagementPage"));
const LoginPage = lazy(() => import("./pages/LoginPage"));
const RegisterPage = lazy(() => import("./pages/RegisterPage"));
const UserManagementPage = lazy(() => import("./pages/UserManagementPage"));
const ProfilePage = lazy(() => import("./pages/ProfilePage"));
const AccessControlPage = lazy(() => import("./pages/AccessControlPage"));

export default function App() {
  const { role } = useAuth();
  const location = useLocation();

  return (
    <AnimatePresence mode="wait">
      <Suspense fallback={<RouteFallback />}>
        <Routes location={location} key={location.pathname}>
          <Route
            path="/login"
            element={
              <PublicOnlyRoute>
                <LoginPage />
              </PublicOnlyRoute>
            }
          />
          <Route
            path="/register"
            element={
              <PublicOnlyRoute>
                <RegisterPage />
              </PublicOnlyRoute>
            }
          />
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <AppLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<HomePage />} />
            <Route
              path="mis-datos"
              element={
                <ProtectedRoute requiredModule={APP_MODULE_VALUES.profile}>
                  <ProfilePage />
                </ProtectedRoute>
              }
            />
            <Route
              path="conciliation"
              element={
                <ProtectedRoute requiredModule={APP_MODULE_VALUES.conciliation}>
                  <ConciliationWorkbenchPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="conciliation/history"
              element={
                <ProtectedRoute requiredModule={APP_MODULE_VALUES.conciliation}>
                  <ConciliationHistoryPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="users"
              element={
                <ProtectedRoute
                  roles={[ROLE_VALUES.admin, ROLE_VALUES.isSuperAdmin]}
                  requiredModule={APP_MODULE_VALUES.users}
                >
                  <UserManagementPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="layout-management"
              element={
                <ProtectedRoute
                  roles={[ROLE_VALUES.isSuperAdmin]}
                  requiredModule={APP_MODULE_VALUES.layoutManagement}
                >
                  <LayoutManagementPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="access-control"
              element={
                <ProtectedRoute
                  roles={[ROLE_VALUES.isSuperAdmin]}
                  requiredModule={APP_MODULE_VALUES.accessMatrix}
                >
                  <AccessControlPage />
                </ProtectedRoute>
              }
            />
          </Route>
          <Route path="*" element={<Navigate to={role ? "/" : "/login"} replace />} />
        </Routes>
      </Suspense>
    </AnimatePresence>
  );
}

function RouteFallback() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="rounded-2xl border border-slate-200 bg-white px-6 py-4 text-center shadow-sm">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">
          Qoncilia
        </p>
        <p className="mt-2 text-sm font-semibold text-slate-700">
          Cargando modulo...
        </p>
      </div>
    </div>
  );
}
