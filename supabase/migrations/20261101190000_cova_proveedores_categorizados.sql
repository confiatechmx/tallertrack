-- ==============================================================================
-- Migración: Categorización de Proveedores y Catálogo Real de Cova Tires
-- Categorías: LLANTAS, SUSPENSION, TORNO_MAQUILA, OTROS
-- ==============================================================================

-- 1. Agregar columna categoria a la tabla proveedores si no existe
ALTER TABLE public.proveedores 
ADD COLUMN IF NOT EXISTS categoria text DEFAULT 'SUSPENSION';

-- Comentario explicativo
COMMENT ON COLUMN public.proveedores.categoria IS 'Tipo o giro comercial del proveedor: LLANTAS, SUSPENSION, TORNO_MAQUILA, OTROS';

-- 2. Índice para consultas rápidas agrupadas por categoría
CREATE INDEX IF NOT EXISTS idx_proveedores_empresa_categoria 
ON public.proveedores(empresa_id, categoria);

-- 3. Limpiar proveedores demo previos de Cova Tires
DO $$
DECLARE
  v_cova_id uuid := 'b2ad09db-0a34-4876-9ca3-d584c40bd294';
BEGIN
  -- Eliminar proveedores previos solo si no tienen compras registradas
  DELETE FROM public.proveedores 
  WHERE empresa_id = v_cova_id 
    AND id NOT IN (SELECT proveedor_id FROM public.compras_proveedores WHERE empresa_id = v_cova_id);
END $$;

-- 4. Insertar Catálogo Real de Cova Tires (Culiacán)
DO $$
DECLARE
  v_cova_id uuid := 'b2ad09db-0a34-4876-9ca3-d584c40bd294';
  v_suc_id  uuid := 'b2ad09db-0a34-4876-9ca3-d584c40bd295';
BEGIN

  -- ─── PROVEEDORES DE LLANTAS (10) ───
  INSERT INTO public.proveedores (empresa_id, sucursal_id, nombre_comercial, categoria, dias_credito, limite_credito, saldo_deudor_actual, meses_garantia_default, activo)
  VALUES
    (v_cova_id, v_suc_id, 'AYON', 'LLANTAS', 0, 0, 0, 12, true),
    (v_cova_id, v_suc_id, 'TERSA', 'LLANTAS', 0, 0, 0, 12, true),
    (v_cova_id, v_suc_id, 'HERRERA', 'LLANTAS', 0, 0, 0, 12, true),
    (v_cova_id, v_suc_id, 'LLYASA', 'LLANTAS', 0, 0, 0, 12, true),
    (v_cova_id, v_suc_id, 'SERVIMUNDO', 'LLANTAS', 0, 0, 0, 12, true),
    (v_cova_id, v_suc_id, 'BLUE TYRE', 'LLANTAS', 0, 0, 0, 12, true),
    (v_cova_id, v_suc_id, 'LLANTAS PLUS', 'LLANTAS', 0, 0, 0, 12, true),
    (v_cova_id, v_suc_id, 'HUSA', 'LLANTAS', 0, 0, 0, 12, true),
    (v_cova_id, v_suc_id, 'GUZMAN', 'LLANTAS', 0, 0, 0, 12, true),
    (v_cova_id, v_suc_id, 'RADIAL LLANTAS', 'LLANTAS', 0, 0, 0, 12, true);

  -- ─── PROVEEDORES DE SUSPENSIÓN Y AMORTIGUADORES (17) ───
  INSERT INTO public.proveedores (empresa_id, sucursal_id, nombre_comercial, categoria, dias_credito, limite_credito, saldo_deudor_actual, meses_garantia_default, activo)
  VALUES
    (v_cova_id, v_suc_id, 'DAR REFACCIONARIA', 'SUSPENSION', 0, 0, 0, 3, true),
    (v_cova_id, v_suc_id, 'OBAL ZAPATA', 'SUSPENSION', 0, 0, 0, 3, true),
    (v_cova_id, v_suc_id, 'OBAL REVOLUCION', 'SUSPENSION', 0, 0, 0, 3, true),
    (v_cova_id, v_suc_id, 'ARREDONDO', 'SUSPENSION', 0, 0, 0, 3, true),
    (v_cova_id, v_suc_id, 'RIOJA', 'SUSPENSION', 0, 0, 0, 3, true),
    (v_cova_id, v_suc_id, 'OREALLY 6 ENERO', 'SUSPENSION', 0, 0, 0, 3, true),
    (v_cova_id, v_suc_id, 'OREALLY OASIS', 'SUSPENSION', 0, 0, 0, 3, true),
    (v_cova_id, v_suc_id, 'AUTOZONE', 'SUSPENSION', 0, 0, 0, 3, true),
    (v_cova_id, v_suc_id, 'HOLLMAN', 'SUSPENSION', 0, 0, 0, 3, true),
    (v_cova_id, v_suc_id, 'RYUK', 'SUSPENSION', 0, 0, 0, 3, true),
    (v_cova_id, v_suc_id, 'SAN NAYARIT', 'SUSPENSION', 0, 0, 0, 3, true),
    (v_cova_id, v_suc_id, 'PAT AUTOPARTES', 'SUSPENSION', 0, 0, 0, 3, true),
    (v_cova_id, v_suc_id, 'VAZLO AUTODIS', 'SUSPENSION', 0, 0, 0, 3, true),
    (v_cova_id, v_suc_id, 'TORNICENTER', 'SUSPENSION', 0, 0, 0, 3, true),
    (v_cova_id, v_suc_id, 'HULES Y BANDAS', 'SUSPENSION', 0, 0, 0, 3, true),
    (v_cova_id, v_suc_id, 'REFACCIONARIA MANNY', 'SUSPENSION', 0, 0, 0, 3, true),
    (v_cova_id, v_suc_id, 'REFACCIONARIA ACOSTA', 'SUSPENSION', 0, 0, 0, 3, true);

END $$;
