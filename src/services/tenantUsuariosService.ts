import { supabase } from "@/lib/supabase";

export interface TenantUsuario {
  id: string;
  empresa_id: string;
  sucursal_id: string | null;
  nombre: string;
  email: string;
  rol: "Administrador" | "Cajero" | "Vendedor" | "Mecánico";
  telefono: string | null;
  activo: boolean;
  created_at: string;
  last_sign_in_at: string | null;
}

export interface CrearUsuarioParams {
  empresaId: string;
  sucursalId?: string | null;
  nombre: string;
  email: string;
  password: string;
  rol: "Administrador" | "Cajero" | "Vendedor" | "Mecánico";
  puesto?: string;
  telefono?: string;
}

export const TenantUsuariosService = {
  /**
   * Obtiene los usuarios del tenant excluyendo estrictamente cuentas SuperAdmin
   */
  async obtenerUsuariosTenant(empresaId: string): Promise<{ data: TenantUsuario[]; error: string | null }> {
    try {
      const { data, error } = await (supabase.rpc as any)("fn_obtener_usuarios_tenant", {
        p_empresa_id: empresaId,
      });

      if (error) throw error;
      return { data: (data as TenantUsuario[]) || [], error: null };
    } catch (err: any) {
      console.error("Error al obtener usuarios de la empresa:", err);
      return { data: [], error: err.message || "Error al consultar usuarios" };
    }
  },

  /**
   * Crea un usuario con acceso de login (auth.users + perfiles + empleados)
   * Prohíbe la creación de roles SuperAdmin
   */
  async crearUsuarioTenant(
    params: CrearUsuarioParams
  ): Promise<{ success: boolean; userId?: string; error?: string; message?: string }> {
    try {
      if (params.rol.toLowerCase().includes("superadmin")) {
        return {
          success: false,
          error: "UNAUTHORIZED_ROLE",
          message: "Los inquilinos no pueden crear cuentas con rol SuperAdmin.",
        };
      }

      if (!params.nombre?.trim() || !params.email?.trim() || !params.password?.trim()) {
        return {
          success: false,
          error: "VALIDATION_ERROR",
          message: "Nombre, correo y contraseña son obligatorios.",
        };
      }

      if (params.password.length < 6) {
        return {
          success: false,
          error: "VALIDATION_ERROR",
          message: "La contraseña debe tener al menos 6 caracteres.",
        };
      }

      const { data, error } = await (supabase.rpc as any)("fn_crear_usuario_tenant", {
        p_empresa_id: params.empresaId,
        p_sucursal_id: params.sucursalId || null,
        p_nombre: params.nombre.trim(),
        p_email: params.email.trim().toLowerCase(),
        p_password: params.password,
        p_rol: params.rol,
        p_puesto: params.puesto?.trim() || null,
        p_telefono: params.telefono?.trim() || null,
      });

      if (error) throw error;
      return data;
    } catch (err: any) {
      console.error("Error al registrar nuevo usuario:", err);
      return {
        success: false,
        error: "CREATION_FAILED",
        message: err.message || "No se pudo crear el usuario.",
      };
    }
  },

  /**
   * Activa o revoca el acceso de login de un usuario
   */
  async actualizarEstatusUsuario(
    userId: string,
    activo: boolean
  ): Promise<{ success: boolean; error?: string; message?: string }> {
    try {
      const { data, error } = await (supabase.rpc as any)("fn_actualizar_estatus_usuario_tenant", {
        p_user_id: userId,
        p_activo: activo,
      });

      if (error) throw error;
      return data;
    } catch (err: any) {
      console.error("Error al actualizar estatus de usuario:", err);
      return {
        success: false,
        error: "UPDATE_STATUS_FAILED",
        message: err.message || "Error al actualizar estatus.",
      };
    }
  },

  /**
   * Resetea la contraseña de un usuario del tenant
   */
  async resetPasswordUsuario(
    userId: string,
    newPassword: string
  ): Promise<{ success: boolean; error?: string; message?: string }> {
    try {
      const { data, error } = await (supabase.rpc as any)("fn_reset_password_usuario_tenant", {
        p_user_id: userId,
        p_new_password: newPassword,
      });

      if (error) throw error;
      return data;
    } catch (err: any) {
      console.error("Error al resetear contraseña:", err);
      return {
        success: false,
        error: "RESET_PASSWORD_FAILED",
        message: err.message || "Error al resetear contraseña.",
      };
    }
  },
};
