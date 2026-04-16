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

## Arquitectura de paginas — Separacion de logica y UI

Cada pagina compleja debe seguir este patron. **No poner toda la logica en el archivo de la page.**

### Estructura obligatoria

```
src/
├── pages/
│   └── MiFeaturePage.tsx          ← Solo orquestacion: importa hook + componentes, conecta props
├── hooks/
│   └── useMiFeature.ts            ← TODA la logica: state, effects, handlers, llamadas API
├── components/
│   └── MiFeature/                 ← Carpeta propia por feature
│       ├── SeccionA.tsx            ← Componente de UI puro (recibe datos por props)
│       ├── SeccionB.tsx
│       ├── MiModal.tsx
│       └── FormFields.tsx          ← Campos reutilizables dentro del feature
├── types/
│   └── pages/
│       └── mi-feature.types.ts    ← Tipos, constantes y defaults del formulario
```

### Reglas

1. **Page = orquestador liviano.** Solo importa el hook custom y los componentes, los conecta via props. Cero logica de negocio, cero useState/useEffect directo.
2. **Hook = toda la logica.** Estados, efectos, llamadas API, handlers de formulario, open/close de modales. Devuelve un objeto con lo necesario para la UI.
3. **Componentes = UI pura.** Reciben datos y callbacks por props, nunca llaman a `apiClient` directo. Viven en `src/components/NombreFeature/`.
4. **Tipos = en su archivo propio.** Form states, constants y defaults van en `src/types/pages/nombre-feature.types.ts`.
5. **Modales complejos = componente propio.** Si un modal tiene muchos campos (como el editor de layouts), usar un componente dedicado con su propio layout responsive en vez del `AppModal` generico con `max-w-2xl`. Usar `max-w-7xl` o full screen para editores con muchos campos.
6. **Responsividad.** Todo componente debe funcionar bien desde mobile hasta monitores grandes. Usar grids con breakpoints progresivos: `sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6`.

### Ejemplo real — LayoutManagementPage

```
pages/LayoutManagementPage.tsx           → orquestador (~120 lineas)
hooks/useLayoutManagement.ts             → logica completa (~250 lineas)
components/LayoutManagement/
  ├── BankListSection.tsx                → lista de bancos
  ├── LayoutListSection.tsx              → lista de layouts
  ├── BankModal.tsx                      → modal crear/editar banco
  ├── LayoutModal.tsx                    → modal crear/editar layout (full-width)
  ├── FormFields.tsx                     → InputField, SelectField, CheckField
  ├── MetricCards.tsx                    → MetricCard, MetricTile, ModalActions
  └── SideCard.tsx                       → card reutilizable para sistema/banco
types/pages/layout-management.types.ts   → MappingFormRow, BankFormState, LayoutFormState, etc.
```

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

