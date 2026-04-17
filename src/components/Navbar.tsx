import { useState } from "react";
import { FiActivity, FiGrid, FiHome, FiLogOut, FiMenu, FiSettings, FiShield, FiUser, FiX } from "react-icons/fi";
import { NavLink } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { APP_MODULE_VALUES } from "../utils/modules";
import { isSuperAdminRole, roleLabel } from "../utils/role";

export default function Navbar() {
  const { user, role, logout, hasModule } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const navLinks = [
    {
      to: "/",
      icon: <FiHome className="h-4 w-4" />,
      label: "Home",
      show: hasModule(APP_MODULE_VALUES.home),
    },
    {
      to: "/mis-datos",
      icon: <FiUser className="h-4 w-4" />,
      label: "Mis Datos",
      show: hasModule(APP_MODULE_VALUES.profile),
    },
    {
      to: "/conciliation",
      icon: <FiActivity className="h-4 w-4" />,
      label: "Conciliar",
      show: hasModule(APP_MODULE_VALUES.conciliation),
    },
    {
      to: "/users",
      icon: <FiShield className="h-4 w-4" />,
      label: "Usuarios",
      show: hasModule(APP_MODULE_VALUES.users),
    },
    {
      to: "/layout-management",
      icon: <FiSettings className="h-4 w-4" />,
      label: "Layouts",
      show: isSuperAdminRole(role) && hasModule(APP_MODULE_VALUES.layoutManagement),
    },
    {
      to: "/access-control",
      icon: <FiGrid className="h-4 w-4" />,
      label: "Accesos",
      show: isSuperAdminRole(role) && hasModule(APP_MODULE_VALUES.accessMatrix),
    },
  ];

  return (
    <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/95 backdrop-blur">
      <div className="mx-auto flex w-full max-w-7xl items-center justify-between px-4 py-3">
        {/* Logo Section */}
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-brand-100 p-2 text-brand-700">
            <FiShield className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-brand-600">Qoncilia</p>
          </div>
        </div>

        {/* Desktop Navigation */}
        <nav className="hidden lg:flex flex-1 items-center justify-center ml-4 mr-4 overflow-x-auto no-scrollbar">
          <div className="flex items-center gap-2">
            {navLinks.filter((link) => link.show).map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                className={({ isActive }) =>
                  `whitespace-nowrap rounded-xl px-4 py-2 text-sm font-semibold transition-all ${
                    isActive
                      ? "bg-slate-900 text-white shadow-md"
                      : "text-slate-600 hover:bg-slate-100"
                  }`
                }
              >
                <span className="flex items-center gap-2">
                  {link.icon} {link.label}
                </span>
              </NavLink>
            ))}
          </div>
        </nav>

        {/* Desktop User Info & Logout */}
        <div className="hidden lg:flex shrink-0 items-center gap-3">
          <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-600">
            {user?.usrNombre ? `${user.usrNombre} ${user?.usrApellido ?? ""}`.trim() : user?.usrLogin}
            <span className="mx-2 text-slate-300">|</span>
            {roleLabel(role)}
            {user?.companyName ? (
              <>
                <span className="mx-2 text-slate-300">|</span>
                {user.companyName}
              </>
            ) : null}
          </div>
          <button
            type="button"
            onClick={() => logout({ showToast: true })}
            className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-100"
          >
            <FiLogOut className="h-4 w-4" /> Salir
          </button>
        </div>

        {/* Mobile Menu Toggle */}
        <div className="lg:hidden flex items-center">
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="rounded-lg bg-slate-100 p-2 text-slate-600 transition hover:bg-slate-200 focus:outline-none"
            aria-label="Toggle menu"
          >
            {isMobileMenuOpen ? <FiX className="h-6 w-6" /> : <FiMenu className="h-6 w-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu Dropdown */}
      {isMobileMenuOpen && (
        <div className="lg:hidden border-t border-slate-200 bg-white max-h-[calc(100vh-70px)] overflow-y-auto">
          <nav className="flex flex-col px-4 py-4 space-y-2">
            {navLinks.filter((link) => link.show).map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                onClick={() => setIsMobileMenuOpen(false)}
                className={({ isActive }) =>
                  `rounded-xl px-4 py-3 text-sm font-semibold transition-all ${
                    isActive
                      ? "bg-slate-900 text-white shadow-md"
                      : "text-slate-600 hover:bg-slate-100"
                  }`
                }
              >
                <span className="flex items-center gap-3">
                  {link.icon} {link.label}
                </span>
              </NavLink>
            ))}
            
            <div className="my-2 border-t border-slate-100"></div>
            
            <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-3 text-xs font-semibold text-slate-600 mb-2">
              <div className="flex flex-col gap-1">
                <span className="opacity-70">Usuario:</span>
                <span className="text-sm">{user?.usrNombre ? `${user.usrNombre} ${user?.usrApellido ?? ""}`.trim() : user?.usrLogin}</span>
                <span className="opacity-70 mt-1">Rol:</span>
                <span className="text-sm">{roleLabel(role)}</span>
                {user?.companyName ? (
                  <>
                    <span className="opacity-70 mt-1">Empresa:</span>
                    <span className="text-sm">{user.companyName}</span>
                  </>
                ) : null}
              </div>
            </div>
            
            <button
              type="button"
              onClick={() => {
                setIsMobileMenuOpen(false);
                logout({ showToast: true });
              }}
              className="flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-red-50 px-3 py-3 text-sm font-semibold text-red-600 transition hover:bg-red-100 w-full mt-2"
            >
              <FiLogOut className="h-5 w-5" /> Cerrar Sesión
            </button>
          </nav>
        </div>
      )}
    </header>
  );
}
