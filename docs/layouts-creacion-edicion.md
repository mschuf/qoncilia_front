# Guia Detallada: Creacion y Edicion de Layouts

## 1) Que es un layout?

Un **layout** define como Qoncilia debe leer y comparar dos archivos Excel:

- Excel del **sistema/ERP**
- Excel del **banco**

Cada layout tiene:

- Informacion general (nombre, etiquetas, threshold, activo)
- Una lista de **mappings** (reglas campo a campo)

Cada mapping le dice al sistema:

- que campo comparar (`fieldKey`, `label`)
- como compararlo (`compareOperator`, `required`, `weight`, `tolerance`)
- de donde leerlo en cada Excel (hoja, columna, filas, tipo de dato)

## 2) Flujo recomendado de uso

1. Seleccionar usuario.
2. Seleccionar banco.
3. Crear layout nuevo o editar uno existente.
4. Completar informacion general.
5. Configurar mappings (minimo 1).
6. Guardar.
7. Probar el layout en la pantalla de conciliacion con archivos reales.

## 3) Crear vs editar layout

### Crear layout nuevo

Usar cuando:

- el banco cambio formato de extracto
- queres separar reglas por tipo de cuenta/producto
- necesitas una estrategia de matching distinta

### Editar layout existente

Usar cuando:

- solo cambiaron columnas/hojas/rangos
- queres ajustar tolerancia, peso o threshold
- queres activar/desactivar reglas existentes

Importante: al editar, si se envian mappings, el backend **reemplaza toda la lista** por la nueva configuracion guardada.

## 4) Informacion general del layout (parte superior del modal)

### `Nombre` (obligatorio)

Nombre identificador del layout.

Recomendacion:

- incluir banco + tipo de extracto + version
- ejemplo: `Itau Corriente v2`

### `Threshold auto-match` (obligatorio, de 0 a 1)

Es el puntaje minimo para que una pareja de filas entre como match automatico. Si el score calculado es mayor o igual al threshold, el par se acepta.

- `1.00` = exige coincidencia total de peso evaluado (todos los campos activos deben pasar)
- `0.80` = permite que algunos campos secundarios fallen
- `0.50` = muy permisivo, solo la mitad del peso necesita coincidir
- `0.00` = acepta cualquier coincidencia que pase requeridos (no recomendado)

Regla backend:

- si no se informa, toma `1`
- si es menor a 0 o mayor a 1, rechaza el guardado

**Ejemplo con threshold `0.80`:**

Layout con 4 mappings: fecha (peso 2), monto (peso 3), descripcion (peso 1), referencia (peso 1). Total peso = 7.

| Escenario                            | Campos que pasan        | Score       | Auto-match? |
|--------------------------------------|-------------------------|-------------|-------------|
| Todo coincide                        | fecha+monto+desc+ref    | 7/7 = 1.00  | ✅ si        |
| Referencia no coincide               | fecha+monto+desc        | 6/7 = 0.86  | ✅ si        |
| Descripcion y referencia no coinciden| fecha+monto             | 5/7 = 0.71  | ❌ no        |
| Solo monto coincide                  | monto                   | 3/7 = 0.43  | ❌ no        |

**Guia de valores recomendados:**

| Situacion                                      | Threshold |
|------------------------------------------------|-----------|
| Extractos bancarios muy limpios y consistentes | `1.00`    |
| Extractos con variaciones menores en texto     | `0.80`    |
| Multiples bancos con formatos variables        | `0.70`    |
| Primera prueba exploratoria                    | `0.60`    |

### `Etiqueta sistema` (obligatorio)

Nombre mostrado para el lado izquierdo del mapping (archivo ERP/sistema).

Ejemplo: `Sistema / ERP`, `Core`, `Backoffice`.

### `Etiqueta banco` (obligatorio)

Nombre mostrado para el lado derecho del mapping (archivo banco).

Ejemplo: `Itau`, `Sudameris`, `Extracto banco`.

### `Descripcion` (opcional)

Texto libre para dejar contexto funcional.

Ejemplo:

`Layout para cuenta corriente PYG con extracto mensual en formato nuevo (desde enero 2026).`

### `Dejar este layout activo` (checkbox)

Solo puede haber **un layout activo por banco**.

Comportamiento:

- si guardas uno activo, los demas del mismo banco quedan inactivos
- al crear el primer layout de un banco, queda activo por defecto

## 5) Mappings de campos (parte principal del modal)

Cada fila representa una regla de comparacion entre ambos archivos.

### 5.1 Campos base del mapping

#### `fieldKey` (obligatorio)

Clave tecnica unica dentro del layout.

Buenas practicas:

- usar minusculas sin espacios
- usar guion bajo para separar palabras
- ejemplos: `fecha`, `monto`, `numero_comprobante`, `referencia`

Regla backend:

- no puede repetirse dentro del mismo layout

#### `Label` (obligatorio)

Nombre visible para usuarios.

Ejemplos: `Fecha`, `Monto`, `Nro Comprobante`.

#### `Operador`

Define como comparar el valor sistema vs banco. Elegir el operador correcto es clave para buenos resultados.

**`equals` — Igualdad exacta**

Compara los dos valores como texto. Si ambos son numericos, permite tolerancia.

- Ejemplo texto: Sistema `"ABC-123"` vs Banco `"ABC-123"` → ✅ pasa
- Ejemplo texto: Sistema `"ABC-123"` vs Banco `"ABC 123"` → ❌ falla (el guion vs espacio son distintos)
- Ejemplo numerico con tolerancia 2: Sistema `1000` vs Banco `1002` → ✅ pasa

Usar para: campos con formato consistente entre ambos archivos.

**`contains` — Uno contiene al otro**

Pasa si el valor de un lado contiene al otro (o viceversa). La comparacion es **bidireccional**.

- Sistema `"PAGO PROVEEDOR ABC"` vs Banco `"PROVEEDOR ABC"` → ✅ pasa (sistema contiene al banco)
- Sistema `"TRF"` vs Banco `"TRANSFERENCIA TRF-001"` → ✅ pasa (banco contiene a sistema)
- Sistema `"PAGO"` vs Banco `"COBRO"` → ❌ falla

Usar para: descripciones donde un sistema abrevia y otro no. Ideal para campos de texto libre.

**`starts_with` — Uno empieza con el otro**

Pasa si un valor empieza con el otro (bidireccional).

- Sistema `"TRF-2026-001"` vs Banco `"TRF-2026"` → ✅ pasa
- Sistema `"REF"` vs Banco `"REF-123-ABC"` → ✅ pasa
- Sistema `"2026-TRF"` vs Banco `"TRF-2026"` → ❌ falla

Usar para: codigos de referencia con prefijo comun pero sufijos variables.

**`ends_with` — Uno termina con el otro**

Pasa si un valor termina con el otro (bidireccional).

- Sistema `"OP-2026-4567"` vs Banco `"4567"` → ✅ pasa
- Sistema `"001"` vs Banco `"TRF-001"` → ✅ pasa

Usar para: cuando el banco solo muestra los ultimos digitos de una referencia.

**`numeric_equals` — Igualdad numerica con tolerancia**

Convierte ambos valores a numero y compara con tolerancia.

- Sistema `"1.234.567"` vs Banco `"1234567"` → ✅ pasa (mismo numero, distinto formato)
- Sistema `"GS 500.000"` vs Banco `"500000"` → ✅ pasa (se limpian simbolos)
- Sistema `"1000"` vs Banco `"1005"`, tolerancia `5` → ✅ pasa
- Sistema `"1000"` vs Banco `"1006"`, tolerancia `5` → ❌ falla

Usar para: montos. Es el operador recomendado para campos de tipo `amount` o `number`.

**`date_equals` — Igualdad de fecha normalizada (+/- dias)**

Normaliza ambos valores a formato `YYYY-MM-DD` y compara la diferencia en dias.

- Sistema `"15/03/2026"` vs Banco `"2026-03-15"` → ✅ pasa (ambos normalizan a `2026-03-15`)
- Sistema `"15/03/26"` vs Banco `"15-03-2026"` → ✅ pasa
- Sistema `"15/03/2026"` vs Banco `"16/03/2026"` con tolerancia `0` → ❌ falla
- Sistema `"15/03/2026"` vs Banco `"16/03/2026"` con tolerancia `1` → ✅ pasa

Usar para: campos de fecha. Si cargas `tolerance`, se interpreta en **dias**.

**Tabla resumen de operadores:**

| Operador         | Tipo ideal     | Tolerancia? | Bidireccional? | Caso de uso principal              |
|------------------|----------------|-------------|----------------|------------------------------------|
| `equals`         | texto/numero   | si (numeros)| no             | Campos exactos                     |
| `contains`       | texto          | no          | si             | Descripciones, conceptos           |
| `starts_with`    | texto          | no          | si             | Codigos con prefijo comun          |
| `ends_with`      | texto          | no          | si             | Referencias parciales              |
| `numeric_equals` | numero/monto   | si          | n/a            | Montos, importes                   |
| `date_equals`    | fecha          | si (dias)   | n/a            | Fechas en cualquier formato        |

Detalle importante:

- en `contains`, `starts_with` y `ends_with`, la comparacion es bidireccional (no importa cual lado contiene al otro).

#### `Peso`

Impacto de esta regla en el score final del par de filas. El score se calcula como `suma_de_pesos_que_pasaron / suma_de_pesos_totales_evaluados`.

- Mayor peso = mas influencia en el puntaje.
- Recomendado usar valores simples: `1`, `2`, `3`.
- Campos decisivos (monto, fecha) deberian tener peso alto.
- Campos informativos (descripcion, referencia) pueden tener peso bajo.

**Ejemplo completo de calculo de score:**

Supongamos un layout con 3 mappings activos:

| Campo       | Peso | Resultado |
|-------------|------|-----------|
| fecha       | 2    | ✅ pasa    |
| monto       | 3    | ✅ pasa    |
| descripcion | 1    | ❌ falla   |

Score = `(2 + 3) / (2 + 3 + 1)` = `5 / 6` = `0.83`

- Si el threshold del layout es `0.80` → este par entra como **auto-match**.
- Si el threshold es `0.90` → este par **no** entra como auto-match y queda para emparejar manualmente.

**Otro ejemplo — peso desbalanceado:**

| Campo      | Peso | Resultado |
|------------|------|-----------|
| monto      | 5    | ✅ pasa    |
| referencia | 1    | ❌ falla   |

Score = `5 / 6` = `0.83`. El monto domina porque tiene peso 5, asi que aunque referencia falle, el score es alto.

**Recomendaciones por campo:**

| Campo              | Peso recomendado |
|--------------------|------------------|
| monto              | 2 - 3            |
| fecha              | 2                |
| referencia         | 1                |
| descripcion        | 1                |
| numero_comprobante | 2                |

#### `Tolerancia`

Margen de diferencia permitido segun el tipo de comparacion.

- Si la diferencia absoluta entre sistema y banco es **menor o igual** a la tolerancia, la regla pasa.
- Si tolerancia queda vacio, se usa `0` (igualdad exacta).
- En `numeric_equals` y `equals` numerico, la tolerancia se interpreta como diferencia numerica.
- En `date_equals`, la tolerancia se interpreta como **dias**.
- Para texto, la tolerancia se ignora.

**Ejemplo 1 — Redondeos bancarios:**

El sistema registra `1.000.000 Gs` y el banco registra `1.000.002 Gs` (diferencia por redondeo de 2 guaranies).

- Tolerancia = `0` → ❌ falla (diferencia es 2, que es mayor a 0)
- Tolerancia = `2` → ✅ pasa (diferencia es 2, que es igual a 2)
- Tolerancia = `5` → ✅ pasa (diferencia es 2, que es menor a 5)

**Ejemplo 2 — Comisiones incluidas:**

El sistema registra un pago de `500.000 Gs` pero el banco descuenta comision y muestra `499.850 Gs` (diferencia de 150).

- Tolerancia = `0` → ❌ falla
- Tolerancia = `100` → ❌ falla (diferencia es 150)
- Tolerancia = `200` → ✅ pasa (diferencia es 150, que es menor a 200)

**Ejemplo 3 — Montos en dolares con centavos:**

Sistema: `1234.56`, Banco: `1234.57` (diferencia de 0.01).

- Tolerancia = `0` → ❌ falla
- Tolerancia = `0.01` → ✅ pasa
- Tolerancia = `0.05` → ✅ pasa

**Ejemplo 4 — Fechas:**

Sistema: `2026-01-15`, Banco: `2026-01-16`.

- Tolerancia = `0` → ❌ falla
- Tolerancia = `1` → ✅ pasa
- Tolerancia = `3` → ✅ pasa

**Guia rapida:**

| Situacion                     | Tolerancia sugerida |
|-------------------------------|---------------------|
| Montos exactos sin comision   | `0`                 |
| Redondeos de centavos (Gs)    | `1` a `5`           |
| Redondeos de centavos (USD)   | `0.01` a `0.05`     |
| Comisiones bancarias incluidas| `100` a `500`       |
| Fechas con cierre D+1         | `1`                 |
| Diferencias impositivas       | segun % esperado    |

#### `Orden`

Numero que define la posicion de evaluacion y visualizacion del mapping.

- Menor numero = aparece y se evalua antes.
- Si queda vacio, el sistema asigna automaticamente el indice de la fila (0, 1, 2...).
- No es obligatorio que sean consecutivos (podes usar `10`, `20`, `30` para dejar espacio).

**Ejemplo:**

| Campo       | Orden | Posicion final |
|-------------|-------|----------------|
| monto       | 1     | 1ro            |
| fecha       | 2     | 2do            |
| referencia  | 5     | 3ro            |
| descripcion | 10    | 4to            |

**Cuando importa el orden:**

- En la tabla de resultados de conciliacion, los campos se muestran en este orden.
- En la evaluacion del matching, los campos se procesan en este orden (aunque el resultado final no cambia, ayuda al debugging ver primero los campos mas importantes).

**Recomendacion:** poner primero los campos requeridos (fecha, monto) y despues los opcionales.

#### `Activo` (checkbox)

Si esta desmarcado, la regla **no participa en ningun calculo**. Es como si no existiera.

**Cuando desactivar un mapping en vez de eliminarlo:**

- Cuando queres conservar la configuracion para reactivarla despues.
- Cuando estas probando si un campo genera falsos positivos: desactivalo temporalmente, corré la conciliacion y compara resultados.
- Cuando un banco cambio formato temporalmente y despues va a volver.

**Ejemplo practico:**

Tenes un mapping para `numero_comprobante` que matcheaba bien, pero el banco cambio el formato del extracto y ahora ese campo viene vacio. En vez de borrar el mapping:

1. Desactiva el checkbox "Activo".
2. Corré la conciliacion sin ese campo.
3. Cuando el banco corrija el formato, reactiva el campo.

**Importante:** un mapping desactivado no suma ni resta al score. Si tenes 4 mappings y desactivas 1, el score se calcula solo con los 3 activos.

#### `Requerido` (checkbox)

Si una regla marcada como requerida **falla**, el par de filas queda **descartado inmediatamente**, sin importar que el score total sea alto.

**Ejemplo 1 — Requerido protege de falsos positivos:**

| Campo       | Requerido | Peso | Resultado |
|-------------|-----------|------|-----------|
| fecha       | ✅ si      | 2    | ❌ falla   |
| monto       | ✅ si      | 3    | ✅ pasa    |
| descripcion | ❌ no      | 1    | ✅ pasa    |

Sin requerido: score = `(3 + 1) / (2 + 3 + 1)` = `0.67`. Si threshold es `0.60`, entraria como match.

Con requerido en fecha: el par se **descarta** directamente porque `fecha` es requerido y fallo. No importa que monto y descripcion coincidan.

**Ejemplo 2 — Monto requerido evita emparejar transacciones distintas:**

Dos transacciones del mismo dia con descripciones similares pero montos diferentes:

- Sistema: `15/03/2026 | PAGO PROVEEDOR | 5.000.000`
- Banco: `15/03/2026 | PAGO PROVEEDOR | 3.200.000`

Si monto es requerido con tolerancia `0`, este par se descarta. Sin requerido, podria entrar como match si fecha y descripcion coinciden y el score supera el threshold.

**Ejemplo 3 — Requerido en referencia para transferencias:**

Para bancos que siempre informan numero de referencia, marcarlo como requerido evita cruzar transferencias distintas del mismo monto y fecha.

**Que campos marcar como requeridos:**

| Campo              | Requerido? | Por que                                                |
|--------------------|------------|--------------------------------------------------------|
| fecha              | ✅ si       | Nunca deberia matchear dos transacciones de dias distintos |
| monto              | ✅ si       | Es el campo mas determinante en conciliacion            |
| descripcion        | ❌ no       | Puede variar mucho entre sistema y banco               |
| referencia         | depende    | Si el banco siempre la informa, si. Si es opcional, no |
| numero_comprobante | depende    | Igual que referencia                                   |

**Regla de oro:** marcar como requerido solo los campos que **siempre** deben coincidir. Si marcas demasiados campos como requeridos, vas a tener muchos no-matches validos.

### 5.2 Configuracion del lado Sistema

Estos campos le dicen al sistema **de donde leer** el valor en el archivo Excel del ERP/sistema.

#### `Hoja`

Nombre exacto de la hoja (pestaña) del Excel. Si queda vacio, usa la **primera hoja** del archivo.

**Ejemplo:**

Un archivo Excel tiene 3 hojas: `Movimientos`, `Resumen`, `Config`.

- Si pones `Movimientos` → lee de esa hoja.
- Si dejas vacio → lee de `Movimientos` (primera hoja).
- Si pones `movimientos` (minuscula) → ❌ error, no encuentra la hoja (es case-sensitive).

**Errores comunes:**

- Escribir el nombre con distinta mayuscula: `Hoja1` vs `hoja1`
- Espacios extra: `Movimientos ` (con espacio al final)
- Tildes: `Operación` vs `Operacion`

**Recomendacion:** abrir el Excel real, copiar el nombre exacto de la pestaña.

#### `Columna`

Letra/s de columna a leer. Acepta dos formatos:

**Formato simple:** una sola columna.

- `A`, `B`, `C`, `AA`, `AB`

**Formato combinado:** multiples columnas separadas por `|`.

- `E|F` → intenta leer columna E; si esta vacia, lee columna F.
- `D|E|F` → prueba D, si vacia prueba E, si vacia prueba F.

**Ejemplo real — Debito/Credito:**

Muchos extractos bancarios tienen el monto en dos columnas separadas:

| Fila | Col D (Debito) | Col E (Credito) |
|------|----------------|-----------------|
| 5    | 500.000        |                 |
| 6    |                | 1.200.000       |
| 7    | 300.000        |                 |

Si pones columna = `D|E`:

- Fila 5 → lee `500.000` de D
- Fila 6 → D esta vacia, lee `1.200.000` de E
- Fila 7 → lee `300.000` de D

**Ejemplo — Columna doble letra:**

Archivos con muchas columnas pueden tener datos en `AA`, `AB`, etc. Funciona igual: `AA` o `AA|AB`.

**Formato invalido:**

- `1` (numeros no son columnas validas)
- `E F` (sin `|`)
- `E|` (columna vacia despues del pipe)

#### `Fila inicio`

Primera fila de datos a considerar (base 1, donde fila 1 = primera fila del Excel).

- Si queda vacio, empieza en fila `1`.
- Normalmente los Excel tienen headers en fila 1, asi que el valor tipico es `2`.

**Ejemplo:**

| Fila | Contenido          |
|------|--------------------|
| 1    | FECHA (header)     |
| 2    | 15/03/2026 (datos) |
| 3    | 16/03/2026 (datos) |
| ...  | ...                |
| 150  | 31/03/2026 (datos) |
| 151  | TOTAL (resumen)    |

- Fila inicio = `2` (saltar el header)
- Fila fin = `150` (excluir fila de totales)

#### `Fila fin`

Ultima fila de datos a considerar. Si queda vacio, toma hasta la ultima fila que tenga datos en la hoja.

**Cuando usar fila fin:**

- Cuando el Excel tiene filas de totales o resumen al final que no son transacciones.
- Cuando solo queres conciliar un rango especifico (ej: primera quincena).

**Cuando dejar vacio:**

- Cuando el Excel tiene solo datos de transacciones sin filas extra.
- Cuando no sabes cuantas filas tiene (el sistema detecta automaticamente).

#### `Tipo`

Define como se normaliza el valor leido del Excel **antes** de comparar. Es crucial elegir el tipo correcto.

**`text` — Texto normalizado**

- Elimina tildes: `Operación` → `OPERACION`
- Elimina simbolos especiales: `#REF-001!` → `REF001`
- Unifica espacios multiples: `"PAGO   PROVEEDOR"` → `"PAGO PROVEEDOR"`
- Convierte a mayusculas

Usar para: descripciones, conceptos, referencias alfanumericas.

**`number` — Numero**

- Convierte a numero decimal.
- Limpia separadores de miles y simbolos.
- `"1.234.567"` → `1234567`
- `"1,234.56"` → `1234.56`

Usar para: cantidades, numeros de referencia puramente numericos.

**`amount` — Monto**

Funcionalmente igual a `number`, pero con semantica de monto monetario.

- `"GS 1.234.567"` → `1234567`
- `"USD 1,234.56"` → `1234.56`
- `"-500.000"` → `-500000`

Usar para: importes, debitos, creditos, saldos.

**`date` — Fecha**

Normaliza a formato `YYYY-MM-DD`.

- Fecha Excel numerica (ej: `46100`) → `2026-03-15`
- `"15/03/2026"` → `2026-03-15`
- `"15-03-26"` → `2026-03-15`
- `"March 15, 2026"` → `2026-03-15`

Usar para: campos de fecha.

**Tabla de decision rapida:**

| Contenido del campo              | Tipo recomendado |
|----------------------------------|------------------|
| Fecha de transaccion             | `date`           |
| Monto, importe, saldo           | `amount`         |
| Cantidad, numero de operacion    | `number`         |
| Descripcion, concepto, referencia| `text`           |

**Error comun:** usar `text` para un campo de monto. Resultado: el sistema compara `"1.234.567"` vs `"1234567"` como texto y falla, aunque sean el mismo numero.

### 5.3 Configuracion del lado Banco

Los campos `Hoja`, `Columna`, `Fila inicio`, `Fila fin`, `Tipo` funcionan exactamente igual que en Sistema, pero aplicados al archivo del banco.

**Importante:** sistema y banco pueden tener configuraciones completamente distintas para el mismo campo. Por ejemplo, para el campo `monto`:

| Config         | Sistema      | Banco        |
|----------------|--------------|--------------|
| Hoja           | `Movimientos`| `Extracto`   |
| Columna        | `D`          | `E|F`        |
| Fila inicio    | `2`          | `5`          |
| Fila fin       | (vacio)      | `500`        |
| Tipo           | `amount`     | `amount`     |

Esto es normal porque cada archivo tiene su propio formato.

## 6) Como calcula el auto-match?

Para cada fila del sistema, Qoncilia evalua contra filas del banco:

1. Toma solo mappings activos.
2. Compara cada campo segun operador y tipo.
3. Si una regla requerida falla, descarta ese candidato.
4. Calcula score: `peso_coincidente / peso_total_evaluado`.
5. Acepta candidato si score >= `threshold`.
6. Selecciona matches no repetidos (1 fila sistema con 1 fila banco), priorizando mayor score.

## 7) Reglas de normalizacion que impactan resultados

### Texto

- elimina tildes
- elimina simbolos especiales
- unifica multiples espacios
- convierte a mayusculas

Ejemplo:

`"Pago comision N 123"` y `"PAGO COMISION N 123"` terminan comparandose como equivalentes en modo texto.

### Numero y monto

Admite formatos comunes:

- `1.234,56`
- `1234.56`
- `GS 1.234.567`

Se limpian simbolos y se parsea a numero.

### Fecha

Acepta:

- fechas Excel numericas
- `DD/MM/AA`, `DD/MM/AAAA`, `DD-MM-AAAA`
- fechas parseables por JavaScript

Resultado final normalizado: `YYYY-MM-DD`.

## 8) Errores comunes al guardar y como resolverlos

### `Debes enviar al menos un campo de layout.`

Causa: no hay mappings.

Solucion: agregar al menos una fila.

### `El campo X esta repetido en el layout.`

Causa: `fieldKey` duplicado.

Solucion: usar un `fieldKey` unico por fila.

### `autoMatchThreshold debe estar entre 0 y 1.`

Causa: threshold fuera de rango.

Solucion: usar un valor entre `0` y `1`.

### Error de columna invalida

Causa: columna con formato incorrecto.

Solucion: usar letras y `|` (ejemplo valido: `E|F`).

### Error de hoja inexistente

Causa: nombre de hoja no coincide con el Excel real.

Solucion: copiar nombre exacto de la pestana.

## 9) Cuando usar la base sugerida

El boton **Base sugerida** carga 4 campos iniciales:

- fecha
- descripcion
- monto
- referencia

Usalo como punto de partida y luego ajusta:

- columnas por banco
- tipo de dato
- operador
- requerido/peso/tolerancia

## 10) Checklist antes de guardar

1. El nombre del layout describe claramente banco y version.
2. El threshold esta entre `0` y `1`.
3. Hay al menos un mapping activo.
4. Ningun `fieldKey` esta repetido.
5. Cada mapping tiene columna en sistema y banco.
6. Tipos de dato coinciden con contenido real del Excel.
7. Reglas `required` estan bien definidas.
8. Si corresponde, el layout queda activo.
9. Se probo el layout con al menos un par real de archivos.

## 11) Recomendaciones practicas de diseno

1. Empeza simple: fecha, monto y referencia.
2. Marca `required` solo en campos realmente determinantes.
3. Usa tolerancia pequena para montos con redondeos.
4. Evita operadores de texto muy laxos en campos genericos.
5. Si hay muchos falsos positivos, subi threshold o aumenta peso en campos fuertes.
6. Si hay muchos no-matches validos, baja threshold o revisa normalizacion/tipos.
7. Versiona por nombre (`v1`, `v2`, `v3`) en vez de sobrescribir sin trazabilidad funcional.

## 12) Ejemplo completo: layout real para banco Itau cuenta corriente Gs

Este ejemplo muestra un layout real con toda la configuracion.

### Informacion general

| Campo             | Valor                                         |
|-------------------|-----------------------------------------------|
| Nombre            | `Itau Corriente Gs v1`                        |
| Threshold         | `0.80`                                        |
| Etiqueta sistema  | `SAP B1`                                      |
| Etiqueta banco    | `Itau`                                        |
| Descripcion       | `Cuenta corriente guaranies, extracto mensual`|
| Activo            | ✅ si                                          |

### Mappings

#### Campo 1: Fecha

| Config          | Sistema | Banco   |
|-----------------|---------|---------|
| fieldKey        | `fecha`                 |
| Label           | `Fecha`                 |
| Operador        | `date_equals`           |
| Peso            | `2`                     |
| Tolerancia      | (vacio)                 |
| Orden           | `1`                     |
| Activo          | ✅ si                    |
| Requerido       | ✅ si                    |
| Hoja            | `Hoja1` | `Extracto`    |
| Columna         | `A`     | `B`           |
| Fila inicio     | `2`     | `5`           |
| Fila fin        | (vacio) | (vacio)       |
| Tipo            | `date`  | `date`        |

#### Campo 2: Monto

| Config          | Sistema | Banco   |
|-----------------|---------|---------|
| fieldKey        | `monto`                 |
| Label           | `Monto`                 |
| Operador        | `numeric_equals`        |
| Peso            | `3`                     |
| Tolerancia      | `5`                     |
| Orden           | `2`                     |
| Activo          | ✅ si                    |
| Requerido       | ✅ si                    |
| Hoja            | `Hoja1` | `Extracto`    |
| Columna         | `D`     | `E|F`         |
| Fila inicio     | `2`     | `5`           |
| Fila fin        | (vacio) | (vacio)       |
| Tipo            | `amount`| `amount`      |

Nota: el banco usa `E|F` porque tiene Debito en E y Credito en F.

#### Campo 3: Descripcion

| Config          | Sistema | Banco   |
|-----------------|---------|---------|
| fieldKey        | `descripcion`           |
| Label           | `Descripcion`           |
| Operador        | `contains`              |
| Peso            | `1`                     |
| Tolerancia      | (vacio)                 |
| Orden           | `3`                     |
| Activo          | ✅ si                    |
| Requerido       | ❌ no                    |
| Hoja            | `Hoja1` | `Extracto`    |
| Columna         | `C`     | `C`           |
| Fila inicio     | `2`     | `5`           |
| Fila fin        | (vacio) | (vacio)       |
| Tipo            | `text`  | `text`        |

#### Campo 4: Referencia

| Config          | Sistema | Banco   |
|-----------------|---------|---------|
| fieldKey        | `referencia`            |
| Label           | `Referencia`            |
| Operador        | `contains`              |
| Peso            | `1`                     |
| Tolerancia      | (vacio)                 |
| Orden           | `4`                     |
| Activo          | ✅ si                    |
| Requerido       | ❌ no                    |
| Hoja            | `Hoja1` | `Extracto`    |
| Columna         | `E`     | `D`           |
| Fila inicio     | `2`     | `5`           |
| Fila fin        | (vacio) | (vacio)       |
| Tipo            | `text`  | `text`        |

### Como funciona este layout en practica

Con threshold `0.80` y pesos totales = 7 (2+3+1+1):

| Escenario                                | Score | Resultado  |
|------------------------------------------|-------|------------|
| Fecha ✅ Monto ✅ Desc ✅ Ref ✅            | 1.00  | Auto-match |
| Fecha ✅ Monto ✅ Desc ❌ Ref ✅            | 0.86  | Auto-match |
| Fecha ✅ Monto ✅ Desc ❌ Ref ❌            | 0.71  | Manual     |
| Fecha ❌ Monto ✅ Desc ✅ Ref ✅            | -     | Descartado (fecha requerida fallo) |
| Fecha ✅ Monto ❌ Desc ✅ Ref ✅            | -     | Descartado (monto requerido fallo) |

## 13) Troubleshooting: diagnostico de problemas comunes

### Muchos auto-matches falsos (pares que no deberian ser match)

**Causas posibles:**

1. Threshold muy bajo → subir a `0.85` o `0.90`.
2. Campos importantes sin `required` → marcar fecha y monto como requeridos.
3. Operador `contains` en campos genericos → cambiar a `equals` o `starts_with`.
4. Pesos muy bajos en campos determinantes → subir peso de monto/fecha.

### Muchos no-matches (pares que deberian ser match pero no lo son)

**Causas posibles:**

1. Threshold muy alto → bajar a `0.75` o `0.80`.
2. Tipo de dato incorrecto → verificar que montos usen `amount`, no `text`.
3. Columna incorrecta → verificar que las columnas coincidan con el Excel real.
4. Tolerancia en `0` con montos que tienen comisiones → agregar tolerancia.
5. Fila inicio incorrecta → verificar que no este salteando filas de datos.

### Score siempre 0

**Causas posibles:**

1. Todos los mappings estan desactivados.
2. Las columnas estan mal configuradas (leyendo datos vacios).
3. El tipo de dato no coincide con el contenido (ej: `date` en una columna de texto).

### La conciliacion no lee filas del Excel

**Causas posibles:**

1. Nombre de hoja incorrecto (revisar mayusculas, espacios, tildes).
2. Fila inicio mayor que la ultima fila con datos.
3. Columna inexistente en el archivo.
