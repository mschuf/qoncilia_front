import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  FiActivity,
  FiBriefcase,
  FiChevronDown,
  FiCreditCard,
  FiDatabase,
  FiGrid,
  FiHome,
  FiLayers,
  FiLogOut,
  FiMenu,
  FiSettings,
  FiShield,
  FiServer,
  FiUser,
  FiX,
} from "react-icons/fi";
import { Link, NavLink, useLocation } from "react-router-dom";
import { apiClient } from "../api/apiClient";
import { useAuth } from "../context/AuthContext";
import type { CompanyErpConfig } from "../types/erp";
import { APP_MODULE_VALUES } from "../utils/modules";
import { isAdminRole, isSuperAdminRole, roleLabel } from "../utils/role";

type NavigationLink = {
  to: string;
  icon: ReactNode;
  label: string;
  show: boolean;
};

type NavigationItem =
  | NavigationLink
  | {
      key: string;
      icon: ReactNode;
      label: string;
      show: boolean;
      children: NavigationLink[];
    };

export default function Navbar() {
  const { user, role, logout, hasModule } = useAuth();
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [profileErpConfigs, setProfileErpConfigs] = useState<
    CompanyErpConfig[]
  >([]);
  const profileRef = useRef<HTMLDivElement | null>(null);
  const navMenuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const handlePointerDown = (event: MouseEvent) => {
      if (
        profileRef.current &&
        event.target instanceof Node &&
        !profileRef.current.contains(event.target)
      ) {
        setIsProfileMenuOpen(false);
      }

      if (
        navMenuRef.current &&
        event.target instanceof Node &&
        !navMenuRef.current.contains(event.target)
      ) {
        setOpenDropdown(null);
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, []);

  useEffect(() => {
    if (!isProfileMenuOpen || !hasModule(APP_MODULE_VALUES.erpManagement))
      return;

    void apiClient
      .get<CompanyErpConfig[]>("/erp/configs?activeOnly=true", {
        showBackdrop: false,
      })
      .then((response) => setProfileErpConfigs(response ?? []))
      .catch(() => setProfileErpConfigs([]));
  }, [hasModule, isProfileMenuOpen]);

  const configurationLinks: NavigationLink[] = [
    {
      to: "/users",
      icon: <FiUser className="h-4 w-4" />,
      label: "Usuarios",
      show: hasModule(APP_MODULE_VALUES.users),
    },
    {
      to: "/layout-management",
      icon: <FiSettings className="h-4 w-4" />,
      label: "Plantillas",
      show: isSuperAdminRole(role) && hasModule(APP_MODULE_VALUES.layoutManagement),
    },
    {
      to: "/admin-plantillas",
      icon: <FiLayers className="h-4 w-4" />,
      label: "Plantillas",
      show: isAdminRole(role) && !isSuperAdminRole(role) && hasModule(APP_MODULE_VALUES.layoutManagement),
    },
    {
      to: "/access-control",
      icon: <FiGrid className="h-4 w-4" />,
      label: "Accesos",
      show: isSuperAdminRole(role) && hasModule(APP_MODULE_VALUES.accessMatrix),
    },
  ];

  const bankLinks: NavigationLink[] = [
    {
      to: "/banks",
      icon: <FiBriefcase className="h-4 w-4" />,
      label: "Gestión Bancos",
      show: isAdminRole(role) && hasModule(APP_MODULE_VALUES.layoutManagement),
    },
    {
      to: "/bank-accounts",
      icon: <FiCreditCard className="h-4 w-4" />,
      label: "Cuentas",
      show: isAdminRole(role) && hasModule(APP_MODULE_VALUES.layoutManagement),
    },
  ];

  const conciliationLinks: NavigationLink[] = [
    {
      to: "/bank-statements",
      icon: <FiDatabase className="h-4 w-4" />,
      label: "Cargar Extractos",
      show: hasModule(APP_MODULE_VALUES.conciliation),
    },
    {
      to: "/conciliation",
      icon: <FiActivity className="h-4 w-4" />,
      label: "Conciliar",
      show: hasModule(APP_MODULE_VALUES.conciliation),
    },
  ];

  const visibleConfigLinks = configurationLinks.filter((link) => link.show);
  const visibleBankLinks = bankLinks.filter((link) => link.show);
  const visibleConciliationLinks = conciliationLinks.filter((link) => link.show);

  const navLinks: NavigationItem[] = [
    {
      key: "configuracion",
      icon: <FiSettings className="h-4 w-4" />,
      label: "Configuración",
      show: visibleConfigLinks.length > 0,
      children: visibleConfigLinks,
    },
    {
      key: "bancos",
      icon: <FiBriefcase className="h-4 w-4" />,
      label: "Bancos",
      show: visibleBankLinks.length > 0,
      children: visibleBankLinks,
    },
    {
      key: "conciliaciones",
      icon: <FiActivity className="h-4 w-4" />,
      label: "Conciliaciones",
      show: visibleConciliationLinks.length > 0,
      children: visibleConciliationLinks,
    },
  ];

  const displayName = user?.usrNombre
    ? `${user.usrNombre} ${user?.usrApellido ?? ""}`.trim()
    : user?.usrLogin;

  return (
    <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/95 backdrop-blur">
      <div className="mx-auto flex w-full max-w-7xl items-center justify-between px-4 py-3">
        <Link to="/" className="flex items-center gap-3 transition hover:opacity-80">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-brand-100 p-1 text-brand-700">
            {user?.companyLogo ? (
              <img src={user.companyLogo} alt={user.companyName ?? "Logo Empresa"} className="h-full w-full object-contain" />
            ) : (
              <FiShield className="h-5 w-5" />
            )}
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-brand-600 font-black truncate max-w-[150px]">
              {user?.companyName ? user.companyName : "Qoncilia"}
            </p>
          </div>
        </Link>

        <nav className="ml-4 mr-4 hidden flex-1 items-center justify-center lg:flex">
          <div ref={navMenuRef} className="flex items-center gap-2">
            {navLinks
              .filter((link) => link.show)
              .map((link) => {
                if ("children" in link) {
                  const isActiveMenu = link.children.some(
                    (child) =>
                      location.pathname === child.to ||
                      location.pathname.startsWith(`${child.to}/`)
                  );
                  const isMenuOpen = openDropdown === link.key;

                  return (
                    <div key={link.key} className="relative">
                      <button
                        type="button"
                        onClick={() => setOpenDropdown(isMenuOpen ? null : link.key)}
                        className={`whitespace-nowrap rounded-xl px-4 py-2 text-sm font-semibold transition-all ${
                          isActiveMenu
                            ? "bg-slate-900 text-white shadow-md"
                            : "text-slate-600 hover:bg-slate-100"
                        }`}
                        aria-expanded={isMenuOpen}
                        aria-haspopup="menu"
                      >
                        <span className="flex items-center gap-2">
                          {link.icon} {link.label}
                          <FiChevronDown
                            className={`h-4 w-4 transition ${isMenuOpen ? "rotate-180" : ""}`}
                          />
                        </span>
                      </button>

                      {isMenuOpen ? (
                        <div className="absolute left-0 top-[calc(100%+0.6rem)] z-40 w-56 rounded-2xl border border-slate-200 bg-white p-2 shadow-xl">
                          {link.children.map((child) => (
                            <NavLink
                              key={child.to}
                              to={child.to}
                              onClick={() => setOpenDropdown(null)}
                              className={({ isActive }) =>
                                `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition ${
                                  isActive
                                    ? "bg-slate-900 text-white"
                                    : "text-slate-700 hover:bg-slate-50"
                                }`
                              }
                            >
                              {child.icon} {child.label}
                            </NavLink>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  );
                }

                return (
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
                );
              })}
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
                  <p className="text-sm font-bold text-slate-900">
                    {displayName ?? "-"}
                  </p>
                  <p className="mt-1 text-xs uppercase tracking-[0.12em] text-slate-500">
                    {roleLabel(role)}
                  </p>
                  {user?.companyName ? (
                    <NavLink
                      to="/mi-empresa"
                      onClick={() => setIsProfileMenuOpen(false)}
                      className="mt-3 block rounded-xl border border-slate-200 bg-white px-3 py-2.5 transition hover:bg-slate-50 hover:border-brand-300"
                    >
                      <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-400">
                        Mi empresa
                      </p>
                      <p className="mt-1 text-sm font-semibold text-slate-800">
                        {user.companyName}
                      </p>
                      {user.companyCode ? (
                        <p className="mt-1 text-xs text-slate-500">
                          ID fiscal: {user.companyCode}
                        </p>
                      ) : null}
                    </NavLink>
                  ) : null}
                </div>

                {hasModule(APP_MODULE_VALUES.erpManagement) ? (
                  <div className="mt-3 rounded-2xl border border-slate-200 p-2">
                    <div className="px-2 pb-1">
                      <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-400">
                        ERPs activas
                      </p>
                    </div>
                    {profileErpConfigs.slice(0, 4).map((config) => (
                      <NavLink
                        key={config.id}
                        to={`/erp-management?configId=${config.id}`}
                        onClick={() => setIsProfileMenuOpen(false)}
                        className={({ isActive }) =>
                          `mt-1 flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition ${
                            isActive
                              ? "bg-slate-900 text-white"
                              : "text-slate-700 hover:bg-slate-50"
                          }`
                        }
                      >
                        <FiServer className="h-4 w-4" />
                        <span className="min-w-0 flex-1 truncate">
                          {config.name}
                        </span>
                      </NavLink>
                    ))}
                    {profileErpConfigs.length === 0 ? (
                      <NavLink
                        to="/erp-management"
                        onClick={() => setIsProfileMenuOpen(false)}
                        className="mt-1 flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                      >
                        <FiBriefcase className="h-4 w-4" />
                        Configurar ERP
                      </NavLink>
                    ) : null}
                    {profileErpConfigs.length > 4 ? (
                      <NavLink
                        to="/erp-management"
                        onClick={() => setIsProfileMenuOpen(false)}
                        className="mt-1 flex items-center gap-3 rounded-xl px-3 py-2.5 text-xs font-bold uppercase tracking-[0.12em] text-brand-600 transition hover:bg-brand-50"
                      >
                        Ver todas
                      </NavLink>
                    ) : null}
                  </div>
                ) : null}

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
              .map((link) => {
                if ("children" in link) {
                  const isActiveMenu = link.children.some(
                    (child) =>
                      location.pathname === child.to ||
                      location.pathname.startsWith(`${child.to}/`)
                  );
                  const isMenuOpen = openDropdown === link.key || isActiveMenu;

                  return (
                    <div key={link.key} className="space-y-2">
                      <button
                        type="button"
                        onClick={() => setOpenDropdown(isMenuOpen ? null : link.key)}
                        className={`flex w-full items-center justify-between rounded-xl px-4 py-3 text-sm font-semibold transition-all ${
                          isActiveMenu
                            ? "bg-slate-900 text-white shadow-md"
                            : "text-slate-600 hover:bg-slate-100"
                        }`}
                        aria-expanded={isMenuOpen}
                      >
                        <span className="flex items-center gap-3">
                          {link.icon} {link.label}
                        </span>
                        <FiChevronDown
                          className={`h-4 w-4 transition ${
                            isMenuOpen ? "rotate-180" : ""
                          }`}
                        />
                      </button>

                      {isMenuOpen ? (
                        <div className="ml-4 space-y-2 border-l border-slate-200 pl-3">
                          {link.children.map((child) => (
                            <NavLink
                              key={child.to}
                              to={child.to}
                              onClick={() => {
                                setIsMobileMenuOpen(false);
                                setOpenDropdown(null);
                              }}
                              className={({ isActive }) =>
                                `flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold transition-all ${
                                  isActive
                                    ? "bg-slate-900 text-white shadow-md"
                                    : "text-slate-600 hover:bg-slate-100"
                                }`
                              }
                            >
                              {child.icon} {child.label}
                            </NavLink>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  );
                }

                return (
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
                );
              })}
          </nav>
        </div>
      ) : null}
    </header>
  );
}
