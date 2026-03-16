# BarberSaaS — CLAUDE.md

> El estado del proyecto (rutas, features, decisiones técnicas, deuda conocida) está en `context.md`, que se provee al inicio de cada sesión. Este archivo contiene solo las reglas permanentes.

---

## Código

- TypeScript estricto — sin `any`, sin `as unknown as Type`
- Server Components por defecto — `"use client"` solo cuando sea necesario
- Queries de DB **siempre via Drizzle** — nunca cliente raw de Supabase
- Validación con **Zod** en Server Actions y en cliente
- Formularios con `useActionState` de React 19
- Ante dudas de scope: preguntar antes de implementar

## Seguridad / multi-tenancy

- Toda query filtra por `tenant_id`
- Drizzle bypassa RLS — autorización manual via `supabase.auth.getUser()` en Server Actions
- Middleware usa `user.app_metadata?.tenant_id` del JWT, sin query a DB

## UI

- **Mobile-first siempre** — breakpoints `md:` y `lg:` para desktop
- **Dark mode** por defecto
- Componentes base: **shadcn/ui** — no reinventar primitivos, no hackear sus estilos
- Íconos: **Lucide** únicamente
- Colores como CSS variables en `globals.css`
- Estética: premium, masculino, moderno — sin gradientes purple/azul genéricos de SaaS

## No hacer (sin discutir primero)

- Resolver deuda técnica no asignada
- Agregar features fuera del scope de la sesión
- Cambiar decisiones de stack (auth, ORM, etc.)
- Instalar dependencias nuevas sin confirmar