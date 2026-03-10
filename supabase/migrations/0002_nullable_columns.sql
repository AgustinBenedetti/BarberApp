-- Hacer tenant_id nullable en profiles para soportar el flujo de onboarding.
-- El dueño se registra sin tenant aún; el tenant se crea en el paso 1 del wizard.
ALTER TABLE profiles ALTER COLUMN tenant_id DROP NOT NULL;

-- Hacer profile_id nullable en barbers para soportar barberos sin cuenta propia.
-- El dueño puede agregar barberos durante el onboarding; se vinculan cuando ellos se registran.
ALTER TABLE barbers ALTER COLUMN profile_id DROP NOT NULL;
