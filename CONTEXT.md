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
- /[slug] → landing pública de la barbería (no requiere auth)
- /[slug]/reservar → reserva de turno (próxima feature, no implementada aún)

## Decisiones técnicas importantes
- profiles.tenantId es nullable — se asigna en Step 1 del onboarding
- barbers.profileId es nullable — barberos pueden existir sin cuenta
- Drizzle bypassa RLS — autorización manual en Server Actions via supabase.auth.getUser()
- Middleware chequea user.app_metadata?.tenant_id (del JWT, sin query a DB)
- Step 1 llama adminClient.auth.admin.updateUserById() + supabase.auth.refreshSession() para actualizar JWT antes del redirect
- refreshSession() verifica el resultado y retorna error de form si falla, nunca redirige con JWT viejo
- Formularios usan useActionState de React 19
- Servicios y barberos se serializan como JSON en hidden inputs
- Diseño Mobile-First siempre — Tailwind breakpoints md: y lg: para desktop
- Landing usa RSC puro — fetch en servidor, nada sensible al cliente
- Barberos usa LEFT JOIN con profiles para obtener avatarUrl (profileId nullable)
- No hay relations() definidas en Drizzle — queries manuales
- openingHours casteado como OpeningHours | null sin validación runtime (aceptable, dato escrito por nuestro onboarding)
- Google Maps removido intencionalmente — dirección se muestra como texto plano hasta tener ciudad/país en el schema
- Doble query de tenant entre generateMetadata y page (deuda conocida, solución futura: React.cache())
- Sin caching en landing (deuda conocida, solución futura: unstable_cache)

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
- ✅ Landing pública /[slug] (7 secciones + 404 personalizada + SEO dinámico)

## Próximas features
- [ ] Reserva de turno /[slug]/reservar ← EN CURSO
- [ ] Sistema de turnos (calendario en dashboard)
- [ ] CRM de clientes
- [ ] Notificaciones (WhatsApp/Twilio)