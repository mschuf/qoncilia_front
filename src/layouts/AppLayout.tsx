import { FiActivity, FiHome, FiLogOut, FiSettings, FiShield, FiUser } from "react-icons/fi";
import { NavLink, Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { roleLabel } from "../utils/role";

export default function AppLayout() {
  const { user, role, logout } = useAuth();

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_#edf8fa_0%,_#f9fcfd_45%,_#ffffff_100%)]">
      <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/95 backdrop-blur">
        <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-4 px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-brand-100 p-2 text-brand-700">
              <FiShield className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.18em] text-brand-600">Qoncilia</p>
            </div>
          </div>

          <nav className="flex items-center gap-2">
            <NavLink
              to="/"
              className={({ isActive }) =>
                `rounded-xl px-4 py-2 text-sm font-semibold transition-all ${isActive ? "bg-slate-900 text-white shadow-md" : "text-slate-600 hover:bg-slate-100"
                }`
              }
            >
              <span className="flex items-center gap-2">
                <FiHome className="h-4 w-4" /> Home
              </span>
            </NavLink>

            <NavLink
              to="/mis-datos"
              className={({ isActive }) =>
                `rounded-xl px-4 py-2 text-sm font-semibold transition-all ${isActive ? "bg-slate-900 text-white shadow-md" : "text-slate-600 hover:bg-slate-100"
                }`
              }
            >
              <span className="flex items-center gap-2">
                <FiUser className="h-4 w-4" /> Mis Datos
              </span>
            </NavLink>

            {(role === "admin" || role === "superadmin") && (
              <NavLink
                to="/conciliation"
                className={({ isActive }) =>
                  `rounded-xl px-4 py-2 text-sm font-semibold transition-all ${isActive ? "bg-slate-900 text-white shadow-md" : "text-slate-600 hover:bg-slate-100"
                  }`
                }
              >
                <span className="flex items-center gap-2">
                  <FiActivity className="h-4 w-4" /> Conciliar
                </span>
              </NavLink>
            )}

            {(role === "admin" || role === "superadmin") && (
              <NavLink
                to="/users"
                className={({ isActive }) =>
                  `rounded-xl px-4 py-2 text-sm font-semibold transition-all ${isActive ? "bg-slate-900 text-white shadow-md" : "text-slate-600 hover:bg-slate-100"
                  }`
                }
              >
                <span className="flex items-center gap-2">
                  <FiShield className="h-4 w-4" /> Usuarios
                </span>
              </NavLink>
            )}

            {role === "superadmin" && (
              <NavLink
                to="/layout-management"
                className={({ isActive }) =>
                  `rounded-xl px-4 py-2 text-sm font-semibold transition-all ${isActive ? "bg-slate-900 text-white shadow-md" : "text-slate-600 hover:bg-slate-100"
                  }`
                }
              >
                <span className="flex items-center gap-2">
                  <FiSettings className="h-4 w-4" /> Layouts
                </span>
              </NavLink>
            )}
          </nav>

          <div className="flex items-center gap-3">
            <div className="hidden rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-600 sm:block">
              {user?.usrNombre ? `${user.usrNombre} ${user?.usrApellido ?? ""}`.trim() : user?.usrLogin}
              <span className="mx-2 text-slate-300">|</span>
              {roleLabel(role)}
            </div>
            <button
              type="button"
              onClick={() => logout({ showToast: true })}
              className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-100"
            >
              <FiLogOut className="h-4 w-4" /> Salir
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl px-4 py-8">
        <Outlet />
      </main>
    </div>
  );
}
