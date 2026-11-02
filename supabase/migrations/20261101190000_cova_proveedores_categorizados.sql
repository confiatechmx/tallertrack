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

-- 4. Insertar Catálogo Real de Cova (Culiacán) en Formato Limpio Title Case
DO $$
DECLARE
  v_cova_id uuid := 'b2ad09db-0a34-4876-9ca3-d584c40bd294';
  v_suc_id  uuid := 'b2ad09db-0a34-4876-9ca3-d584c40bd295';
BEGIN

  -- ─── PROVEEDORES DE LLANTAS (10) ───
  INSERT INTO public.proveedores (empresa_id, sucursal_id, nombre_comercial, categoria, dias_credito, limite_credito, saldo_deudor_actual, meses_garantia_default, activo)
  VALUES
    (v_cova_id, v_suc_id, 'Ayon', 'LLANTAS', 0, 0, 0, 12, true),
    (v_cova_id, v_suc_id, 'Tersa', 'LLANTAS', 0, 0, 0, 12, true),
    (v_cova_id, v_suc_id, 'Herrera', 'LLANTAS', 0, 0, 0, 12, true),
    (v_cova_id, v_suc_id, 'Llyasa', 'LLANTAS', 0, 0, 0, 12, true),
    (v_cova_id, v_suc_id, 'Servimundo', 'LLANTAS', 0, 0, 0, 12, true),
    (v_cova_id, v_suc_id, 'Blue Tyre', 'LLANTAS', 0, 0, 0, 12, true),
    (v_cova_id, v_suc_id, 'Llantas Plus', 'LLANTAS', 0, 0, 0, 12, true),
    (v_cova_id, v_suc_id, 'Husa', 'LLANTAS', 0, 0, 0, 12, true),
    (v_cova_id, v_suc_id, 'Guzmán', 'LLANTAS', 0, 0, 0, 12, true),
    (v_cova_id, v_suc_id, 'Radial Llantas', 'LLANTAS', 0, 0, 0, 12, true);

  -- ─── PROVEEDORES DE SUSPENSIÓN Y AMORTIGUADORES (17) ───
  INSERT INTO public.proveedores (empresa_id, sucursal_id, nombre_comercial, categoria, dias_credito, limite_credito, saldo_deudor_actual, meses_garantia_default, activo)
  VALUES
    (v_cova_id, v_suc_id, 'Dar Refaccionaria', 'SUSPENSION', 0, 0, 0, 3, true),
    (v_cova_id, v_suc_id, 'Obal Zapata', 'SUSPENSION', 0, 0, 0, 3, true),
    (v_cova_id, v_suc_id, 'Obal Revolución', 'SUSPENSION', 0, 0, 0, 3, true),
    (v_cova_id, v_suc_id, 'Arredondo', 'SUSPENSION', 0, 0, 0, 3, true),
    (v_cova_id, v_suc_id, 'Rioja', 'SUSPENSION', 0, 0, 0, 3, true),
    (v_cova_id, v_suc_id, 'O''Reilly 6 de Enero', 'SUSPENSION', 0, 0, 0, 3, true),
    (v_cova_id, v_suc_id, 'O''Reilly Oasis', 'SUSPENSION', 0, 0, 0, 3, true),
    (v_cova_id, v_suc_id, 'AutoZone', 'SUSPENSION', 0, 0, 0, 3, true),
    (v_cova_id, v_suc_id, 'Hollman', 'SUSPENSION', 0, 0, 0, 3, true),
    (v_cova_id, v_suc_id, 'Ryuk', 'SUSPENSION', 0, 0, 0, 3, true),
    (v_cova_id, v_suc_id, 'San Nayarit', 'SUSPENSION', 0, 0, 0, 3, true),
    (v_cova_id, v_suc_id, 'Pat Autopartes', 'SUSPENSION', 0, 0, 0, 3, true),
    (v_cova_id, v_suc_id, 'Vazlo Autodis', 'SUSPENSION', 0, 0, 0, 3, true),
    (v_cova_id, v_suc_id, 'Tornicenter', 'SUSPENSION', 0, 0, 0, 3, true),
    (v_cova_id, v_suc_id, 'Hules y Bandas', 'SUSPENSION', 0, 0, 0, 3, true),
    (v_cova_id, v_suc_id, 'Refaccionaria Manny', 'SUSPENSION', 0, 0, 0, 3, true),
    (v_cova_id, v_suc_id, 'Refaccionaria Acosta', 'SUSPENSION', 0, 0, 0, 3, true);

  -- ─── PROVEEDORES DE TORNO Y MAQUILAS (1) ───
  INSERT INTO public.proveedores (empresa_id, sucursal_id, nombre_comercial, categoria, dias_credito, limite_credito, saldo_deudor_actual, meses_garantia_default, activo)
  VALUES
    (v_cova_id, v_suc_id, 'Torno Chalio', 'TORNO_MAQUILA', 0, 0, 0, 1, true);

END $$;
