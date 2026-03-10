-- ============================================================
-- RLS Policies para BarberSaaS
-- Ejecutar en el SQL Editor de Supabase o via supabase db push
-- ============================================================

-- Función auxiliar para obtener el tenant_id del usuario autenticado
-- Se almacena en app_metadata del JWT para evitar queries adicionales
CREATE OR REPLACE FUNCTION get_current_tenant_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT (auth.jwt() -> 'app_metadata' ->> 'tenant_id')::uuid;
$$;

-- Función auxiliar para obtener el rol del usuario autenticado
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

-- ============================================================
-- TRIGGER: crear profile automáticamente al registrarse un usuario
-- ============================================================
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO profiles (id, tenant_id, email, full_name, role)
  VALUES (
    NEW.id,
    (NEW.raw_app_meta_data ->> 'tenant_id')::uuid,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', NEW.email),
    COALESCE(NEW.raw_app_meta_data ->> 'role', 'client')
  );
  RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
