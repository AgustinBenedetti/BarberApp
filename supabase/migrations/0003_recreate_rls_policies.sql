-- ============================================================
-- Recrear RLS Policies — BarberSaaS
-- Ejecutar en Supabase SQL Editor si drizzle-kit push eliminó las policies
-- Idempotente: DROP IF EXISTS antes de cada CREATE
-- ============================================================

-- ── Funciones auxiliares ──────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION get_current_tenant_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT (auth.jwt() -> 'app_metadata' ->> 'tenant_id')::uuid;
$$;

CREATE OR REPLACE FUNCTION get_current_user_role()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT auth.jwt() -> 'app_metadata' ->> 'role';
$$;

-- ============================================================
-- TENANTS
-- ============================================================
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tenants: owner puede ver su tenant"      ON tenants;
DROP POLICY IF EXISTS "tenants: owner puede actualizar su tenant" ON tenants;

CREATE POLICY "tenants: owner puede ver su tenant"
  ON tenants FOR SELECT
  USING (id = get_current_tenant_id());

CREATE POLICY "tenants: owner puede actualizar su tenant"
  ON tenants FOR UPDATE
  USING (id = get_current_tenant_id() AND get_current_user_role() = 'owner');

-- ============================================================
-- PROFILES
-- ============================================================
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "profiles: usuario puede ver su propio perfil"         ON profiles;
DROP POLICY IF EXISTS "profiles: owner ve todos los perfiles del tenant"     ON profiles;
DROP POLICY IF EXISTS "profiles: usuario puede actualizar su propio perfil"  ON profiles;
DROP POLICY IF EXISTS "profiles: owner puede insertar perfiles en su tenant" ON profiles;

CREATE POLICY "profiles: usuario puede ver su propio perfil"
  ON profiles FOR SELECT
  USING (id = auth.uid());

CREATE POLICY "profiles: owner ve todos los perfiles del tenant"
  ON profiles FOR SELECT
  USING (tenant_id = get_current_tenant_id() AND get_current_user_role() = 'owner');

CREATE POLICY "profiles: usuario puede actualizar su propio perfil"
  ON profiles FOR UPDATE
  USING (id = auth.uid());

CREATE POLICY "profiles: owner puede insertar perfiles en su tenant"
  ON profiles FOR INSERT
  WITH CHECK (tenant_id = get_current_tenant_id() AND get_current_user_role() = 'owner');

-- ============================================================
-- BARBERS
-- ============================================================
ALTER TABLE barbers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "barbers: lectura pública por tenant"                     ON barbers;
DROP POLICY IF EXISTS "barbers: owner gestiona barberos de su tenant"           ON barbers;
DROP POLICY IF EXISTS "barbers: barbero puede ver y actualizar su propio perfil" ON barbers;
DROP POLICY IF EXISTS "barbers: barbero puede actualizar su propio perfil"      ON barbers;

CREATE POLICY "barbers: lectura pública por tenant"
  ON barbers FOR SELECT
  USING (tenant_id = get_current_tenant_id() AND is_active = true);

CREATE POLICY "barbers: owner gestiona barberos de su tenant"
  ON barbers FOR ALL
  USING (tenant_id = get_current_tenant_id() AND get_current_user_role() = 'owner');

CREATE POLICY "barbers: barbero puede ver y actualizar su propio perfil"
  ON barbers FOR SELECT
  USING (profile_id = auth.uid());

CREATE POLICY "barbers: barbero puede actualizar su propio perfil"
  ON barbers FOR UPDATE
  USING (profile_id = auth.uid() AND tenant_id = get_current_tenant_id());

-- ============================================================
-- SERVICES
-- ============================================================
ALTER TABLE services ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "services: lectura para miembros del tenant" ON services;
DROP POLICY IF EXISTS "services: owner gestiona servicios de su tenant" ON services;

CREATE POLICY "services: lectura para miembros del tenant"
  ON services FOR SELECT
  USING (tenant_id = get_current_tenant_id());

CREATE POLICY "services: owner gestiona servicios de su tenant"
  ON services FOR ALL
  USING (tenant_id = get_current_tenant_id() AND get_current_user_role() = 'owner');

-- ============================================================
-- BARBER_SERVICES
-- ============================================================
ALTER TABLE barber_services ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "barber_services: lectura para miembros del tenant" ON barber_services;
DROP POLICY IF EXISTS "barber_services: owner gestiona asignaciones"      ON barber_services;

CREATE POLICY "barber_services: lectura para miembros del tenant"
  ON barber_services FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM barbers
      WHERE barbers.id = barber_services.barber_id
        AND barbers.tenant_id = get_current_tenant_id()
    )
  );

CREATE POLICY "barber_services: owner gestiona asignaciones"
  ON barber_services FOR ALL
  USING (
    get_current_user_role() = 'owner' AND
    EXISTS (
      SELECT 1 FROM barbers
      WHERE barbers.id = barber_services.barber_id
        AND barbers.tenant_id = get_current_tenant_id()
    )
  );

-- ============================================================
-- CLIENTS
-- ============================================================
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "clients: owner y barberos ven clientes del tenant"      ON clients;
DROP POLICY IF EXISTS "clients: cliente ve su propio perfil"                   ON clients;
DROP POLICY IF EXISTS "clients: owner y barberos pueden crear clientes"        ON clients;
DROP POLICY IF EXISTS "clients: owner y barberos pueden actualizar clientes"   ON clients;

CREATE POLICY "clients: owner y barberos ven clientes del tenant"
  ON clients FOR SELECT
  USING (
    tenant_id = get_current_tenant_id()
    AND get_current_user_role() IN ('owner', 'barber')
  );

CREATE POLICY "clients: cliente ve su propio perfil"
  ON clients FOR SELECT
  USING (profile_id = auth.uid());

CREATE POLICY "clients: owner y barberos pueden crear clientes"
  ON clients FOR INSERT
  WITH CHECK (
    tenant_id = get_current_tenant_id()
    AND get_current_user_role() IN ('owner', 'barber')
  );

CREATE POLICY "clients: owner y barberos pueden actualizar clientes"
  ON clients FOR UPDATE
  USING (
    tenant_id = get_current_tenant_id()
    AND get_current_user_role() IN ('owner', 'barber')
  );

-- ============================================================
-- APPOINTMENTS
-- ============================================================
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "appointments: owner ve todos los turnos del tenant"   ON appointments;
DROP POLICY IF EXISTS "appointments: barbero ve sus propios turnos"          ON appointments;
DROP POLICY IF EXISTS "appointments: cliente ve sus propios turnos"          ON appointments;
DROP POLICY IF EXISTS "appointments: miembros del tenant pueden crear turnos" ON appointments;
DROP POLICY IF EXISTS "appointments: owner puede actualizar cualquier turno" ON appointments;
DROP POLICY IF EXISTS "appointments: barbero puede actualizar sus turnos"    ON appointments;

CREATE POLICY "appointments: owner ve todos los turnos del tenant"
  ON appointments FOR SELECT
  USING (tenant_id = get_current_tenant_id() AND get_current_user_role() = 'owner');

CREATE POLICY "appointments: barbero ve sus propios turnos"
  ON appointments FOR SELECT
  USING (
    tenant_id = get_current_tenant_id()
    AND get_current_user_role() = 'barber'
    AND barber_id IN (
      SELECT id FROM barbers WHERE profile_id = auth.uid()
    )
  );

CREATE POLICY "appointments: cliente ve sus propios turnos"
  ON appointments FOR SELECT
  USING (
    tenant_id = get_current_tenant_id()
    AND client_id IN (
      SELECT id FROM clients WHERE profile_id = auth.uid()
    )
  );

CREATE POLICY "appointments: miembros del tenant pueden crear turnos"
  ON appointments FOR INSERT
  WITH CHECK (tenant_id = get_current_tenant_id());

CREATE POLICY "appointments: owner puede actualizar cualquier turno"
  ON appointments FOR UPDATE
  USING (tenant_id = get_current_tenant_id() AND get_current_user_role() = 'owner');

CREATE POLICY "appointments: barbero puede actualizar sus turnos"
  ON appointments FOR UPDATE
  USING (
    tenant_id = get_current_tenant_id()
    AND get_current_user_role() = 'barber'
    AND barber_id IN (
      SELECT id FROM barbers WHERE profile_id = auth.uid()
    )
  );

-- ============================================================
-- BLOCKED_SLOTS
-- ============================================================
ALTER TABLE blocked_slots ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "blocked_slots: lectura para miembros del tenant" ON blocked_slots;
DROP POLICY IF EXISTS "blocked_slots: owner gestiona slots bloqueados"  ON blocked_slots;
DROP POLICY IF EXISTS "blocked_slots: barbero gestiona sus propios slots" ON blocked_slots;

CREATE POLICY "blocked_slots: lectura para miembros del tenant"
  ON blocked_slots FOR SELECT
  USING (tenant_id = get_current_tenant_id());

CREATE POLICY "blocked_slots: owner gestiona slots bloqueados"
  ON blocked_slots FOR ALL
  USING (tenant_id = get_current_tenant_id() AND get_current_user_role() = 'owner');

CREATE POLICY "blocked_slots: barbero gestiona sus propios slots"
  ON blocked_slots FOR ALL
  USING (
    tenant_id = get_current_tenant_id()
    AND get_current_user_role() = 'barber'
    AND barber_id IN (
      SELECT id FROM barbers WHERE profile_id = auth.uid()
    )
  );
