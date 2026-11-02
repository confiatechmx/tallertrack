-- Migration: cova_realtime_multicomputer_sync
-- Publicación de tablas de caja y POS en supabase_realtime con Replica Identity Full
-- Permite sincronización instantánea entre Mostrador 1 y Mostrador 2 sin recargar navegador

DO $$
BEGIN
    -- 1. Configurar Replica Identity Full para que los updates/deletes transmitan toda la fila por WebSockets
    ALTER TABLE public.caja_turnos REPLICA IDENTITY FULL;
    ALTER TABLE public.caja_fondos REPLICA IDENTITY FULL;
    ALTER TABLE public.pagos_orden REPLICA IDENTITY FULL;
    ALTER TABLE public.caja_movimientos REPLICA IDENTITY FULL;
    ALTER TABLE public.caja_traspasos_fondos REPLICA IDENTITY FULL;
    ALTER TABLE public.ordenes_servicio REPLICA IDENTITY FULL;

    -- 2. Agregar tablas a la publicación supabase_realtime si no están ya agregadas
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND tablename = 'caja_turnos'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.caja_turnos;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND tablename = 'caja_fondos'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.caja_fondos;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND tablename = 'pagos_orden'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.pagos_orden;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND tablename = 'caja_movimientos'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.caja_movimientos;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND tablename = 'caja_traspasos_fondos'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.caja_traspasos_fondos;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND tablename = 'ordenes_servicio'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.ordenes_servicio;
    END IF;
END $$;
