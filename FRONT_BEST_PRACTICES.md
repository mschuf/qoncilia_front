# QonciliaFront - Buenas Practicas de Desarrollo

## Arquitectura base

- Mantener React + Tailwind + `react-icons` sin agregar librerias de UI para toast o modal.
- Centralizar llamadas HTTP en `src/api/apiClient.js`.
- Todo cambio que invoque API debe usar `apiClient` para conservar backdrop global y manejo de JWT expirado.

## Autenticacion y seguridad

- Guardar token y usuario solo en `AuthContext`.
- Si la API responde `TOKEN_EXPIRED` o 401 por expiracion, cerrar sesion y redirigir a `/login` con toast explicativo.
- No mostrar rutas protegidas sin `ProtectedRoute`.

## Roles y permisos

- Roles validos: `gestor`, `admin`, `superadmin`.
- Para pantallas de ABM usuario:
  - `superadmin`: administra gestores, admins y superadmins.
  - `admin`: administra solo gestores.
  - `gestor`: sin ABM de usuarios.
- No confiar solo en front: siempre esperar validacion final del backend.

## UI/UX obligatoria

- Toast personalizado: usar `ToastContext`, nunca librerias externas.
- Backdrop global: toda llamada HTTP debe disparar backdrop durante procesamiento.
- Todo elemento clickeable debe tener cursor tipo pointer.
- Toda ventana/modal que sea cerrable debe cerrar con tecla `Escape` usando `useEscapeKey`.
- Si un modal no debe cerrarse con click afuera, usar `closeOnBackdrop={false}` en `AppModal`.
- El cierre por `Escape` se mantiene como comportamiento obligatorio salvo que sea un modal bloqueante de proceso critico.

## Arquitectura de paginas

Cada pagina compleja debe seguir este patron. No poner toda la logica en el archivo de la page.

```text
src/
  pages/
    MiFeaturePage.tsx
  hooks/
    useMiFeature.ts
  components/
    MiFeature/
      SeccionA.tsx
      SeccionB.tsx
      MiModal.tsx
      FormFields.tsx
  types/
    pages/
      mi-feature.types.ts
```

## Reglas

1. Page = orquestador liviano. Solo importa hook custom y componentes.
2. Hook = toda la logica. Estados, efectos, llamadas API y handlers.
3. Componentes = UI pura. Reciben datos y callbacks por props.
4. Tipos = en su archivo propio.
5. Modales complejos = componente propio con layout responsive.
6. Responsividad desde mobile hasta monitores grandes.

## Calidad de codigo

- Componentes pequenos y reutilizables.
- Evitar logica duplicada entre paginas; extraer helpers a `utils` o hooks.
- Mantener nomenclatura de campos alineada con backend.
- En errores, mostrar mensajes al usuario via toast.

## Checklist antes de merge

- Verificar flujo: register -> login -> home.
- Verificar expiracion JWT redirige a login y muestra toast.
- Verificar ABM usuario respeta restricciones por rol.
- Verificar modales cerrables con `Escape`.
- Verificar `closeOnBackdrop={false}` en modales que no deben cerrarse con click afuera.
- Verificar backdrop en llamadas API.
