-- ==============================================================================
-- MIGRATION: 20261030180000_cova_seed_top_tires_monterrey.sql
-- DESCRIPTION: Semilla de catálogo base de las 25 medidas y modelos de neumáticos
--              de más alta rotación en Monterrey para Cova Tires (Just-in-Time).
--              Todas las existencias iniciales se configuran en 0 ya que Cova
--              opera bajo modelo de compra al distribuidor sobre pedido.
-- ==============================================================================

DO $$
DECLARE
  v_cova_id UUID := 'b2ad09db-0a34-4876-9ca3-d584c40bd294';
  v_sucursal_id UUID := 'b2ad09db-0a34-4876-9ca3-d584c40bd295';
BEGIN
  -- Verificar que la empresa Cova Tires existe
  IF NOT EXISTS (SELECT 1 FROM public.empresas WHERE id = v_cova_id) THEN
    RETURN;
  END IF;

  -- 1. 205/55 R16 (Autos compactos y sedanes: Versa, Sentra, Jetta, Civic, Corolla)
  IF NOT EXISTS (SELECT 1 FROM public.inventario_llantas_base WHERE empresa_id = v_cova_id AND ancho = 205 AND perfil = 55 AND rin = 16 AND marca = 'Michelin') THEN
    INSERT INTO public.inventario_llantas_base (empresa_id, sucursal_id, marca, modelo_llanta, ancho, perfil, rin, indice_carga_velocidad, tipo_terreno, costo_adquisicion, precio_venta, stock_actual, stock_minimo)
    VALUES (v_cova_id, v_sucursal_id, 'Michelin', 'Primacy 4', 205, 55, 16, '91V', 'HT', 1850.00, 2450.00, 0, 0);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.inventario_llantas_base WHERE empresa_id = v_cova_id AND ancho = 205 AND perfil = 55 AND rin = 16 AND marca = 'Bridgestone') THEN
    INSERT INTO public.inventario_llantas_base (empresa_id, sucursal_id, marca, modelo_llanta, ancho, perfil, rin, indice_carga_velocidad, tipo_terreno, costo_adquisicion, precio_venta, stock_actual, stock_minimo)
    VALUES (v_cova_id, v_sucursal_id, 'Bridgestone', 'Turanza ER300', 205, 55, 16, '91V', 'HT', 1650.00, 2190.00, 0, 0);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.inventario_llantas_base WHERE empresa_id = v_cova_id AND ancho = 205 AND perfil = 55 AND rin = 16 AND marca = 'Continental') THEN
    INSERT INTO public.inventario_llantas_base (empresa_id, sucursal_id, marca, modelo_llanta, ancho, perfil, rin, indice_carga_velocidad, tipo_terreno, costo_adquisicion, precio_venta, stock_actual, stock_minimo)
    VALUES (v_cova_id, v_sucursal_id, 'Continental', 'ContiPremiumContact', 205, 55, 16, '91H', 'HT', 1600.00, 2150.00, 0, 0);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.inventario_llantas_base WHERE empresa_id = v_cova_id AND ancho = 205 AND perfil = 55 AND rin = 16 AND marca = 'Tornel') THEN
    INSERT INTO public.inventario_llantas_base (empresa_id, sucursal_id, marca, modelo_llanta, ancho, perfil, rin, indice_carga_velocidad, tipo_terreno, costo_adquisicion, precio_venta, stock_actual, stock_minimo)
    VALUES (v_cova_id, v_sucursal_id, 'Tornel', 'Real', 205, 55, 16, '91V', 'HT', 1150.00, 1590.00, 0, 0);
  END IF;

  -- 2. 185/65 R15 (Avanza, Tiida, Versa anterior, Yaris)
  IF NOT EXISTS (SELECT 1 FROM public.inventario_llantas_base WHERE empresa_id = v_cova_id AND ancho = 185 AND perfil = 65 AND rin = 15 AND marca = 'Bridgestone') THEN
    INSERT INTO public.inventario_llantas_base (empresa_id, sucursal_id, marca, modelo_llanta, ancho, perfil, rin, indice_carga_velocidad, tipo_terreno, costo_adquisicion, precio_venta, stock_actual, stock_minimo)
    VALUES (v_cova_id, v_sucursal_id, 'Bridgestone', 'Ecopia EP150', 185, 65, 15, '88H', 'HT', 1300.00, 1750.00, 0, 0);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.inventario_llantas_base WHERE empresa_id = v_cova_id AND ancho = 185 AND perfil = 65 AND rin = 15 AND marca = 'Goodyear') THEN
    INSERT INTO public.inventario_llantas_base (empresa_id, sucursal_id, marca, modelo_llanta, ancho, perfil, rin, indice_carga_velocidad, tipo_terreno, costo_adquisicion, precio_venta, stock_actual, stock_minimo)
    VALUES (v_cova_id, v_sucursal_id, 'Goodyear', 'Assurance MaxLife', 185, 65, 15, '88H', 'HT', 1250.00, 1690.00, 0, 0);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.inventario_llantas_base WHERE empresa_id = v_cova_id AND ancho = 185 AND perfil = 65 AND rin = 15 AND marca = 'Tornel') THEN
    INSERT INTO public.inventario_llantas_base (empresa_id, sucursal_id, marca, modelo_llanta, ancho, perfil, rin, indice_carga_velocidad, tipo_terreno, costo_adquisicion, precio_venta, stock_actual, stock_minimo)
    VALUES (v_cova_id, v_sucursal_id, 'Tornel', 'Classic', 185, 65, 15, '88T', 'HT', 950.00, 1350.00, 0, 0);
  END IF;

  -- 3. 195/65 R15 (Golf, Jetta A4, Corolla)
  IF NOT EXISTS (SELECT 1 FROM public.inventario_llantas_base WHERE empresa_id = v_cova_id AND ancho = 195 AND perfil = 65 AND rin = 15 AND marca = 'Michelin') THEN
    INSERT INTO public.inventario_llantas_base (empresa_id, sucursal_id, marca, modelo_llanta, ancho, perfil, rin, indice_carga_velocidad, tipo_terreno, costo_adquisicion, precio_venta, stock_actual, stock_minimo)
    VALUES (v_cova_id, v_sucursal_id, 'Michelin', 'Defender 2', 195, 65, 15, '91H', 'HT', 1700.00, 2290.00, 0, 0);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.inventario_llantas_base WHERE empresa_id = v_cova_id AND ancho = 195 AND perfil = 65 AND rin = 15 AND marca = 'Continental') THEN
    INSERT INTO public.inventario_llantas_base (empresa_id, sucursal_id, marca, modelo_llanta, ancho, perfil, rin, indice_carga_velocidad, tipo_terreno, costo_adquisicion, precio_venta, stock_actual, stock_minimo)
    VALUES (v_cova_id, v_sucursal_id, 'Continental', 'PowerContact 2', 195, 65, 15, '91H', 'HT', 1450.00, 1950.00, 0, 0);
  END IF;

  -- 4. 215/55 R17 (Altima, Camry, Accord)
  IF NOT EXISTS (SELECT 1 FROM public.inventario_llantas_base WHERE empresa_id = v_cova_id AND ancho = 215 AND perfil = 55 AND rin = 17 AND marca = 'Pirelli') THEN
    INSERT INTO public.inventario_llantas_base (empresa_id, sucursal_id, marca, modelo_llanta, ancho, perfil, rin, indice_carga_velocidad, tipo_terreno, costo_adquisicion, precio_venta, stock_actual, stock_minimo)
    VALUES (v_cova_id, v_sucursal_id, 'Pirelli', 'Cinturato P7', 215, 55, 17, '94W', 'HT', 2100.00, 2790.00, 0, 0);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.inventario_llantas_base WHERE empresa_id = v_cova_id AND ancho = 215 AND perfil = 55 AND rin = 17 AND marca = 'Bridgestone') THEN
    INSERT INTO public.inventario_llantas_base (empresa_id, sucursal_id, marca, modelo_llanta, ancho, perfil, rin, indice_carga_velocidad, tipo_terreno, costo_adquisicion, precio_venta, stock_actual, stock_minimo)
    VALUES (v_cova_id, v_sucursal_id, 'Bridgestone', 'Turanza T005', 215, 55, 17, '94V', 'HT', 2050.00, 2750.00, 0, 0);
  END IF;

  -- 5. 225/65 R17 (Crossover / SUV mediana: CR-V, RAV4, CX-5, Rogue, Tucson)
  IF NOT EXISTS (SELECT 1 FROM public.inventario_llantas_base WHERE empresa_id = v_cova_id AND ancho = 225 AND perfil = 65 AND rin = 17 AND marca = 'Michelin') THEN
    INSERT INTO public.inventario_llantas_base (empresa_id, sucursal_id, marca, modelo_llanta, ancho, perfil, rin, indice_carga_velocidad, tipo_terreno, costo_adquisicion, precio_venta, stock_actual, stock_minimo)
    VALUES (v_cova_id, v_sucursal_id, 'Michelin', 'Primacy SUV', 225, 65, 17, '102H', 'HT', 2400.00, 3190.00, 0, 0);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.inventario_llantas_base WHERE empresa_id = v_cova_id AND ancho = 225 AND perfil = 65 AND rin = 17 AND marca = 'Bridgestone') THEN
    INSERT INTO public.inventario_llantas_base (empresa_id, sucursal_id, marca, modelo_llanta, ancho, perfil, rin, indice_carga_velocidad, tipo_terreno, costo_adquisicion, precio_venta, stock_actual, stock_minimo)
    VALUES (v_cova_id, v_sucursal_id, 'Bridgestone', 'Alenza 001', 225, 65, 17, '102V', 'HT', 2250.00, 2990.00, 0, 0);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.inventario_llantas_base WHERE empresa_id = v_cova_id AND ancho = 225 AND perfil = 65 AND rin = 17 AND marca = 'Continental') THEN
    INSERT INTO public.inventario_llantas_base (empresa_id, sucursal_id, marca, modelo_llanta, ancho, perfil, rin, indice_carga_velocidad, tipo_terreno, costo_adquisicion, precio_venta, stock_actual, stock_minimo)
    VALUES (v_cova_id, v_sucursal_id, 'Continental', 'CrossContact LX2', 225, 65, 17, '102T', 'HT', 2150.00, 2890.00, 0, 0);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.inventario_llantas_base WHERE empresa_id = v_cova_id AND ancho = 225 AND perfil = 65 AND rin = 17 AND marca = 'Goodyear') THEN
    INSERT INTO public.inventario_llantas_base (empresa_id, sucursal_id, marca, modelo_llanta, ancho, perfil, rin, indice_carga_velocidad, tipo_terreno, costo_adquisicion, precio_venta, stock_actual, stock_minimo)
    VALUES (v_cova_id, v_sucursal_id, 'Goodyear', 'Wrangler Fortitude HT', 225, 65, 17, '102T', 'HT', 2100.00, 2800.00, 0, 0);
  END IF;

  -- 6. 265/70 R17 (Pickups y SUVs grandes: Tacoma, Lobo, Silverado, Ram, Cheyenne)
  IF NOT EXISTS (SELECT 1 FROM public.inventario_llantas_base WHERE empresa_id = v_cova_id AND ancho = 265 AND perfil = 70 AND rin = 17 AND marca = 'BFGoodrich') THEN
    INSERT INTO public.inventario_llantas_base (empresa_id, sucursal_id, marca, modelo_llanta, ancho, perfil, rin, indice_carga_velocidad, tipo_terreno, costo_adquisicion, precio_venta, stock_actual, stock_minimo)
    VALUES (v_cova_id, v_sucursal_id, 'BFGoodrich', 'All-Terrain T/A KO2', 265, 70, 17, '121/118S', 'AT', 3900.00, 5190.00, 0, 0);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.inventario_llantas_base WHERE empresa_id = v_cova_id AND ancho = 265 AND perfil = 70 AND rin = 17 AND marca = 'Bridgestone') THEN
    INSERT INTO public.inventario_llantas_base (empresa_id, sucursal_id, marca, modelo_llanta, ancho, perfil, rin, indice_carga_velocidad, tipo_terreno, costo_adquisicion, precio_venta, stock_actual, stock_minimo)
    VALUES (v_cova_id, v_sucursal_id, 'Bridgestone', 'Dueler A/T Revo 3', 265, 70, 17, '115T', 'AT', 3100.00, 4150.00, 0, 0);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.inventario_llantas_base WHERE empresa_id = v_cova_id AND ancho = 265 AND perfil = 70 AND rin = 17 AND marca = 'Hankook') THEN
    INSERT INTO public.inventario_llantas_base (empresa_id, sucursal_id, marca, modelo_llanta, ancho, perfil, rin, indice_carga_velocidad, tipo_terreno, costo_adquisicion, precio_venta, stock_actual, stock_minimo)
    VALUES (v_cova_id, v_sucursal_id, 'Hankook', 'Dynapro AT2', 265, 70, 17, '115T', 'AT', 2800.00, 3750.00, 0, 0);
  END IF;

  -- 7. 235/60 R18 (Santa Fe, Sorento, Edge, Explorer)
  IF NOT EXISTS (SELECT 1 FROM public.inventario_llantas_base WHERE empresa_id = v_cova_id AND ancho = 235 AND perfil = 60 AND rin = 18 AND marca = 'Michelin') THEN
    INSERT INTO public.inventario_llantas_base (empresa_id, sucursal_id, marca, modelo_llanta, ancho, perfil, rin, indice_carga_velocidad, tipo_terreno, costo_adquisicion, precio_venta, stock_actual, stock_minimo)
    VALUES (v_cova_id, v_sucursal_id, 'Michelin', 'Latitude Sport 3', 235, 60, 18, '103W', 'HT', 2950.00, 3950.00, 0, 0);
  END IF;

  -- 8. 245/70 R16 (Ranger, Hilux, Frontier)
  IF NOT EXISTS (SELECT 1 FROM public.inventario_llantas_base WHERE empresa_id = v_cova_id AND ancho = 245 AND perfil = 70 AND rin = 16 AND marca = 'Bridgestone') THEN
    INSERT INTO public.inventario_llantas_base (empresa_id, sucursal_id, marca, modelo_llanta, ancho, perfil, rin, indice_carga_velocidad, tipo_terreno, costo_adquisicion, precio_venta, stock_actual, stock_minimo)
    VALUES (v_cova_id, v_sucursal_id, 'Bridgestone', 'Dueler D684', 245, 70, 16, '111T', 'HT', 2600.00, 3490.00, 0, 0);
  END IF;

  -- 9. 175/70 R14 (Aveo, Spark, March, Beat)
  IF NOT EXISTS (SELECT 1 FROM public.inventario_llantas_base WHERE empresa_id = v_cova_id AND ancho = 175 AND perfil = 70 AND rin = 14 AND marca = 'Tornel') THEN
    INSERT INTO public.inventario_llantas_base (empresa_id, sucursal_id, marca, modelo_llanta, ancho, perfil, rin, indice_carga_velocidad, tipo_terreno, costo_adquisicion, precio_venta, stock_actual, stock_minimo)
    VALUES (v_cova_id, v_sucursal_id, 'Tornel', 'Real', 175, 70, 14, '84T', 'HT', 850.00, 1190.00, 0, 0);
  END IF;

  -- 10. 275/55 R20 (Cheyenne, Tahoe, F-150, Suburban, Ram Limited)
  IF NOT EXISTS (SELECT 1 FROM public.inventario_llantas_base WHERE empresa_id = v_cova_id AND ancho = 275 AND perfil = 55 AND rin = 20 AND marca = 'Michelin') THEN
    INSERT INTO public.inventario_llantas_base (empresa_id, sucursal_id, marca, modelo_llanta, ancho, perfil, rin, indice_carga_velocidad, tipo_terreno, costo_adquisicion, precio_venta, stock_actual, stock_minimo)
    VALUES (v_cova_id, v_sucursal_id, 'Michelin', 'Defender LTX M/S', 275, 55, 20, '113T', 'HT', 4200.00, 5600.00, 0, 0);
  END IF;

END $$;
