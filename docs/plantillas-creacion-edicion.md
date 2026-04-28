# Guia: Creacion y edicion de plantillas

## Que es una plantilla

Una plantilla define como Qoncilia lee y compara dos archivos Excel:

- lado sistema, por ejemplo SAP
- lado banco, por ejemplo el extracto bancario

Cada plantilla pertenece a un banco y a un sistema. Las plantillas base son configuraciones reutilizables que el superadmin puede copiar a los bancos de una empresa.

## Flujo recomendado

1. Crear o elegir el sistema, por ejemplo SAP.
2. Crear una plantilla base si la configuracion se va a repetir.
3. Asignar o copiar la plantilla al banco correspondiente.
4. Elegir una cuenta bancaria del banco antes de conciliar.
5. Probar la plantilla con archivos reales en la pantalla de conciliacion.

## Campos principales

- `Nombre`: identificador claro para el usuario.
- `Sistema`: origen del archivo contable o ERP.
- `Etiqueta sistema`: nombre visible del lado sistema.
- `Etiqueta banco`: nombre visible del lado banco.
- `Umbral auto-match`: score minimo para que un par quede conciliado automaticamente.
- `Activa`: solo una plantilla activa por banco debe quedar como predeterminada.

## Mapeos de campos

Cada mapeo representa un dato que se compara entre sistema y banco. Debe tener:

- clave tecnica unica dentro de la plantilla
- etiqueta visible
- operador de comparacion
- peso
- tolerancia opcional
- columna, hoja y rango del lado sistema
- columna, hoja y rango del lado banco

Para importes con debito y credito separados se pueden usar columnas combinadas, por ejemplo `E|F`.

## Sistemas

Los sistemas tienen ABM propio. Un sistema puede ser SAP, Softland, Bejerman u otro ERP/origen de datos. Cada sistema puede tener varias plantillas base y varias plantillas asignadas a bancos.

## Reglas de negocio

- Las conciliaciones se hacen por cuenta bancaria.
- No se puede conciliar sin banco, cuenta bancaria y plantilla.
- El superadmin administra sistemas y plantillas base.
- El admin gestiona bancos y cuentas de su empresa.
- Los gestores heredan la empresa del admin que los crea.
- Cuando un admin tiene una plantilla habilitada y se asigna un banco a un gestor de la misma empresa, la plantilla se replica para ese banco gestor.

## Checklist

- La plantilla tiene nombre descriptivo.
- El sistema correcto esta seleccionado.
- Las etiquetas visibles son claras.
- Los campos requeridos estan marcados.
- Pesos y tolerancias fueron revisados.
- La plantilla fue probada con archivos reales.
