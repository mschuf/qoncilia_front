# QonciliaFront

## Requisitos
- Node.js 18+

## Ejecutar
1. `npm install`
2. Copiar `.env.example` a `.env` y ajustar `VITE_API_URL`
3. `npm run dev`

## Pantallas
- `/login`
- `/register`
- `/` (home, protegida)
- `/bank-statements` (extractos bancos)
- `/conciliation` (comparacion temporal contra extractos)
- `/users` (solo admin/superadmin)

## Documentacion funcional
- [Creacion y edicion de plantillas](./docs/plantillas-creacion-edicion.md)
- Extractos bancos guarda solo el Excel del banco por banco, cuenta y layout; Conciliar no guarda Excel del sistema ni resultados.
