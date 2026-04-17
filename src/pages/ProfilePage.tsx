import type { ChangeEvent, FormEvent } from "react";
import { useEffect, useState } from "react";
import { FiCheck, FiLock, FiUser } from "react-icons/fi";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { apiClient } from "../api/apiClient";
import PhoneInput from "react-phone-number-input";
import "react-phone-number-input/style.css";
import { isValidInternationalPhoneNumber } from "../utils/phone";

export default function ProfilePage() {
  const { user, updateUser } = useAuth();
  const toast = useToast();
  
  const [formData, setFormData] = useState({
    usrNombre: "",
    usrApellido: "",
    usrCelular: "",
  });

  const [passwordData, setPasswordData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: ""
  });

  useEffect(() => {
    if (user) {
      setFormData({
        usrNombre: user.usrNombre || "",
        usrApellido: user.usrApellido || "",
        usrCelular: user.usrCelular || "",
      });
    }
  }, [user]);

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handlePhoneChange = (value?: string) => {
    setFormData({ ...formData, usrCelular: value || "" });
  };

  const handlePasswordChange = (e: ChangeEvent<HTMLInputElement>) => {
    setPasswordData({ ...passwordData, [e.target.name]: e.target.value });
  };

  const updateProfile = async (e: FormEvent) => {
    e.preventDefault();
    
    if (formData.usrCelular && !isValidInternationalPhoneNumber(formData.usrCelular)) {
      toast.error("El número de celular ingresado no es válido.");
      return;
    }

    try {
      const updatedUser = await apiClient.patch(`/users/${user?.id}`, {
        usrNombre: formData.usrNombre,
        usrApellido: formData.usrApellido,
        usrCelular: formData.usrCelular
      });
      // @ts-expect-error type override
      updateUser({ ...user, ...updatedUser });
      toast.success("Perfil actualizado correctamente.");
    } catch (error) {
      toast.error("Error al actualizar el perfil.");
    }
  };

  const updatePassword = async (e: FormEvent) => {
    e.preventDefault();
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast.error("Las contraseñas no coinciden.");
      return;
    }
    
    try {
      // Assuming conventional endpoint for password change
      await apiClient.post(`/users/${user?.id}/change-password`, {
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword
      });
      toast.success("Contraseña actualizada.");
      setPasswordData({ currentPassword: "", newPassword: "", confirmPassword: "" });
    } catch (error) {
      toast.error("Error al cambiar la contraseña.");
    }
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h2 className="text-2xl font-extrabold text-slate-800 tracking-tight">Mis Datos</h2>
        <p className="text-sm text-slate-500 mt-1">Gestioná tu información personal y seguridad.</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <section className="card-surface rounded-2xl border border-slate-200/60 p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-5">
            <div className="rounded-xl bg-brand-50 p-2 text-brand-600">
              <FiUser className="h-5 w-5" />
            </div>
            <h3 className="text-lg font-bold text-slate-800">Información Personal</h3>
          </div>
          
          <form onSubmit={updateProfile} className="space-y-4">
            <label className="block space-y-1.5">
              <span className="text-sm font-semibold text-slate-700">Nombre</span>
              <input
                name="usrNombre"
                value={formData.usrNombre}
                onChange={handleChange}
                className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-all outline-none"
              />
            </label>
            <label className="block space-y-1.5">
              <span className="text-sm font-semibold text-slate-700">Apellido</span>
              <input
                name="usrApellido"
                value={formData.usrApellido}
                onChange={handleChange}
                className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-all outline-none"
              />
            </label>
            <label className="block space-y-1.5">
              <span className="text-sm font-semibold text-slate-700">Celular (con código de país)</span>
              <div className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm focus-within:border-brand-500 focus-within:ring-1 focus-within:ring-brand-500 transition-all bg-white">
                <PhoneInput
                  international
                  defaultCountry="PY"
                  value={formData.usrCelular}
                  onChange={handlePhoneChange}
                  className="outline-none w-full"
                />
              </div>
            </label>
            <button
              type="submit"
              className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-3 text-sm font-bold text-white transition hover:bg-slate-800 active:scale-[0.98]"
            >
              <FiCheck className="h-4 w-4" /> Guardar Cambios
            </button>
          </form>
        </section>

        <section className="card-surface rounded-2xl border border-slate-200/60 p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-5">
            <div className="rounded-xl bg-brand-50 p-2 text-brand-600">
              <FiLock className="h-5 w-5" />
            </div>
            <h3 className="text-lg font-bold text-slate-800">Seguridad</h3>
          </div>
          
          <form onSubmit={updatePassword} className="space-y-4">
            <label className="block space-y-1.5">
              <span className="text-sm font-semibold text-slate-700">Contraseña actual</span>
              <input
                type="password"
                name="currentPassword"
                value={passwordData.currentPassword}
                onChange={handlePasswordChange}
                required
                className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-all outline-none"
              />
            </label>
            <label className="block space-y-1.5">
              <span className="text-sm font-semibold text-slate-700">Nueva contraseña</span>
              <input
                type="password"
                name="newPassword"
                value={passwordData.newPassword}
                onChange={handlePasswordChange}
                required
                className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-all outline-none"
              />
            </label>
            <label className="block space-y-1.5">
              <span className="text-sm font-semibold text-slate-700">Confirmar nueva contraseña</span>
              <input
                type="password"
                name="confirmPassword"
                value={passwordData.confirmPassword}
                onChange={handlePasswordChange}
                required
                className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-all outline-none"
              />
            </label>
            <button
              type="submit"
              className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-3 text-sm font-bold text-white transition hover:bg-slate-800 active:scale-[0.98]"
            >
              <FiLock className="h-4 w-4" /> Cambiar Contraseña
            </button>
          </form>
        </section>
      </div>
    </div>
  );
}
