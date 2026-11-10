-- ==============================================================================
-- Migración de corrección para fn_crear_usuario_tenant y empleados_rol_check
-- Motivos:
-- 1. 'confirmed_at' en auth.users es una columna GENERATED ALWAYS en PostgreSQL/Supabase.
-- 2. 'email' en auth.identities es una columna GENERATED ALWAYS a partir de identity_data.
-- 3. 'empleados_rol_check' en public.empleados debe permitir 'Cajero' y roles válidos del taller.
-- ==============================================================================

-- 1. Actualizar check constraint de empleados
ALTER TABLE public.empleados DROP CONSTRAINT IF EXISTS empleados_rol_check;
ALTER TABLE public.empleados ADD CONSTRAINT empleados_rol_check 
  CHECK (rol = ANY (ARRAY['Administrador'::text, 'Cajero'::text, 'Vendedor'::text, 'Mecánico'::text, 'Asesor'::text, 'SuperAdmin'::text]));

-- 2. Actualizar función RPC fn_crear_usuario_tenant
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

    -- C. Insertar en auth.users (sin confirmed_at ya que es GENERATED ALWAYS)
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

    -- D. Insertar en auth.identities (sin email ya que es GENERATED ALWAYS a partir de identity_data)
    INSERT INTO auth.identities (
        id,
        user_id,
        provider_id,
        identity_data,
        provider,
        last_sign_in_at,
        created_at,
        updated_at
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
        now()
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
