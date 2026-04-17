# Guia Detallada: Modulos por Empresa y Rol

## 1) Que es "Modulos por Empresa y Rol"?

Es la pantalla de **control de acceso dinamico (RBAC)** de Qoncilia. Permite al **Super Admin** activar o desactivar modulos (pantallas) del sistema para cada combinacion de **empresa + rol**.

Cada cambio impacta de forma inmediata en:

- **Menu de navegacion**: los links que ve el usuario en el sidebar/navbar.
- **Rutas protegidas**: si un usuario intenta acceder a una ruta deshabilitada, es redirigido al Home.
- **Endpoints del backend**: si el modulo no esta habilitado para el rol+empresa del usuario, la API responde `403 Forbidden`.

---

## 2) Quien puede acceder?

| Requisito                | Detalle                                               |
| ------------------------ | ----------------------------------------------------- |
| **Rol**                  | Solo `is_super_admin` (Super Admin)                   |
| **Modulo habilitado**    | `access_matrix` debe estar activo para su empresa+rol |
| **Ruta en el front**     | `/access-control`                                     |
| **Link en el navbar**    | "Accesos" (icono FiGrid)                              |

Si el usuario no es Super Admin o no tiene el modulo `access_matrix` habilitado, el link **no aparece** en el menu y la ruta redirige al Home.

---

## 3) Modelo de datos

La funcionalidad se apoya en **4 tablas** principales en PostgreSQL:

### 3.1) Tabla `roles`

| Columna           | Tipo         | Descripcion                         |
| ----------------- | ------------ | ----------------------------------- |
| `rol_id`          | SERIAL PK    | ID autoincremental                  |
| `rol_codigo`      | VARCHAR(50)  | Codigo unico (`is_super_admin`, `admin`, `gestor_cobranza`, `gestor_pagos`) |
| `rol_nombre`      | VARCHAR(120) | Nombre visible ("Super Admin", "Admin", etc.) |
| `rol_descripcion` | VARCHAR(255) | Descripcion opcional                |
| `rol_activo`      | BOOLEAN      | Si el rol esta activo               |

**Roles iniciales (seed)**:

- `is_super_admin` — Super Admin: acceso total al sistema
- `admin` — Admin: administra usuarios y operativa de conciliacion
- `gestor_cobranza` — Gestor Cobranza: gestion operativa orientada a cobranzas
- `gestor_pagos` — Gestor Pagos: gestion operativa orientada a pagos

### 3.2) Tabla `empresas`

| Columna        | Tipo         | Descripcion                |
| -------------- | ------------ | -------------------------- |
| `emp_id`       | SERIAL PK    | ID autoincremental         |
| `emp_codigo`   | VARCHAR(50)  | Codigo unico (ej: `QONCILIA`, `ACME`) |
| `emp_nombre`   | VARCHAR(160) | Nombre de la empresa       |
| `emp_activa`   | BOOLEAN      | Si la empresa esta activa  |

**Empresa inicial (seed)**: `QONCILIA`.

### 3.3) Tabla `modulos`

| Columna           | Tipo         | Descripcion                              |
| ----------------- | ------------ | ---------------------------------------- |
| `mod_id`          | SERIAL PK    | ID autoincremental                       |
| `mod_codigo`      | VARCHAR(80)  | Codigo unico (`home`, `profile`, `conciliation`, `users`, `layout_management`, `access_matrix`) |
| `mod_nombre`      | VARCHAR(120) | Nombre visible ("Inicio", "Conciliacion", etc.) |
| `mod_ruta`        | VARCHAR(160) | Ruta del frontend (`/`, `/conciliation`, etc.) |
| `mod_descripcion` | VARCHAR(255) | Descripcion opcional                     |
| `mod_activo`      | BOOLEAN      | Si el modulo esta activo globalmente     |

**Modulos iniciales (seed)**:

| Codigo              | Nombre                   | Ruta                |
| ------------------- | ------------------------ | ------------------- |
| `home`              | Inicio                   | `/`                 |
| `profile`           | Mis Datos                | `/mis-datos`        |
| `conciliation`      | Conciliacion             | `/conciliation`     |
| `users`             | Gestion de Usuarios      | `/users`            |
| `layout_management` | Gestion de Layouts       | `/layout-management`|
| `access_matrix`     | Modulos por Empresa y Rol| `/access-control`   |

### 3.4) Tabla `empresas_roles_modulos` (tabla pivot / matriz)

| Columna          | Tipo      | Descripcion                                           |
| ---------------- | --------- | ----------------------------------------------------- |
| `erm_id`         | SERIAL PK | ID autoincremental                                    |
| `emp_id`         | INTEGER   | FK → `empresas.emp_id` (ON DELETE CASCADE)            |
| `rol_id`         | INTEGER   | FK → `roles.rol_id` (ON DELETE CASCADE)               |
| `mod_id`         | INTEGER   | FK → `modulos.mod_id` (ON DELETE CASCADE)             |
| `erm_habilitado` | BOOLEAN   | `true` = modulo activo para esa empresa+rol           |

**Constraint unico**: `(emp_id, rol_id, mod_id)` — no puede haber duplicados.

### 3.5) Relacion con la tabla `usuarios`

Cada usuario tiene `emp_id` y `rol_id` (ambos NOT NULL). Cuando un usuario inicia sesion, el backend consulta la tabla `empresas_roles_modulos` para determinar que modulos tiene habilitados, y los incluye como `enabledModules` en el JWT/sesion.

### 3.6) Permisos iniciales (seed)

| Rol               | Modulos habilitados                                                      |
| ------------------ | ----------------------------------------------------------------------- |
| Super Admin        | home, profile, conciliation, users, layout_management, access_matrix    |
| Admin              | home, profile, conciliation, users                                      |
| Gestor Cobranza    | home, profile, conciliation                                             |
| Gestor Pagos       | home, profile, conciliation                                             |

---

## 4) Arquitectura del sistema

### 4.1) Backend (NestJS)

**Modulo**: `AccessControlModule`

**Archivos clave**:

```
QonciliaBack/src/access-control/
├── access-control.module.ts          # Registro del modulo NestJS
├── access-control.controller.ts      # Endpoints REST
├── access-control.service.ts         # Logica de negocio
├── dto/
│   ├── create-company.dto.ts         # Validacion para crear empresa
│   └── update-company-role-modules.dto.ts  # Validacion para actualizar modulos
├── entities/
│   ├── company.entity.ts             # Entidad TypeORM → tabla empresas
│   ├── user-role.entity.ts           # Entidad TypeORM → tabla roles
│   ├── app-module.entity.ts          # Entidad TypeORM → tabla modulos
│   └── company-role-module.entity.ts # Entidad TypeORM → tabla empresas_roles_modulos
└── interfaces/
    └── access-control.interfaces.ts  # Interfaces de respuesta
```

### 4.2) Frontend (React + Vite)

**Archivos clave**:

```
QonciliaFront/src/
├── pages/AccessControlPage.tsx       # Pagina principal de la UI
├── hooks/useAccessControl.ts         # Hook con estado y llamadas a la API
├── types/access-control.ts           # Interfaces TypeScript
├── components/
│   ├── Navbar.tsx                    # Link "Accesos" condicional
│   └── ProtectedRoute.tsx            # Guard de rutas (rol + modulo)
└── App.tsx                           # Definicion de la ruta /access-control
```

---

## 5) API del Backend — Endpoints

Todos los endpoints estan bajo el prefijo `/access-control` y protegidos por 3 guards:

1. **JwtAuthGuard**: verifica que el usuario este autenticado con un token JWT valido.
2. **RolesGuard**: verifica que el rol del usuario este en la lista permitida.
3. **ModuleAccessGuard**: verifica que el modulo requerido este en `enabledModules` del usuario.

### 5.1) GET `/access-control/reference`

**Proposito**: Obtener las listas de referencia (empresas, roles y modulos) para llenar los selectores de la UI.

**Permisos**: Roles `admin` o `is_super_admin` + modulo `users`.

**Respuesta** (`AccessControlReferenceResponse`):

```json
{
  "companies": [
    { "id": 1, "code": "QONCILIA", "name": "Qoncilia", "active": true }
  ],
  "roles": [
    { "id": 1, "code": "is_super_admin", "name": "Super Admin", "description": "...", "active": true },
    { "id": 2, "code": "admin", "name": "Admin", "description": "...", "active": true }
  ],
  "modules": [
    { "id": 1, "code": "home", "name": "Inicio", "routePath": "/", "description": "...", "active": true }
  ]
}
```

**Logica especial**:
- Si el actor es Super Admin → ve **todas** las empresas y **todos** los roles.
- Si el actor es Admin → ve solo **su** empresa y solo los roles `gestor_cobranza` y `gestor_pagos`.

### 5.2) POST `/access-control/companies`

**Proposito**: Crear una nueva empresa.

**Permisos**: Solo `is_super_admin` + modulo `access_matrix`.

**Body** (`CreateCompanyDto`):

```json
{
  "code": "ACME",
  "name": "Acme Corporation",
  "active": true
}
```

- `code` (string, obligatorio, max 50 chars): se normaliza a UPPER_CASE y espacios se reemplazan por `_`.
- `name` (string, obligatorio, max 160 chars): nombre visible de la empresa.
- `active` (boolean, opcional, default `true`): si la empresa esta activa.

**Respuesta** (`PublicCompany`):

```json
{
  "id": 2,
  "code": "ACME",
  "name": "Acme Corporation",
  "active": true
}
```

**Errores**:
- `409 Conflict`: si ya existe una empresa con ese codigo.
- `400 Bad Request`: si el codigo o nombre estan vacios.

### 5.3) GET `/access-control/matrix/:companyId`

**Proposito**: Obtener la **matriz completa** de modulos por rol para una empresa.

**Permisos**: Solo `is_super_admin` + modulo `access_matrix`.

**Parametros**: `companyId` (entero en la URL).

**Respuesta** (`CompanyRoleMatrixResponse`):

```json
{
  "company": { "id": 1, "code": "QONCILIA", "name": "Qoncilia", "active": true },
  "modules": [
    { "id": 1, "code": "home", "name": "Inicio", "routePath": "/", "description": "...", "active": true },
    { "id": 2, "code": "profile", "name": "Mis Datos", "routePath": "/mis-datos", "description": "...", "active": true }
  ],
  "rows": [
    {
      "role": { "id": 1, "code": "is_super_admin", "name": "Super Admin", "description": "...", "active": true },
      "modules": [
        { "moduleId": 1, "moduleCode": "home", "enabled": true },
        { "moduleId": 2, "moduleCode": "profile", "enabled": true },
        { "moduleId": 3, "moduleCode": "conciliation", "enabled": true },
        { "moduleId": 4, "moduleCode": "users", "enabled": true },
        { "moduleId": 5, "moduleCode": "layout_management", "enabled": true },
        { "moduleId": 6, "moduleCode": "access_matrix", "enabled": true }
      ]
    },
    {
      "role": { "id": 3, "code": "gestor_cobranza", "name": "Gestor Cobranza", "description": "...", "active": true },
      "modules": [
        { "moduleId": 1, "moduleCode": "home", "enabled": true },
        { "moduleId": 2, "moduleCode": "profile", "enabled": true },
        { "moduleId": 3, "moduleCode": "conciliation", "enabled": true },
        { "moduleId": 4, "moduleCode": "users", "enabled": false },
        { "moduleId": 5, "moduleCode": "layout_management", "enabled": false },
        { "moduleId": 6, "moduleCode": "access_matrix", "enabled": false }
      ]
    }
  ]
}
```

**Errores**:
- `404 Not Found`: si la empresa no existe.
- `403 Forbidden`: si el actor no es Super Admin.

### 5.4) PUT `/access-control/matrix/:companyId/roles/:roleId`

**Proposito**: Actualizar los modulos habilitados/deshabilitados para un rol especifico dentro de una empresa.

**Permisos**: Solo `is_super_admin` + modulo `access_matrix`.

**Parametros**: `companyId` y `roleId` (enteros en la URL).

**Body** (`UpdateCompanyRoleModulesDto`):

```json
{
  "moduleStates": [
    { "moduleId": 1, "enabled": true },
    { "moduleId": 2, "enabled": true },
    { "moduleId": 3, "enabled": false },
    { "moduleId": 4, "enabled": false },
    { "moduleId": 5, "enabled": false },
    { "moduleId": 6, "enabled": false }
  ]
}
```

- `moduleStates` (array, min 1, max 200 elementos):
  - `moduleId` (entero >= 1): ID del modulo.
  - `enabled` (boolean): si debe estar habilitado o no.

**Logica**:
1. Valida que el actor sea Super Admin.
2. Verifica que la empresa y el rol existan.
3. Deduplica por `moduleId` (si viene repetido, gana el ultimo).
4. Verifica que todos los `moduleId` existan en la tabla `modulos`.
5. Para cada modulo:
   - Si ya existe un registro en `empresas_roles_modulos` → **actualiza** `erm_habilitado`.
   - Si no existe → **crea** el registro con el estado indicado.
6. Guarda todos los cambios en una sola operacion.
7. **Retorna la matriz actualizada** completa (misma estructura que el GET).

**Respuesta**: `CompanyRoleMatrixResponse` (misma estructura del endpoint GET matrix).

**Errores**:
- `404 Not Found`: empresa o rol no encontrado, o modulo inexistente.
- `400 Bad Request`: si `moduleStates` esta vacio.
- `403 Forbidden`: si el actor no es Super Admin.

---

## 6) Guards y Decoradores

### 6.1) `@RequiredModule(AppModuleCode)`

Decorador que marca un endpoint con el codigo del modulo necesario. El `ModuleAccessGuard` lo lee y verifica que el modulo este en `enabledModules` del usuario autenticado.

```typescript
@RequiredModule(AppModuleCode.ACCESS_MATRIX)
```

### 6.2) `@Roles(Role.IS_SUPER_ADMIN)`

Decorador que restringe el acceso a los roles listados. El `RolesGuard` lo evalua.

### 6.3) `ModuleAccessGuard`

Guard que:
1. Lee el metadata `required_module` del endpoint.
2. Si no hay metadata → permite el acceso.
3. Si hay metadata → verifica que `user.enabledModules` contenga el codigo del modulo.
4. Si no lo contiene → lanza `403 Forbidden "No tenes habilitado este modulo."`.

---

## 7) Frontend — Paso a paso de uso

### 7.1) Acceder a la pantalla

1. Iniciar sesion como **Super Admin**.
2. En el **navbar**, hacer click en el link **"Accesos"** (icono de grilla).
3. Se carga la pagina `AccessControlPage` en la ruta `/access-control`.

### 7.2) Carga inicial

Al montar la pagina:
1. El hook `useAccessControl` llama a `GET /access-control/reference` para obtener la lista de empresas, roles y modulos.
2. Automaticamente selecciona la **primera empresa** de la lista.
3. Con la empresa seleccionada, llama a `GET /access-control/matrix/:companyId` para obtener la **matriz de acceso**.

### 7.3) Seleccionar una empresa

1. En el selector desplegable **"Empresa"**, elegir la empresa deseada.
2. El cambio de seleccion dispara automaticamente una nueva llamada a `GET /access-control/matrix/:companyId`.
3. La tabla de la matriz se actualiza mostrando los roles y sus modulos habilitados/deshabilitados para esa empresa.

### 7.4) Crear una nueva empresa

1. En el panel **"Nueva Empresa"** (lado derecho del header):
   - **Codigo**: ingresar un codigo corto (ej: `ACME`). Se normalizara a mayusculas y sin espacios.
   - **Nombre**: ingresar el nombre completo de la empresa (ej: "Acme Corporation").
2. Hacer click en **"Crear empresa"**.
3. Si es exitoso:
   - Aparece un toast de exito: "Empresa creada correctamente."
   - Se recarga la lista de empresas.
   - La nueva empresa se selecciona automaticamente.
   - La matriz se carga para la nueva empresa (inicialmente sin modulos habilitados).
4. Si hay error (ej: codigo duplicado):
   - Aparece un toast de error con el mensaje del backend.

### 7.5) Ver la matriz de acceso

La matriz se presenta como una **tabla** con:

- **Filas**: cada rol del sistema (Super Admin, Admin, Gestor Cobranza, Gestor Pagos).
- **Columnas**: cada modulo del sistema (Inicio, Mis Datos, Conciliacion, Gestion de Usuarios, Gestion de Layouts, Modulos por Empresa y Rol).
- **Celdas**: un **checkbox** que indica si el modulo esta habilitado (`checked`) o deshabilitado (`unchecked`) para ese rol en la empresa seleccionada.
- **Columna de acciones**: un boton **"Guardar"** por cada fila/rol.

### 7.6) Activar o desactivar un modulo

1. En la fila del **rol** deseado, hacer click en el **checkbox** del modulo que queres activar o desactivar.
2. El cambio se refleja **localmente** en la tabla (es optimista, aun no se guardo en el servidor).
3. Podes activar/desactivar varios modulos para el mismo rol antes de guardar.

### 7.7) Guardar los cambios de un rol

1. Hacer click en el boton **"Guardar"** (icono FiSave) de la fila del rol que modificaste.
2. El hook envia un `PUT /access-control/matrix/:companyId/roles/:roleId` con el estado actual de **todos** los modulos de ese rol.
3. Si es exitoso:
   - Toast de exito: "Modulos actualizados para [nombre del rol]."
   - La matriz se refresca con los datos confirmados del servidor.
4. Si hay error:
   - Toast de error.
   - La matriz **no** se revierte automaticamente (los checkboxes quedan como los dejaste).

### 7.8) Recargar la matriz

Si necesitas refrescar los datos (ej: otro admin hizo cambios), hacer click en el boton **"Recargar"** (icono FiRefreshCcw). Esto vuelve a llamar al endpoint `GET /access-control/matrix/:companyId`.

---

## 8) Flujo completo (secuencia)

```
Usuario (Super Admin)
    │
    ├─ 1. Abre /access-control
    │
    ├─ 2. Frontend llama GET /access-control/reference
    │      ← { companies, roles, modules }
    │
    ├─ 3. Frontend auto-selecciona primera empresa
    │      y llama GET /access-control/matrix/1
    │      ← { company, modules, rows: [{ role, modules: [{ moduleId, enabled }] }] }
    │
    ├─ 4. Usuario ve la tabla y hace toggle de checkboxes
    │      (cambios locales en el estado React)
    │
    ├─ 5. Usuario hace click en "Guardar" de un rol
    │      Frontend llama PUT /access-control/matrix/1/roles/3
    │      Body: { moduleStates: [{ moduleId: 1, enabled: true }, ...] }
    │      ← Matriz actualizada completa
    │
    └─ 6. Toast de exito. Los usuarios de ese rol+empresa
           veran los cambios en su proximo login/recarga.
```

---

## 9) Impacto en el resto del sistema

### 9.1) Navegacion (Navbar)

El componente `Navbar.tsx` construye los links de navegacion basandose en:

- `hasModule(moduleCode)` → verifica si el modulo esta en `enabledModules` del usuario actual.
- Para algunos links, tambien verifica el rol (ej: "Layouts" y "Accesos" solo para Super Admin).

Si un modulo es deshabilitado para un rol+empresa, los usuarios con esa combinacion **dejaran de ver** el link correspondiente en el menu.

### 9.2) Rutas protegidas (ProtectedRoute)

El componente `ProtectedRoute.tsx` actua como guard en las rutas de React Router:

1. Si el usuario no esta autenticado → redirige a `/login`.
2. Si tiene restriccion de `roles` y el usuario no cumple → redirige a `/`.
3. Si tiene `requiredModule` y el usuario no tiene ese modulo habilitado → redirige a `/`.

### 9.3) Backend (ModuleAccessGuard)

En el backend, cada endpoint protegido con `@RequiredModule(...)` pasa por el `ModuleAccessGuard`:

- Lee `user.enabledModules` del token JWT.
- Si el modulo requerido no esta en la lista → `403 Forbidden`.

Esto significa que incluso si alguien intenta acceder directamente a la API (sin el frontend), el backend igualmente rechaza la solicitud si el modulo no esta habilitado.

---

## 10) Consideraciones importantes

### 10.1) Cambios no son en tiempo real

Los cambios en la matriz toman efecto cuando el usuario afectado **vuelve a iniciar sesion** o **recarga la pagina** (ya que los modulos habilitados viajan en el token JWT o se recalculan al autenticar).

### 10.2) Cuidado al deshabilitar `access_matrix` para Super Admin

Si el Super Admin deshabilita el modulo `access_matrix` para su propio rol, **perdera acceso a esta pantalla**. Habria que restaurar el acceso manualmente en la base de datos.

### 10.3) Empresas sin modulos

Cuando se crea una nueva empresa, **no tiene modulos asignados por defecto**. El Super Admin debe entrar a la matriz de esa empresa y habilitar los modulos necesarios para cada rol.

### 10.4) Triggers de actualizacion

Todas las tablas tienen triggers que actualizan automaticamente la columna `*_updated_at` con `NOW()` cada vez que un registro es modificado. No es necesario manejar esto manualmente.

### 10.5) Cascade deletes

- Si se elimina una empresa → se eliminan todos sus registros de `empresas_roles_modulos`.
- Si se elimina un rol → se eliminan todos sus registros de `empresas_roles_modulos`.
- Si se elimina un modulo → se eliminan todos sus registros de `empresas_roles_modulos`.
- La relacion `usuarios → empresas/roles` usa `ON DELETE RESTRICT` (no se puede borrar una empresa/rol que tenga usuarios asignados).

---

## 11) Resumen de archivos involucrados

### Backend

| Archivo | Responsabilidad |
| ------- | --------------- |
| `sql/09_rbac_empresas_roles_modulos.sql` | Migracion SQL: crea tablas, triggers, seeds |
| `access-control/access-control.module.ts` | Modulo NestJS: registra providers y entidades |
| `access-control/access-control.controller.ts` | 4 endpoints REST con guards |
| `access-control/access-control.service.ts` | Logica de negocio: CRUD empresas, matriz, permisos |
| `access-control/entities/company.entity.ts` | Entidad TypeORM → tabla `empresas` |
| `access-control/entities/user-role.entity.ts` | Entidad TypeORM → tabla `roles` |
| `access-control/entities/app-module.entity.ts` | Entidad TypeORM → tabla `modulos` |
| `access-control/entities/company-role-module.entity.ts` | Entidad TypeORM → tabla `empresas_roles_modulos` |
| `access-control/dto/create-company.dto.ts` | DTO con validacion para crear empresa |
| `access-control/dto/update-company-role-modules.dto.ts` | DTO con validacion para actualizar modulos |
| `access-control/interfaces/access-control.interfaces.ts` | Interfaces de respuesta del servicio |
| `common/guards/module-access.guard.ts` | Guard que verifica `enabledModules` del usuario |
| `common/decorators/required-module.decorator.ts` | Decorador `@RequiredModule()` |
| `common/enums/app-module-code.enum.ts` | Enum con codigos de modulos |
| `common/enums/role.enum.ts` | Enum con codigos de roles |
| `common/interfaces/auth-user.interface.ts` | Interfaz del usuario autenticado (incluye `enabledModules`) |
| `common/utils/role.util.ts` | Utilidades: `isSuperAdminRole()` |

### Frontend

| Archivo | Responsabilidad |
| ------- | --------------- |
| `pages/AccessControlPage.tsx` | UI completa: header, formulario de empresa, selector, tabla-matriz |
| `hooks/useAccessControl.ts` | Estado React + llamadas API (reference, matrix, create, update) |
| `types/access-control.ts` | Interfaces TS del frontend |
| `components/Navbar.tsx` | Link "Accesos" condicionado a rol + modulo |
| `components/ProtectedRoute.tsx` | Guard de rutas: verifica rol y modulo habilitado |
| `App.tsx` | Registro de la ruta `/access-control` con proteccion |
| `api/apiClient.ts` | Cliente HTTP generico usado por el hook |
