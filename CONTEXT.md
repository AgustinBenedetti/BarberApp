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
- /dashboard/turnos → sistema de turnos (protegida)
- /dashboard/clientes → lista de clientes con search y filtros (protegida)
- /dashboard/clientes/[id] → detalle del cliente (protegida)
- /dashboard/barberos → lista de barberos (solo owner)
- /dashboard/barberos/nuevo → crear barbero (solo owner)
- /dashboard/barberos/[id] → editar barbero (solo owner)
- /dashboard/servicios → lista + drawer CRUD servicios (solo owner)
- /[slug] → landing pública de la barbería (no requiere auth)
- /[slug]/reservar → wizard de reserva de 4 pasos (no requiere auth)
- /[slug]/reservar/confirmacion → página de éxito con searchParams

## Decisiones técnicas importantes
- profiles.tenantId es nullable — se asigna en Step 1 del onboarding
- barbers.profileId es nullable — barberos pueden existir sin cuenta
- barbers.avatarUrl independiente de profiles.avatarUrl — foto del dashboard se guarda en barbers
- Landing y wizard usan COALESCE(barbers.avatarUrl, profiles.avatarUrl) — prefiere foto del dashboard, cae a perfil como fallback
- Drizzle bypassa RLS — autorización manual en Server Actions via supabase.auth.getUser()
- Middleware chequea user.app_metadata?.tenant_id (del JWT, sin query a DB)
- Middleware excluye /[slug] y /[slug]/reservar de la protección de auth
- Step 1 llama adminClient.auth.admin.updateUserById() + supabase.auth.refreshSession() para actualizar JWT antes del redirect
- refreshSession() verifica el resultado y retorna error de form si falla, nunca redirige con JWT viejo
- Formularios usan useActionState de React 19
- Servicios y barberos se serializan como JSON en hidden inputs
- Diseño Mobile-First siempre — Tailwind breakpoints md: y lg: para desktop
- Landing usa RSC puro — fetch en servidor, nada sensible al cliente
- Barberos usa LEFT JOIN con profiles para obtener avatarUrl (profileId nullable)
- No hay relations() definidas en Drizzle — queries manuales
- db.select() explícito en lugar de db.query relacional para evitar ambigüedad con displayName (camelCase vs snake_case)
- openingHours casteado con Zod safeParse — si falla, se trata como null
- Google Maps removido intencionalmente — dirección como texto plano hasta tener ciudad/país en el schema
- tenant.phone puede ser null — WhatsApp usa wa.me/?text=... sin destinatario en ese caso
- "Sin preferencia" en barbero se resuelve al primer barbero activo del tenant en getAvailableSlots y createAppointment
- Conflict check usa detección de solapamiento real (gt/lt) — no startTime exacto
- Conflict check fuera de la transacción — dentro solo van upsert de client e insert de appointment
- visitCount se incrementa en cada booking por diseño
- Confirmación recibe datos via searchParams, sin query a DB — guard redirige a /reservar?error=expired si faltan params
- Wizard muestra banner rojo con mensaje de error si recibe ?error=expired
- getAuthContext() en actions/appointments.ts verifica sesión + rol + ownBarberId del barbero
- Barber con ownBarberId null → acceso denegado inmediatamente (no bypassa autorización)
- clientId en createManualAppointment validado contra tenantId antes de usar
- Timeline visual usa posicionamiento absoluto 1.5px/minuto — default 08:00-20:00 si openingHours es null
- Modales implementados nativamente sin librería externa (backdrop + Escape listener)
- getAvailableSlots reutilizado desde actions/booking.ts en el modal de nuevo turno
- getAvailableSlots excluye appointments cancelled y no_show al calcular slots
- rescheduleAppointment preserva notas existentes anteponiéndolas a la nota de reprogramación
- rescheduleAppointment bloquea status completed, cancelled y no_show server-side
- AuthContext exportado — getAppointmentsForDay acepta preloadedCtx opcional para evitar doble query
- reservar/page.tsx usa React.cache() + unstable_cache(revalidate: 60) igual que la landing
- "use server" prohíbe exportar valores no-async — PAGE_SIZE es const privado en actions/clients.ts
- parseDateSafe(dateStr) en client-utils.ts → new Date("YYYY-MM-DT12:00:00") evita timezone bug en Argentina (UTC-3)
- parseDateSafe solo aplica a campos date de Drizzle (mode: "string") — timestamps ISO usan new Date() directo
- Paginación con "Ver más" (append) — page validado con Math.max(1, Math.floor(page)) para evitar OFFSET negativo
- onBlur save en PreferencesEditor y NotesEditor — merge de preferences no sobreescribe keys no enviadas
- Todas las queries de mutación del CRM tienen tenantId en el WHERE como defensa en profundidad
- Regla de categorías: visitCount === 1 → Nuevo, 2-5 → Regular, ≥ 6 → VIP (en client-utils.ts)
- Link "Nuevo turno" abre /{slug}/reservar?phone={phone} — booking wizard lee initialPhone y dispara lookupClient automáticamente si length >= 6
- getOwnerAuth() en actions/barbers-services.ts — retorna null para cualquier rol que no sea owner
- getOwnerAuth() retorna tenantSlug para poder llamar revalidatePath tras mutaciones
- Barbero sin cuenta: profileId = null. Barbero invitado: inviteUserByEmail → profile con role='barber' + barbers vinculado
- Delete guards en barberos y servicios: turnos futuros activos primero, luego historial (FK restrict)
- createService y updateService usan .returning() — ServicesView actualiza lista localmente sin router.refresh()
- Las 8 mutaciones de barberos/servicios llaman revalidatePath(/${slug}) y revalidatePath(/${slug}/reservar)
- saveStep1, saveStep2 y saveStep3 llaman revalidatePath tras guardar — landing siempre muestra datos frescos post-onboarding
- DashboardTopNav recibe role — tabs Barberos y Servicios visibles solo para owners
- Avatar upload valida size (5MB) y MIME client-side en barber-form.tsx — previene crash del body parser de Next.js (límite 1MB)
- Validación server-side de avatar se mantiene como segunda línea de defensa
- Formato canónico de availability: { monday: { closed, open, close } } — igual que openingHours del tenant
- Sin barberos activos → mensaje claro en Step 2 del wizard + botón Continuar disabled
- openingHours null → mensaje claro en Step 3 del wizard + date strip oculto

## Estado de Supabase
- Bucket "logos" creado (público)
- Bucket "avatars" creado (público)
- Migration 0002_nullable_columns.sql aplicada
- Columna avatar_url agregada a tabla barbers (via db:push)
- Trigger on_auth_user_created con EXCEPTION handler
- Redirect URL configurada: http://localhost:3000/**
- ⚠️ RLS policies eliminadas por db:push — recrear antes de producción (issue #30)

## Features completadas
- ✅ Scaffold inicial (Next.js 16, Drizzle, Supabase, shadcn/ui)
- ✅ Schema de DB completo con todas las tablas
- ✅ Autenticación (register + login + logout)
- ✅ Onboarding wizard 3 pasos
- ✅ Dashboard principal con botón "Ver mi landing"
- ✅ Landing pública /[slug] (7 secciones + 404 personalizada + SEO dinámico)
- ✅ Wizard de reserva /[slug]/reservar (4 pasos + reconocimiento cliente recurrente)
- ✅ Sistema de turnos /dashboard/turnos (timeline día + grilla semana + modales)
- ✅ CRM de clientes /dashboard/clientes (lista + filtros + detalle + edición inline)
- ✅ Gestión de barberos /dashboard/barberos (crear, editar, invitar, activar/desactivar)
- ✅ Gestión de servicios /dashboard/servicios (crear, editar, activar/desactivar)
- ✅ Hotfix: availability format, photo upload, dashboard links, booking edge cases, cache revalidation

## Issues pendientes
- #30 — RLS policies eliminadas por drizzle-kit push — recrear antes de producción
- #31 — Path de avatar frágil al reemplazar foto
- #32 — Toggles no revierten estado en error de servidor
- #33 — DaySchedule duplicado en barber-form.tsx
- #34 — onSuccess inestable en useEffect de ServiceForm
- #35 — Header no se actualiza tras editar barbero
- #36 — Dirección estructurada con campos separados y link Google Maps exacto

## Próximas features
- [ ] Notificaciones (WhatsApp/Twilio) ← SIGUIENTE
- [ ] Bloqueo de slots (tabla blocked_slots ya existe en schema)
- [ ] Rol barber completo (UI para vincular cuenta existente a registro de barbers)
- [ ] Revenue dashboard
- [ ] Recordatorios inteligentes