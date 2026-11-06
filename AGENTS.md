<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# TallerTrack — Engineering & UX Constitution

> **Arquetipo de Diseño:** *Dirty Hands UX & POS Mostrador*  
> **Cliente Cero / Laboratorio:** Taller Mecánico & Centro Llantero Cova  
> **Misión:** Reducir la fricción operativa a menos de 90 segundos por interacción en piso de taller.

---

## 1. Arquetipo Visual & Ergonómico ("Dirty Hands UX")

1. **Target Táctil Mínimo de 48px**:
   - Todo botón principal de acción (`Cobrar`, `Crear Orden`, `Aceptar`), input numérico o selector táctil debe tener una altura mínima de `h-12` (48px) o `h-14` (56px) para facilitar toque con dedos sucios, guantes o tablets en mostrador.
2. **Alto Contraste Innegociable**:
   - Usar textos de alto contraste (`text-zinc-900` sobre fondos claros, nunca grises pálidos como `text-zinc-400` para datos críticos).
   - Fondos limpios (`bg-white` o `bg-zinc-50`), estados visuales evidentes (verde esmeralda para pagado, ámbar para presupuesto, rojo para orden detenida).
3. **Flujos Flash (< 90 Segundos)**:
   - **Recepción Express**: Solo placas/número económico, odómetro, falla reportada y teléfono. VIN y datos fiscales son opcionales y postergables.
   - **POS Mostrador**: Creación de cliente al vuelo en 1 clic dentro del mismo modal o dropdown del POS; prohibido obligar al usuario a abandonar la venta para ir al módulo de clientes.
   - **Cobro Multimetal**: Soporte nativo para pagos divididos (ej. $500 efectivo + $1,200 tarjeta) con cálculo de cambio en tiempo real y tipografía de monto gigante (`text-3xl font-mono`).

---

## 2. Exclusiones Estrictas (Lo que NUNCA debes hacer en TallerTrack)

- 🚫 **PROHIBIDO modales anidados (modal sobre modal)**: Si un modal necesita crear una entidad secundaria, usa un acordeón, un step inline o un drawer/sheet lateral independiente.
- 🚫 **PROHIBIDO tablas con scroll horizontal ancho en móviles/tablets**: En viewports `< 1024px`, las órdenes y productos deben renderizarse como tarjetas apiladas (`Card`) con estado visible, nunca tablas con 8 columnas cortadas.
- 🚫 **PROHIBIDO bloquear la operación por campos opcionales**: Si falta el RFC, se asigna `XAXX010101000` (Público General); si falta el kilometraje, se permite guardar con advertencia no bloqueante.
- 🚫 **PROHIBIDO spiners de pantalla completa sin timeout ni botón de cancelar**.
- 🚫 **PROHIBIDO generar maquetas con `generate_image`**: Construye directamente con componentes shadcn/ui y Tailwind CSS.

---

## 3. Arquitectura Técnica & Base de Datos

- **Stack**: Next.js (App Router), Tailwind CSS, shadcn/ui, Supabase (PostgreSQL + RLS), Lucide Icons.
- **Multi-Tenant Estricto**: Todo query debe aislarse por `taller_id` / `organization_id` con Row Level Security habilitado.
- **Tipado Riguroso**: Al modificar el esquema en Supabase, ejecutar inmediatamente:
  `npm run update-types` (o `npx supabase gen types typescript...`) y corregir interfaces en el frontend antes de commitear.

---

## 4. Flujo Maestro de Git & Sincronización

- **1 Feature = 1 Rama**: Agrupa todas las tareas de la sesión en `feature/nombre` o `fix/nombre`. Prohibido crear ramas por cada micro-tarea.
- **Commits Semánticos**: `tipo(taller/modulo): descripción clara #TASK_ID`.
- **Verificación Previa**: `npm run build` debe compilar con **0 errores** antes de entregar o abrir PR.
- **Espejo Obsidian/Asana**: El alcance vive en Obsidian `BACKLOG.md` con espejado a Asana `<!-- asana:GID -->`.
