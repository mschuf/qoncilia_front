import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import { AnimatePresence } from "framer-motion";
import ProtectedRoute from "@/ProtectedRoute";
import PublicOnlyRoute from "@/PublicOnlyRoute";
import { useAuth } from "./context/AuthContext";
import AppLayout from "./layouts/AppLayout";
import ConciliationWorkbenchPage from "./pages/ConciliationWorkbenchPage";
import HomePage from "./pages/HomePage";
import LayoutManagementPage from "./pages/LayoutManagementPage";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import UserManagementPage from "./pages/UserManagementPage";
import ProfilePage from "./pages/ProfilePage";
import AccessControlPage from "./pages/AccessControlPage";
import { APP_MODULE_VALUES } from "./utils/modules";
import { ROLE_VALUES } from "./utils/role";

export default function App() {
  const { role } = useAuth();
  const location = useLocation();

  return (
    <AnimatePresence mode="wait">
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
    </AnimatePresence>
  );
}
