import type { ChangeEvent, FormEvent } from "react";
import { useEffect, useRef, useState } from "react";
import { FiCamera, FiCheck, FiLock, FiTrash2, FiUser } from "react-icons/fi";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { ApiError, apiClient } from "../api/apiClient";
import "react-phone-number-input/style.css";
import InternationalPhoneField from "../components/forms/InternationalPhoneField";
import { isValidInternationalPhoneNumber } from "../utils/phone";
import { roleLabel } from "../utils/role";

export default function ProfilePage() {
  const { user, updateUser, role } = useAuth();
  const toast = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState({
    usrNombre: "",
    usrApellido: "",
    usrCelular: "",
    usrEmail: "",
    usrLogin: "",
    usrFoto: null as string | null,
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
        usrEmail: user.usrEmail || "",
        usrLogin: user.usrLogin || "",
        usrFoto: user.usrFoto || null,
      });
    }
  }, [user]);

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handlePhoneChange = (value?: string) => {
    setFormData({ ...formData, usrCelular: value || "" });
  };

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("El archivo debe ser una imagen.");
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      toast.error("La imagen no debe superar los 2MB.");
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const base64 = e.target?.result as string;
      setFormData((prev) => ({ ...prev, usrFoto: base64 }));
    };
    reader.readAsDataURL(file);
  };

  const handleClearPhoto = () => {
    setFormData((prev) => ({ ...prev, usrFoto: null }));
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
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
      const updatedUser = await apiClient.patch(`/users/me`, {
        usrNombre: formData.usrNombre,
        usrApellido: formData.usrApellido,
        usrCelular: formData.usrCelular,
        usrEmail: formData.usrEmail,
        usrLogin: formData.usrLogin,
        usrFoto: formData.usrFoto,
      });
      // @ts-expect-error type override
      updateUser({ ...user, ...updatedUser, enabledModules: user?.enabledModules });
      toast.success("Perfil actualizado correctamente.");
    } catch (error) {
      if (error instanceof ApiError) {
        toast.error(error.message);
      } else {
        toast.error("Error al actualizar el perfil.");
      }
    }
  };

  const updatePassword = async (e: FormEvent) => {
    e.preventDefault();
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast.error("Las contraseñas no coinciden.");
      return;
    }

    try {
      await apiClient.post(`/users/me/change-password`, {
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword
      });
      toast.success("Contraseña actualizada.");
      setPasswordData({ currentPassword: "", newPassword: "", confirmPassword: "" });
    } catch (error) {
      if (error instanceof ApiError) {
        toast.error(error.message);
      } else {
        toast.error("Error al cambiar la contraseña.");
      }
    }
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h2 className="text-2xl font-extrabold text-slate-800 tracking-tight">Mis Datos</h2>
        <p className="text-sm text-slate-500 mt-1">Gestioná tu información personal y seguridad.</p>
      </div>

      <div className="grid gap-6 md:grid-cols-12">
        <section className="card-surface rounded-2xl border border-slate-200/60 p-6 shadow-sm md:col-span-8">
          <div className="flex items-center gap-3 mb-5">
            <div className="rounded-xl bg-brand-50 p-2 text-brand-600">
              <FiUser className="h-5 w-5" />
            </div>
            <h3 className="text-lg font-bold text-slate-800">Información Personal</h3>
          </div>

          <form onSubmit={updateProfile} className="space-y-6">
            <div className="flex flex-col sm:flex-row gap-6">
              {/* Foto de Perfil */}
              <div className="flex flex-col items-center gap-4 sm:w-1/3">
                <div className="relative group">
                  <div className="flex h-32 w-32 items-center justify-center overflow-hidden rounded-full border-4 border-white shadow-lg bg-slate-50 transition-colors group-hover:border-brand-100">
                    {formData.usrFoto ? (
                      <img src={formData.usrFoto} alt="Foto de perfil" className="h-full w-full object-cover" />
                    ) : (
                      <FiUser className="h-12 w-12 text-slate-300 transition-colors group-hover:text-brand-400" />
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="absolute bottom-1 right-1 flex h-10 w-10 items-center justify-center rounded-full bg-slate-900 text-white shadow-lg transition hover:scale-105 hover:bg-slate-800"
                    title="Cambiar foto"
                  >
                    <FiCamera className="h-4 w-4" />
                  </button>
                </div>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept="image/png, image/jpeg"
                  className="hidden"
                />
                <p className="text-center text-xs font-semibold text-slate-500">
                  Formatos: JPG, PNG<br />
                  Max: 2MB
                </p>
                {formData.usrFoto ? (
                  <button
                    type="button"
                    onClick={handleClearPhoto}
                    className="inline-flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-bold text-rose-700 transition hover:bg-rose-100"
                  >
                    <FiTrash2 className="h-3.5 w-3.5" /> Quitar foto
                  </button>
                ) : null}
              </div>

              {/* Campos Editables */}
              <div className="space-y-4 sm:w-2/3">
                <div className="grid gap-4 sm:grid-cols-2">
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
                </div>
                <label className="block space-y-1.5">
                  <span className="text-sm font-semibold text-slate-700">Usuario Login</span>
                  <input
                    name="usrLogin"
                    value={formData.usrLogin}
                    onChange={handleChange}
                    required
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-all outline-none"
                  />
                </label>
                <label className="block space-y-1.5">
                  <span className="text-sm font-semibold text-slate-700">Celular</span>
                  <div className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm focus-within:border-brand-500 focus-within:ring-1 focus-within:ring-brand-500 transition-all bg-white">
                    <InternationalPhoneField
                      international
                      defaultCountry="PY"
                      value={formData.usrCelular}
                      onChange={handlePhoneChange}
                      countrySelectAriaLabel="Pais"
                      className="outline-none w-full"
                    />
                  </div>
                </label>
                <label className="block space-y-1.5">
                  <span className="text-sm font-semibold text-slate-700">Correo (Email)</span>
                  <input
                    name="usrEmail"
                    type="email"
                    value={formData.usrEmail}
                    onChange={handleChange}
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-all outline-none"
                  />
                </label>
                <button
                  type="submit"
                  className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-3 text-sm font-bold text-white transition hover:bg-slate-800 active:scale-[0.98]"
                >
                  <FiCheck className="h-4 w-4" /> Guardar Cambios
                </button>
              </div>
            </div>
          </form>
        </section>

        <section className="space-y-6 md:col-span-4 flex flex-col">
          {/* Read-Only Info */}
          <div className="card-surface rounded-2xl border border-slate-200/60 p-6 shadow-sm flex-1">
            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-widest mb-4">
              Datos del Sistema
            </h3>
            <div className="space-y-4">
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase">ID Usuario</p>
                <p className="font-medium text-slate-800">{user?.id}</p>
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase">Rol</p>
                <div className="mt-1 inline-flex items-center rounded-full bg-brand-50 px-2.5 py-1 text-xs font-bold text-brand-700">
                  {roleLabel(role)}
                </div>
              </div>
            </div>
          </div>

          <div className="card-surface rounded-2xl border border-slate-200/60 p-6 shadow-sm">
            <div className="flex items-center gap-3 mb-5">
              <div className="rounded-xl bg-brand-50 p-2 text-brand-600">
                <FiLock className="h-5 w-5" />
              </div>
              <h3 className="text-sm font-bold text-slate-800">Seguridad</h3>
            </div>

            <form onSubmit={updatePassword} className="space-y-4">
              <label className="block space-y-1.5">
                <span className="text-xs font-semibold text-slate-700">Contraseña actual</span>
                <input
                  type="password"
                  name="currentPassword"
                  value={passwordData.currentPassword}
                  onChange={handlePasswordChange}
                  required
                  className="w-full rounded-xl border border-slate-200 px-4 py-2 text-sm focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-all outline-none"
                />
              </label>
              <label className="block space-y-1.5">
                <span className="text-xs font-semibold text-slate-700">Nueva contraseña</span>
                <input
                  type="password"
                  name="newPassword"
                  value={passwordData.newPassword}
                  onChange={handlePasswordChange}
                  required
                  className="w-full rounded-xl border border-slate-200 px-4 py-2 text-sm focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-all outline-none"
                />
              </label>
              <label className="block space-y-1.5">
                <span className="text-xs font-semibold text-slate-700">Confirmar nueva</span>
                <input
                  type="password"
                  name="confirmPassword"
                  value={passwordData.confirmPassword}
                  onChange={handlePasswordChange}
                  required
                  className="w-full rounded-xl border border-slate-200 px-4 py-2 text-sm focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-all outline-none"
                />
              </label>
              <button
                type="submit"
                className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-slate-100 border border-slate-200 px-4 py-2.5 text-xs font-bold text-slate-700 transition hover:bg-slate-200 active:scale-[0.98]"
              >
                <FiLock className="h-3 w-3" /> Cambiar Contraseña
              </button>
            </form>
          </div>
        </section>
      </div>
    </div>
  );
}
