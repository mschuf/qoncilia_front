import { useMemo } from "react";
import { FiActivity, FiKey, FiLayers, FiUsers } from "react-icons/fi";
import { useAuth } from "../context/AuthContext";
import type { HomeCard } from "../types/pages/home-page.types";
import { isSuperAdminRole, roleLabel } from "../utils/role";

export default function HomePage() {
  const { user, role } = useAuth();

  const cards = useMemo<HomeCard[]>(() => {
    const base: HomeCard[] = [
      {
        title: "Sesion activa",
        description: "Tu token JWT sigue vigente y la API ya esta lista para operar conciliaciones.",
        icon: FiActivity
      },
      {
        title: "Conciliacion Excel",
        description: "Subi el archivo del sistema y el del banco, corre el layout y revisa matches automaticos y manuales.",
        icon: FiLayers
      }
    ];

    if (isSuperAdminRole(role)) {
      base.push({
        title: "Control total",
        description: "Ademas de usuarios, puedes asignar bancos y editar layouts por cada usuario.",
        icon: FiUsers
      });
    } else if (role === "admin") {
      base.push({
        title: "Operacion guiada",
        description: "Tus bancos y layouts vienen filtrados por usuario para que entres directo a conciliar.",
        icon: FiUsers
      });
    } else {
      base.push({
        title: "Acceso operativo",
        description: "Tu rol se mantiene enfocado en la operativa del sistema y seguimiento personal.",
        icon: FiKey
      });
    }

    return base;
  }, [role]);

  return (
    <section className="space-y-8">
      <div className="card-surface rounded-3xl border border-slate-200/60 p-8 sm:p-12 shadow-sm relative overflow-hidden bg-white">
        <div className="relative z-10">
          <p className="text-xs uppercase tracking-widest text-slate-500 font-bold mb-3">Panel Principal</p>
          <h2 className="text-4xl sm:text-5xl font-extrabold text-slate-900 tracking-tight">
            Hola, {user?.usrNombre ? `${user.usrNombre} ${user?.usrApellido ?? ""}`.trim() : user?.usrLogin}
          </h2>
          <div className="mt-6 inline-flex items-center gap-2 rounded-full bg-slate-100 px-4 py-2 text-sm font-medium text-slate-700">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
            </span>
            {roleLabel(role)}
          </div>
          <p className="mt-3 max-w-2xl text-sm text-slate-600">
            Qoncilia ahora trabaja con el modelo <strong>usuario + banco + layout</strong>. Desde
            <strong> Conciliar</strong> operas la mesa y desde <strong>Layouts</strong> el superadmin
            define la lectura de ambos Excel.
          </p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <article key={card.title} className="card-surface group rounded-3xl border border-slate-200/60 p-6 sm:p-8 hover:shadow-md hover:border-slate-300/80 transition-all duration-300 bg-white">
              <div className="mb-6 inline-flex rounded-2xl bg-slate-50 p-4 text-slate-800 ring-1 ring-slate-200/50 group-hover:scale-110 group-hover:bg-slate-900 group-hover:text-white transition-all duration-300">
                <Icon className="h-6 w-6" />
              </div>
              <h3 className="text-xl font-bold text-slate-900">{card.title}</h3>
              <p className="mt-3 text-base text-slate-500 leading-relaxed">{card.description}</p>
            </article>
          );
        })}
      </div>
    </section>
  );
}
