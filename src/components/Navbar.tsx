import { useEffect, useRef, useState } from "react";
import {
  FiActivity,
  FiBriefcase,
  FiChevronDown,
  FiGrid,
  FiHome,
  FiLogOut,
  FiMenu,
  FiSettings,
  FiShield,
  FiServer,
  FiUser,
  FiX,
} from "react-icons/fi";
import { NavLink } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { APP_MODULE_VALUES } from "../utils/modules";
import { isSuperAdminRole, roleLabel } from "../utils/role";

export default function Navbar() {
  const { user, role, logout, hasModule } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const handlePointerDown = (event: MouseEvent) => {
      if (
        profileRef.current &&
        event.target instanceof Node &&
        !profileRef.current.contains(event.target)
      ) {
        setIsProfileMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, []);

  const navLinks = [
    {
      to: "/",
      icon: <FiHome className="h-4 w-4" />,
      label: "Home",
      show: hasModule(APP_MODULE_VALUES.home),
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
      label: isSuperAdminRole(role) ? "Layouts" : "Bancos",
      show: hasModule(APP_MODULE_VALUES.layoutManagement),
    },
    {
      to: "/access-control",
      icon: <FiGrid className="h-4 w-4" />,
      label: "Accesos",
      show: isSuperAdminRole(role) && hasModule(APP_MODULE_VALUES.accessMatrix),
    },
    {
      to: "/erp-management",
      icon: <FiServer className="h-4 w-4" />,
      label: isSuperAdminRole(role) ? "Empresas" : "Mi Empresa",
      show: hasModule(APP_MODULE_VALUES.erpManagement),
    },
  ];

  const displayName = user?.usrNombre
    ? `${user.usrNombre} ${user?.usrApellido ?? ""}`.trim()
    : user?.usrLogin;

  return (
    <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/95 backdrop-blur">
      <div className="mx-auto flex w-full max-w-7xl items-center justify-between px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-brand-100 p-2 text-brand-700">
            <FiShield className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-brand-600">Qoncilia</p>
          </div>
        </div>

        <nav className="ml-4 mr-4 hidden flex-1 items-center justify-center overflow-x-auto no-scrollbar lg:flex">
          <div className="flex items-center gap-2">
            {navLinks
              .filter((link) => link.show)
              .map((link) => (
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

        <div className="flex items-center gap-2">
          <div ref={profileRef} className="relative">
            <button
              type="button"
              onClick={() => setIsProfileMenuOpen((current) => !current)}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
              aria-label="Abrir menu de perfil"
            >
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-900 text-white">
                <FiUser className="h-4 w-4" />
              </span>
              <FiChevronDown className="hidden h-4 w-4 lg:block" />
            </button>

            {isProfileMenuOpen ? (
              <div className="absolute right-0 top-[calc(100%+0.75rem)] z-40 w-72 rounded-2xl border border-slate-200 bg-white p-3 shadow-xl">
                <div className="rounded-2xl bg-slate-50 px-4 py-3">
                  <p className="text-sm font-bold text-slate-900">{displayName ?? "-"}</p>
                  <p className="mt-1 text-xs uppercase tracking-[0.12em] text-slate-500">
                    {roleLabel(role)}
                  </p>
                  {user?.companyName ? (
                    <div className="mt-3 rounded-xl border border-slate-200 bg-white px-3 py-2.5">
                      <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-400">
                        Mi empresa
                      </p>
                      <p className="mt-1 text-sm font-semibold text-slate-800">{user.companyName}</p>
                      {user.companyCode ? (
                        <p className="mt-1 text-xs text-slate-500">ID fiscal: {user.companyCode}</p>
                      ) : null}
                    </div>
                  ) : null}
                </div>

                {hasModule(APP_MODULE_VALUES.profile) ? (
                  <NavLink
                    to="/mis-datos"
                    onClick={() => setIsProfileMenuOpen(false)}
                    className={({ isActive }) =>
                      `mt-3 flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold transition ${
                        isActive
                          ? "bg-slate-900 text-white"
                          : "text-slate-700 hover:bg-slate-50"
                      }`
                    }
                  >
                    <FiUser className="h-4 w-4" /> Mis Datos
                  </NavLink>
                ) : null}

                {hasModule(APP_MODULE_VALUES.erpManagement) ? (
                  <NavLink
                    to="/erp-management"
                    onClick={() => setIsProfileMenuOpen(false)}
                    className={({ isActive }) =>
                      `mt-2 flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold transition ${
                        isActive
                          ? "bg-slate-900 text-white"
                          : "text-slate-700 hover:bg-slate-50"
                      }`
                    }
                  >
                    <FiBriefcase className="h-4 w-4" />
                    {isSuperAdminRole(role) ? "Empresas" : "Mi Empresa"}
                  </NavLink>
                ) : null}

                <button
                  type="button"
                  onClick={() => logout({ showToast: true })}
                  className="mt-2 flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold text-rose-600 transition hover:bg-rose-50"
                >
                  <FiLogOut className="h-4 w-4" /> Cerrar sesion
                </button>
              </div>
            ) : null}
          </div>

          <div className="lg:hidden">
            <button
              type="button"
              onClick={() => setIsMobileMenuOpen((current) => !current)}
              className="rounded-lg bg-slate-100 p-2 text-slate-600 transition hover:bg-slate-200 focus:outline-none"
              aria-label="Abrir menu"
            >
              {isMobileMenuOpen ? (
                <FiX className="h-6 w-6" />
              ) : (
                <FiMenu className="h-6 w-6" />
              )}
            </button>
          </div>
        </div>
      </div>

      {isMobileMenuOpen ? (
        <div className="max-h-[calc(100vh-70px)] overflow-y-auto border-t border-slate-200 bg-white lg:hidden">
          <nav className="flex flex-col space-y-2 px-4 py-4">
            {navLinks
              .filter((link) => link.show)
              .map((link) => (
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
          </nav>
        </div>
      ) : null}
    </header>
  );
}
