# QonciliaFront - Buenas Practicas de Desarrollo

## Arquitectura base
- Mantener React + Tailwind + `react-icons` sin agregar librerias de UI para toast o modal.
- Centralizar llamadas HTTP en `src/api/apiClient.js`.
- Todo cambio que invoque API debe usar `apiClient` para no romper backdrop global ni manejo de JWT expirado.

## Autenticacion y seguridad
- Guardar token y usuario solo en `AuthContext`.
- Si la API responde `TOKEN_EXPIRED` o 401 por expiracion, cerrar sesion y redirigir a `/login` con toast explicativo.
- No mostrar rutas protegidas sin `ProtectedRoute`.

## Roles y permisos
- Roles validos: `gestor`, `admin`, `superadmin`.
- Para pantallas de ABM usuario, respetar reglas:
  - `superadmin`: administra gestores, admins y superadmins.
  - `admin`: administra solo gestores.
  - `gestor`: sin ABM de usuarios.
- No confiar solo en front: siempre esperar validacion final del backend.

## UI/UX obligatoria
- Toast personalizado: usar `ToastContext`, nunca librerias externas.
- Backdrop global: toda llamada HTTP debe disparar backdrop durante procesamiento.
- Todo elemento clickeable debe tener cursor tipo pointer.
- Toda ventana/modal debe cerrar con tecla `Escape` usando `useEscapeKey`.

## Calidad de codigo
- Componentes pequenos y reutilizables.
- Evitar logica duplicada entre paginas; extraer helpers a `utils` o hooks.
- Mantener nomenclatura de campos alineada con backend (`usrNombre`, `usrLogin`, etc.).
- En errores, mostrar mensajes al usuario via toast (no `alert`).

## Checklist antes de merge
- Verificar flujo: register -> login -> home.
- Verificar expiracion JWT redirige a login y muestra toast.
- Verificar ABM usuario respeta restricciones por rol.
- Verificar modales cierran con `Escape` y backdrop aparece en llamadas API.

