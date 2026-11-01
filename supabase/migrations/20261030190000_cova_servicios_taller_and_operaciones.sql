-- Migración: Estructura de Paquetes / Operaciones y Catálogo de Servicios Cova Tires
-- Etapa 1 - Punto B

-- 1. Agregar columnas para paquetes y cortesías
ALTER TABLE public.servicios_taller
  ADD COLUMN IF NOT EXISTS garantia_meses INTEGER DEFAULT 3,
  ADD COLUMN IF NOT EXISTS condicion_promo TEXT DEFAULT NULL;

ALTER TABLE public.orden_servicio_servicios
  ADD COLUMN IF NOT EXISTS paquete_operacion TEXT DEFAULT 'General',
  ADD COLUMN IF NOT EXISTS es_cortesia BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS garantia_especifica TEXT DEFAULT NULL;

ALTER TABLE public.orden_servicio_refacciones
  ADD COLUMN IF NOT EXISTS paquete_operacion TEXT DEFAULT 'General',
  ADD COLUMN IF NOT EXISTS es_cortesia BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS garantia_especifica TEXT DEFAULT NULL;

ALTER TABLE public.detalles_cotizacion
  ADD COLUMN IF NOT EXISTS paquete_operacion TEXT DEFAULT 'Llantas',
  ADD COLUMN IF NOT EXISTS es_cortesia BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS garantia_especifica TEXT DEFAULT NULL;

-- 2. Limpiar servicios previos de prueba de Cova si existen para evitar duplicados
DELETE FROM public.servicios_taller
WHERE empresa_id = 'b2ad09db-0a34-4876-9ca3-d584c40bd294'
  AND codigo_sku IN (
    'SRV-MONT-16', 'SRV-MONT-20', 'SRV-MONT-CAM',
    'SRV-BAL-CLIP', 'SRV-BAL-ADH',
    'SRV-VAL-TR413', 'SRV-VAL-CROM', 'SRV-TPMS',
    'SRV-NITRO', 'SRV-ROT',
    'SRV-ALI-DEL', 'SRV-ALI-4R',
    'SRV-PON-MECHA', 'SRV-PON-HONGO',
    'SRV-FREN-BAL', 'SRV-SUS-AMORT', 'SRV-SUS-AMORT-T', 'SRV-SUS-ROT', 'SRV-DIAG-SEG'
  );

-- 3. Catálogo oficial de servicios Cova Tires (Monterrey)
INSERT INTO public.servicios_taller (
  empresa_id,
  nombre,
  descripcion,
  categoria,
  precio,
  horas_estimadas,
  codigo_sku,
  aplica_promo_llantas,
  activo,
  garantia_meses,
  condicion_promo
) VALUES
  -- Servicios de Llantas & Ruedas
  (
    'b2ad09db-0a34-4876-9ca3-d584c40bd294',
    'Montaje de Llanta (Rin 13 a 16)',
    'Desmontaje de llanta usada y montaje en rin con lubricante especial y asentamiento de ceja.',
    'Llantas y Ruedas',
    100.00,
    0.25,
    'SRV-MONT-16',
    true,
    true,
    6,
    'Gratis en la compra de 4 llantas'
  ),
  (
    'b2ad09db-0a34-4876-9ca3-d584c40bd294',
    'Montaje de Llanta (Rin 17 a 20 / Perfil Bajo)',
    'Montaje especializado con brazo auxiliar para evitar daño a rines de aluminio y cejas de bajo perfil.',
    'Llantas y Ruedas',
    150.00,
    0.35,
    'SRV-MONT-20',
    true,
    true,
    6,
    'Gratis en la compra de 4 llantas'
  ),
  (
    'b2ad09db-0a34-4876-9ca3-d584c40bd294',
    'Montaje Camioneta / Mud Terrain (Rin 20+ / AT / MT)',
    'Montaje pesado para pickups, todoterreno y neumáticos con capas de carga reforzada.',
    'Llantas y Ruedas',
    200.00,
    0.50,
    'SRV-MONT-CAM',
    false,
    true,
    6,
    NULL
  ),
  (
    'b2ad09db-0a34-4876-9ca3-d584c40bd294',
    'Balanceo Dinámico por Computadora (Plomo de Clip)',
    'Calibración y equilibrio de pesos en balanceadora computarizada para rines de acero/lámina.',
    'Llantas y Ruedas',
    100.00,
    0.25,
    'SRV-BAL-CLIP',
    true,
    true,
    6,
    'Gratis en la compra de 4 llantas'
  ),
  (
    'b2ad09db-0a34-4876-9ca3-d584c40bd294',
    'Balanceo Dinámico por Computadora (Plomo Adhesivo Oculto)',
    'Balanceo estético con contrapesos autoadheribles tras los rayos para rines de aluminio de alta gama.',
    'Llantas y Ruedas',
    120.00,
    0.30,
    'SRV-BAL-ADH',
    true,
    true,
    6,
    NULL
  ),
  (
    'b2ad09db-0a34-4876-9ca3-d584c40bd294',
    'Válvula de Hule de Seguridad TR-413 (Nueva)',
    'Reemplazo de pivote y válvula para asegurar hermeticidad y evitar pérdidas de presión.',
    'Llantas y Ruedas',
    50.00,
    0.10,
    'SRV-VAL-TR413',
    true,
    true,
    12,
    'Cortesía en la compra de neumáticos'
  ),
  (
    'b2ad09db-0a34-4876-9ca3-d584c40bd294',
    'Válvula Metálica Cromada de Alta Resistencia',
    'Válvula reforzada para rines deportivos y altas presiones.',
    'Llantas y Ruedas',
    120.00,
    0.10,
    'SRV-VAL-CROM',
    false,
    true,
    12,
    NULL
  ),
  (
    'b2ad09db-0a34-4876-9ca3-d584c40bd294',
    'Servicio / Calibración de Sensor TPMS',
    'Instalación de kit de sellos o reprogramación del sensor de monitoreo de presión.',
    'Llantas y Ruedas',
    250.00,
    0.30,
    'SRV-TPMS',
    false,
    true,
    6,
    NULL
  ),
  (
    'b2ad09db-0a34-4876-9ca3-d584c40bd294',
    'Calibración e Inflado con Nitrógeno (4 Ruedas)',
    'Purga e inflado con nitrógeno al 98% para menor desgaste y presión constante.',
    'Llantas y Ruedas',
    250.00,
    0.30,
    'SRV-NITRO',
    false,
    true,
    3,
    'Rellenos gratis durante 6 meses'
  ),
  (
    'b2ad09db-0a34-4876-9ca3-d584c40bd294',
    'Rotación de 4 Neumáticos',
    'Patrón cruzado o lineal para un desgaste uniforme de la banda de rodamiento.',
    'Llantas y Ruedas',
    200.00,
    0.30,
    'SRV-ROT',
    false,
    true,
    3,
    NULL
  ),

  -- Alineación Computarizada
  (
    'b2ad09db-0a34-4876-9ca3-d584c40bd294',
    'Alineación Computarizada 3D (Eje Delantero)',
    'Ajuste de convergencia y camber en eje delantero según especificaciones del fabricante.',
    'Alineación',
    450.00,
    0.60,
    'SRV-ALI-DEL',
    false,
    true,
    3,
    '50% desc. en paquete 4 llantas'
  ),
  (
    'b2ad09db-0a34-4876-9ca3-d584c40bd294',
    'Alineación Computarizada 3D (4 Ruedas / Ambos Ejes)',
    'Alineación completa delantera y trasera para sedanes independientes, SUVs y pickups.',
    'Alineación',
    650.00,
    0.80,
    'SRV-ALI-4R',
    false,
    true,
    3,
    NULL
  ),

  -- Ponchaduras y Reparación
  (
    'b2ad09db-0a34-4876-9ca3-d584c40bd294',
    'Reparación de Ponchadura Express (Mecha Selladora)',
    'Reparación rápida sin desmontar neumático para clavos o tornillos en piso de rodamiento.',
    'Ponchaduras',
    100.00,
    0.20,
    'SRV-PON-MECHA',
    false,
    true,
    1,
    NULL
  ),
  (
    'b2ad09db-0a34-4876-9ca3-d584c40bd294',
    'Reparación Profesional de Ponchadura (Parche Tipo Hongo / Vulcanizado)',
    'Desmontaje, sellado interno del liner con parche hongo vulcanizado en frío y balanceo.',
    'Ponchaduras',
    250.00,
    0.45,
    'SRV-PON-HONGO',
    false,
    true,
    6,
    NULL
  ),

  -- Mano de Obra: Frenos y Suspensión
  (
    'b2ad09db-0a34-4876-9ca3-d584c40bd294',
    'Mano de Obra: Reemplazo de Balatas (Por Eje)',
    'Cambio de pastillas de freno, limpieza de caliper y lubricación de pernos guía.',
    'Frenos',
    450.00,
    0.80,
    'SRV-FREN-BAL',
    false,
    true,
    3,
    NULL
  ),
  (
    'b2ad09db-0a34-4876-9ca3-d584c40bd294',
    'Mano de Obra: Reemplazo de Amortiguador Delantero (Por Pieza)',
    'Desmontaje de pierna MacPherson, compresión de resorte e instalación de amortiguador nuevo.',
    'Suspensión',
    400.00,
    1.00,
    'SRV-SUS-AMORT',
    false,
    true,
    3,
    NULL
  ),
  (
    'b2ad09db-0a34-4876-9ca3-d584c40bd294',
    'Mano de Obra: Reemplazo de Amortiguador Trasero (Por Pieza)',
    'Instalación y torqueo de amortiguador trasero.',
    'Suspensión',
    250.00,
    0.50,
    'SRV-SUS-AMORT-T',
    false,
    true,
    3,
    NULL
  ),
  (
    'b2ad09db-0a34-4876-9ca3-d584c40bd294',
    'Mano de Obra: Reemplazo de Rótula o Terminal de Dirección',
    'Cambio de componente de dirección/suspensión y verificación de cotas.',
    'Suspensión',
    350.00,
    0.70,
    'SRV-SUS-ROT',
    false,
    true,
    3,
    NULL
  ),
  (
    'b2ad09db-0a34-4876-9ca3-d584c40bd294',
    'Inspección y Diagnóstico de Seguridad Multipunto (DVI)',
    'Revisión en rampa de suspensión, frenos, bandas, fugas, amortiguadores y profundidad de piso.',
    'Diagnóstico',
    250.00,
    0.40,
    'SRV-DIAG-SEG',
    false,
    true,
    1,
    'Cortesía en servicios mayores a $1,500'
  );
