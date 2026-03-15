# BarberSaaS — Context

## Stack
- Next.js 16 (App Router + RSC + Server Actions)
- Node.js 25, pnpm
- Supabase (Auth + DB + Storage)
- Drizzle ORM (nunca cliente raw de Supabase para DB)
- Tailwind CSS 4 + shadcn/ui + Lucide icons
- Zod para validación (cliente y servidor)
- Vitest para testing
- Deploy: Vercel

## Roles
- owner: acceso completo
- barber: acceso operativo
- client: acceso limitado

## Rutas implementadas
- /register → formulario de registro
- /login → formulario de login
- /onboarding/step-1 → datos de la barbería (obligatorio)
- /onboarding/step-2 → servicios (opcional)
- /onboarding/step-3 → barberos (opcional)
- /dashboard → panel principal del dueño (protegida)

## Decisiones técnicas importantes
- profiles.tenantId es nullable — se asigna en Step 1 del onboarding
- barbers.profileId es nullable — barberos pueden existir sin cuenta
- Drizzle bypassa RLS — autorización manual en Server Actions via supabase.auth.getUser()
- Middleware chequea user.app_metadata?.tenant_id (del JWT, sin query a DB)
- Step 1 llama adminClient.auth.admin.updateUserById() + supabase.auth.refreshSession() para actualizar JWT antes del redirect
- Formularios usan useActionState de React 19
- Servicios y barberos se serializan como JSON en hidden inputs
- Diseño Mobile-First siempre — Tailwind breakpoints md: y lg: para desktop

## Estado de Supabase
- Bucket "logos" creado (público)
- Migration 0002_nullable_columns.sql aplicada
- Trigger on_auth_user_created con EXCEPTION handler
- Redirect URL configurada: http://localhost:3000/**

## Features completadas
- ✅ Scaffold inicial (Next.js 16, Drizzle, Supabase, shadcn/ui)
- ✅ Schema de DB completo con todas las tablas
- ✅ Autenticación (register + login + logout)
- ✅ Onboarding wizard 3 pasos
- ✅ Dashboard principal con botón "Ver mi landing"

## Próximas features
- [ ] Sistema de turnos (calendario en dashboard)
- [ ] Landing pública /[slug] + reserva de turno
- [ ] CRM de clientes
- [ ] Notificaciones (WhatsApp/Twilio)