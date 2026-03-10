# BarberSaaS — Proyecto inicial

## Contexto del producto
Estás ayudando a desarrollar **BarberSaaS**, un SaaS multi-tenant para barberías que combina gestión de turnos + CRM de clientes + experiencia personalizada.

**Diferenciador clave:** No es solo una app de turnos — el CRM con preferencias personales del cliente (música, bebida, notas del barbero) es lo que lo hace premium.

## Stack definido
- **Framework:** Next.js 16 (App Router + RSC)
- **Runtime:** Node.js 25, pnpm
- **Auth + DB + Storage:** Supabase (free tier para MVP)
- **ORM:** Drizzle ORM (NO cliente raw de Supabase, NO Prisma)
- **Seguridad:** RLS por tenant con función `get_current_tenant_id()`
- **UI:** Tailwind CSS 4 + shadcn/ui + Lucide icons
- **Validación:** Zod
- **Notificaciones:** WhatsApp API o Twilio
- **Testing:** Vitest
- **Deploy:** Vercel

## Roles de usuario
- **Owner:** acceso completo (config, barberos, clientes, turnos, reportes)
- **Barber:** acceso operativo (su agenda, perfil de clientes)
- **Client:** acceso limitado (ver y reservar turnos)

## Schema de base de datos
Implementar las siguientes tablas con Drizzle ORM. Todas las tablas con `tenant_id` deben tener RLS policies en Supabase:
```sql
tenants (id, name, slug, address, phone, logo_url, cover_image_url, opening_hours jsonb, created_at)
profiles (id, tenant_id, email, phone, full_name, role, avatar_url, created_at)
barbers (id, tenant_id, profile_id, display_name, bio, availability jsonb, is_active, created_at)
services (id, tenant_id, name, duration_minutes, price, currency, is_active, created_at)
barber_services (barber_id, service_id)
clients (id, tenant_id, profile_id, name, phone, email, notes, preferences jsonb, first_visit_at, last_visit_at, visit_count, created_at)
appointments (id, tenant_id, client_id, barber_id, service_id, date, start_time, end_time, status, source, notes, created_at)
blocked_slots (id, tenant_id, barber_id, date, start_time, end_time, reason, created_at)
```

`appointments.status`: pending | confirmed | completed | cancelled | no_show
`appointments.source`: landing | manual | whatsapp
`clients.preferences` ejemplo: `{ "music": "rock", "drink": "café" }`

## Features del MVP
1. **Sistema de turnos** — disponibilidad por barbero, calendario día/semana, cancelaciones
2. **Landing pública** — ruta `app.com/{slug}` por barbería, reserva self-service, registro automático de clientes nuevos
3. **CRM básico** — historial de visitas, preferencias personales, notas del barbero

## Tarea inicial
Hacer el scaffold del proyecto:
1. Inicializar Next.js 16 con App Router usando pnpm
2. Configurar Tailwind CSS 4 + shadcn/ui
3. Configurar Drizzle ORM con conexión a Supabase (PostgreSQL)
4. Crear el schema completo en Drizzle con todas las tablas listadas arriba
5. Configurar Supabase Auth con los 3 roles (owner, barber, client)
6. Crear las RLS policies para todas las tablas con tenant_id
7. Estructura de carpetas sugerida para App Router con multi-tenancy

## Convenciones
- TypeScript estricto en todo el proyecto
- Server Actions para mutaciones (no API routes innecesarias)
- Drizzle para todas las queries, nunca el cliente raw de Supabase para DB
- Variables de entorno tipadas con Zod
- No usar `as unknown as Type` — si el tipo no cierra, hay que resolverlo bien

## Estado del proyecto
El scaffold inicial ya está completo. El schema de Drizzle está definido 
y la conexión a Supabase está configurada. Las tablas están creadas en la DB.

## Próxima tarea Feature: Autenticación + Onboarding del dueño

### Flujo completo
1. El dueño se registra con email y password via Supabase Auth
2. Al confirmar el email, entra al wizard de onboarding (3 pasos)
3. Al terminar el wizard, llega a su dashboard principal

### Wizard de onboarding

**Paso 1 — Barbería (OBLIGATORIO)**
- Nombre de la barbería
- Slug (generado automáticamente desde el nombre, editable)
  - Validar que sea único en la tabla tenants
  - Solo letras minúsculas, números y guiones
- Dirección
- Logo (upload a Supabase Storage)
- Horarios de atención por día (lunes a domingo, con opción "cerrado")
- No puede continuar sin nombre y slug

**Paso 2 — Servicios (OPCIONAL, se puede saltar)**
- Agregar servicios: nombre, duración en minutos, precio en ARS
- Botón "Agregar otro servicio"
- Mínimo 1 servicio para que el paso cuente como completo
- Si lo saltea, queda pendiente en el dashboard

**Paso 3 — Barberos (OPCIONAL, se puede saltar)**
- Agregar barberos: nombre, email (opcional), horarios por día
- Si el dueño es también barbero, checkbox "Yo soy barbero"
- Si lo saltea, queda pendiente en el dashboard

### Post-wizard
- Redirigir al dashboard principal
- En el dashboard principal, mostrar un botón destacado "Ver mi landing" 
  que lleve a /[slug] (abre en nueva pestaña)
- Si hay pasos incompletos, mostrar un banner "Tu barbería no está lista aún" 
  con links para completar cada paso pendiente

### Consideraciones técnicas
- Usar Supabase Auth para registro y login
- Al completar el Paso 1, crear el registro en la tabla `tenants` y el 
  `profile` del dueño con role = 'owner'
- Server Actions para todas las mutaciones
- Validación con Zod en cliente y servidor
- Middleware para proteger rutas del dashboard (solo usuarios autenticados)
- Middleware para redirigir al wizard si el onboarding no está completo
- RLS: el dueño solo puede ver y editar su propio tenant
- Diseño Mobile-First en todos los componentes. Usar Tailwind con breakpoints 
  md: y lg: para adaptar a desktop, pero la base siempre es mobile.
- Rutas:
  - /register → formulario de registro
  - /onboarding/step-1 → datos de la barbería
  - /onboarding/step-2 → servicios
  - /onboarding/step-3 → barberos
  - /dashboard → panel principal (protegida)