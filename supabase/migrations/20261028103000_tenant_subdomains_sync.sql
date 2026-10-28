-- Migration: tenant_subdomains_sync
-- Agrega columna subdominio a empresas y sincroniza dominios principales en tenant_domains

ALTER TABLE public.empresas ADD COLUMN IF NOT EXISTS subdominio text;

-- Asegurar valores iniciales
UPDATE public.empresas SET subdominio = 'cova' WHERE id = 'b2ad09db-0a34-4876-9ca3-d584c40bd294';
UPDATE public.empresas SET subdominio = 'torqueyruta' WHERE id = 'a0000000-0000-0000-0000-000000000001';

-- Función para sincronizar subdominio automático
CREATE OR REPLACE FUNCTION public.sync_empresa_subdomain()
RETURNS TRIGGER AS $$
DECLARE
  v_subdomain TEXT;
BEGIN
  IF NEW.subdominio IS NULL OR trim(NEW.subdominio) = '' THEN
    v_subdomain := lower(regexp_replace(NEW.nombre_comercial, '[^a-zA-Z0-9]+', '', 'g'));
    NEW.subdominio := v_subdomain;
  ELSE
    NEW.subdominio := lower(regexp_replace(NEW.subdominio, '[^a-zA-Z0-9\-]+', '', 'g'));
  END IF;

  IF NEW.subdominio IS NOT NULL AND NEW.subdominio <> '' THEN
    INSERT INTO public.tenant_domains (empresa_id, domain, is_primary, verified, custom_theme)
    VALUES (
      NEW.id,
      NEW.subdominio || '.tallertrack.com',
      true,
      true,
      jsonb_build_object(
        'app_title', NEW.nombre_comercial,
        'primary_color', NEW.color_primario,
        'sidebar_color', NEW.color_sidebar
      )
    )
    ON CONFLICT (domain) DO UPDATE SET
      empresa_id = EXCLUDED.empresa_id,
      is_primary = EXCLUDED.is_primary,
      verified = true;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_empresa_subdomain ON public.empresas;
CREATE TRIGGER trg_empresa_subdomain
BEFORE INSERT OR UPDATE OF subdominio, nombre_comercial, color_primario, color_sidebar
ON public.empresas
FOR EACH ROW
EXECUTE FUNCTION public.sync_empresa_subdomain();
