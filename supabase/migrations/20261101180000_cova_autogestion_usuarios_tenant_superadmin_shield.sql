-- ==============================================================================
-- MIGRACIÓN: AUTOGESTIÓN DE USUARIOS Y CAJEROS CON BLINDAJE DE SUPERADMIN
-- Fecha: 2026-11-01
-- ==============================================================================

-- 1. FUNCIÓN PARA CREAR USUARIO DE TENANT CON ACCESO A LOGIN
CREATE OR REPLACE FUNCTION public.fn_crear_usuario_tenant(
    p_empresa_id UUID,
    p_sucursal_id UUID,
    p_nombre TEXT,
    p_email TEXT,
    p_password TEXT,
    p_rol TEXT,
    p_puesto TEXT DEFAULT NULL,
    p_telefono TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, extensions
AS $$
DECLARE
    v_user_id UUID := gen_random_uuid();
    v_clean_email TEXT;
    v_clean_nombre TEXT;
    v_clean_rol TEXT;
    v_encrypted_pw TEXT;
    v_puesto TEXT;
BEGIN
    v_clean_email := lower(trim(p_email));
    v_clean_nombre := trim(p_nombre);
    v_clean_rol := trim(p_rol);
    v_puesto := COALESCE(trim(p_puesto), v_clean_rol);

    -- A. Validaciones de Seguridad
    IF v_clean_rol ILIKE '%superadmin%' THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'UNAUTHORIZED_ROLE',
            'message', 'Los inquilinos no tienen permisos para crear ni administrar cuentas SuperAdmin.'
        );
    END IF;

    IF v_clean_rol NOT IN ('Administrador', 'Cajero', 'Vendedor', 'Mecánico') THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'INVALID_ROLE',
            'message', 'El rol especificado no es válido. Roles permitidos: Administrador, Cajero, Vendedor, Mecánico.'
        );
    END IF;

    IF length(p_password) < 6 THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'WEAK_PASSWORD',
            'message', 'La contraseña debe tener al menos 6 caracteres.'
        );
    END IF;

    IF EXISTS (SELECT 1 FROM auth.users WHERE lower(email) = v_clean_email) THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'EMAIL_ALREADY_EXISTS',
            'message', 'Ya existe una cuenta registrada con este correo electrónico.'
        );
    END IF;

    -- B. Hashear contraseña con bcrypt
    v_encrypted_pw := crypt(p_password, gen_salt('bf'));

    -- C. Insertar en auth.users (sin confirmed_at ya que es columna GENERATED ALWAYS en Supabase)
    INSERT INTO auth.users (
        instance_id,
        id,
        aud,
        role,
        email,
        encrypted_password,
        email_confirmed_at,
        raw_app_meta_data,
        raw_user_meta_data,
        is_super_admin,
        is_sso_user,
        is_anonymous,
        created_at,
        updated_at
    ) VALUES (
        '00000000-0000-0000-0000-000000000000',
        v_user_id,
        'authenticated',
        'authenticated',
        v_clean_email,
        v_encrypted_pw,
        now(),
        '{"provider": "email", "providers": ["email"]}'::jsonb,
        jsonb_build_object(
            'nombre', v_clean_nombre,
            'full_name', v_clean_nombre,
            'rol', v_clean_rol,
            'empresa_id', p_empresa_id
        ),
        false,
        false,
        false,
        now(),
        now()
    );

    -- D. Insertar en auth.identities
    INSERT INTO auth.identities (
        id,
        user_id,
        provider_id,
        identity_data,
        provider,
        last_sign_in_at,
        created_at,
        updated_at,
        email
    ) VALUES (
        gen_random_uuid(),
        v_user_id,
        v_user_id::text,
        jsonb_build_object(
            'sub', v_user_id::text,
            'email', v_clean_email,
            'email_verified', true
        ),
        'email',
        NULL,
        now(),
        now(),
        v_clean_email
    );

    -- E. Insertar en public.perfiles
    INSERT INTO public.perfiles (
        id,
        empresa_id,
        sucursal_id,
        nombre,
        rol,
        telefono,
        created_at
    ) VALUES (
        v_user_id,
        p_empresa_id,
        p_sucursal_id,
        v_clean_nombre,
        v_clean_rol,
        p_telefono,
        now()
    )
    ON CONFLICT (id) DO UPDATE SET
        empresa_id = p_empresa_id,
        sucursal_id = p_sucursal_id,
        nombre = v_clean_nombre,
        rol = v_clean_rol,
        telefono = p_telefono;

    -- F. Vincular a la tabla public.empleados para nómina/comisiones si aplica
    INSERT INTO public.empleados (
        empresa_id,
        sucursal_id,
        nombre,
        rol,
        puesto,
        telefono,
        activo,
        comision_porcentaje,
        tarifa_hora
    ) VALUES (
        p_empresa_id,
        p_sucursal_id,
        v_clean_nombre,
        v_clean_rol,
        v_puesto,
        p_telefono,
        true,
        CASE WHEN v_clean_rol = 'Mecánico' THEN 25.0 ELSE 0.0 END,
        CASE WHEN v_clean_rol = 'Mecánico' THEN 450.0 ELSE 0.0 END
    )
    ON CONFLICT DO NOTHING;

    RETURN jsonb_build_object(
        'success', true,
        'user_id', v_user_id,
        'email', v_clean_email,
        'nombre', v_clean_nombre,
        'rol', v_clean_rol,
        'message', 'Usuario con acceso creado exitosamente.'
    );
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object(
        'success', false,
        'error', SQLSTATE,
        'message', SQLERRM
    );
END;
$$;

-- 2. FUNCIÓN PARA ACTUALIZAR ESTATUS (ACTIVAR / DESACTIVAR) PROTEGIENDO AL SUPERADMIN
CREATE OR REPLACE FUNCTION public.fn_actualizar_estatus_usuario_tenant(
    p_user_id UUID,
    p_activo BOOLEAN
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, extensions
AS $$
DECLARE
    v_rol TEXT;
    v_nombre TEXT;
BEGIN
    SELECT rol, nombre INTO v_rol, v_nombre FROM public.perfiles WHERE id = p_user_id;

    IF v_rol IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'USER_NOT_FOUND', 'message', 'El usuario no existe.');
    END IF;

    -- Blindaje Absoluto: Prohibido modificar SuperAdmin desde un tenant
    IF v_rol ILIKE '%superadmin%' THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'UNAUTHORIZED_TARGET',
            'message', 'Acceso denegado: El usuario tiene rol SuperAdmin y está protegido de modificaciones por inquilinos.'
        );
    END IF;

    -- Bloqueo o desbloqueo en auth.users
    IF p_activo = false THEN
        UPDATE auth.users 
        SET banned_until = '2099-01-01 00:00:00+00'::timestamptz,
            updated_at = now()
        WHERE id = p_user_id;
    ELSE
        UPDATE auth.users 
        SET banned_until = NULL,
            updated_at = now()
        WHERE id = p_user_id;
    END IF;

    -- Actualizar estatus en empleados asociados por nombre si existen
    UPDATE public.empleados 
    SET activo = p_activo, updated_at = now() 
    WHERE nombre = v_nombre;

    RETURN jsonb_build_object(
        'success', true,
        'user_id', p_user_id,
        'activo', p_activo,
        'message', CASE WHEN p_activo THEN 'Usuario activado.' ELSE 'Acceso de usuario revocado.' END
    );
END;
$$;

-- 3. FUNCIÓN PARA RESETEAR CONTRASEÑA PROTEGIENDO AL SUPERADMIN
CREATE OR REPLACE FUNCTION public.fn_reset_password_usuario_tenant(
    p_user_id UUID,
    p_new_password TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, extensions
AS $$
DECLARE
    v_rol TEXT;
BEGIN
    SELECT rol INTO v_rol FROM public.perfiles WHERE id = p_user_id;

    IF v_rol IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'USER_NOT_FOUND', 'message', 'El usuario no existe.');
    END IF;

    IF v_rol ILIKE '%superadmin%' THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'UNAUTHORIZED_TARGET',
            'message', 'Acceso denegado: La contraseña del SuperAdmin solo puede cambiarse desde la consola HQ.'
        );
    END IF;

    IF length(p_new_password) < 6 THEN
        RETURN jsonb_build_object('success', false, 'error', 'WEAK_PASSWORD', 'message', 'La nueva contraseña debe tener al menos 6 caracteres.');
    END IF;

    UPDATE auth.users 
    SET encrypted_password = crypt(p_new_password, gen_salt('bf')),
        updated_at = now()
    WHERE id = p_user_id;

    RETURN jsonb_build_object('success', true, 'message', 'Contraseña actualizada exitosamente.');
END;
$$;

-- 4. FUNCIÓN PARA CONSULTAR USUARIOS DEL TENANT EXCLUYENDO AL SUPERADMIN
CREATE OR REPLACE FUNCTION public.fn_obtener_usuarios_tenant(p_empresa_id UUID)
RETURNS TABLE (
    id UUID,
    empresa_id UUID,
    sucursal_id UUID,
    nombre TEXT,
    email TEXT,
    rol TEXT,
    telefono TEXT,
    activo BOOLEAN,
    created_at TIMESTAMPTZ,
    last_sign_in_at TIMESTAMPTZ
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, auth
AS $$
    SELECT 
        p.id,
        p.empresa_id,
        p.sucursal_id,
        p.nombre,
        u.email::TEXT,
        p.rol,
        p.telefono,
        (u.banned_until IS NULL OR u.banned_until < now()) AS activo,
        p.created_at,
        u.last_sign_in_at
    FROM public.perfiles p
    JOIN auth.users u ON u.id = p.id
    WHERE p.empresa_id = p_empresa_id
      AND p.rol NOT ILIKE '%superadmin%'
    ORDER BY p.nombre ASC;
$$;
