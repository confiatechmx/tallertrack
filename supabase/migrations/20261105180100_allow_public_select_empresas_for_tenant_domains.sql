-- Permitir lectura de datos de empresa (branding/subdominio) para resolución de dominios en /login y portal público /orden/[id]
-- Las operaciones de escritura (INSERT/UPDATE/DELETE) permanecen estrictamente restringidas al tenant o SuperAdmin
ALTER POLICY "Usuarios pueden ver su empresa"
ON public.empresas
USING (true);
