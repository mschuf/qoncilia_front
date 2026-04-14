import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import { AnimatePresence } from "framer-motion";
import ProtectedRoute from "@/ProtectedRoute";
import PublicOnlyRoute from "@/PublicOnlyRoute";
import { useAuth } from "./context/AuthContext";
import AppLayout from "./layouts/AppLayout";
import HomePage from "./pages/HomePage";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import UserManagementPage from "./pages/UserManagementPage";
import ProfilePage from "./pages/ProfilePage";
import CompanyManagementPage from "./pages/CompanyManagementPage";

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
          <Route path="mis-datos" element={<ProfilePage />} />
          <Route
            path="companies"
            element={
              <ProtectedRoute roles={["admin", "superadmin"]}>
                <CompanyManagementPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="users"
            element={
              <ProtectedRoute roles={["admin", "superadmin"]}>
                <UserManagementPage />
              </ProtectedRoute>
            }
          />
        </Route>
        <Route path="*" element={<Navigate to={role ? "/" : "/login"} replace />} />
      </Routes>
    </AnimatePresence>
  );
}
