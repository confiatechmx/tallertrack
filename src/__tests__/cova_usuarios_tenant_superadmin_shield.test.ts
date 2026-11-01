import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock supabase client before importing service
const mockRpc = vi.fn();
vi.mock("@/lib/supabase", () => ({
  supabase: {
    rpc: (...args: any[]) => mockRpc(...args),
    from: vi.fn(),
  },
}));

import { TenantUsuariosService } from "../services/tenantUsuariosService";

describe("Punto G: Autogestión de Usuarios de Tenant y Blindaje SuperAdmin", () => {
  beforeEach(() => {
    mockRpc.mockReset();
  });

  const tenantCovaId = "b2ad09db-0a34-4876-9ca3-d584c40bd294";
  const sucursalCovaId = "b2ad09db-0a34-4876-9ca3-d584c40bd295";

  it("rechaza categóricamente la creación de usuarios con rol SuperAdmin desde el panel del tenant", async () => {
    const res1 = await TenantUsuariosService.crearUsuarioTenant({
      empresaId: tenantCovaId,
      sucursalId: sucursalCovaId,
      nombre: "Intruso Super",
      email: "hacker@example.com",
      password: "Password123!",
      rol: "SuperAdmin" as any,
    });
    expect(res1.success).toBe(false);
    expect(res1.error).toBe("UNAUTHORIZED_ROLE");
    expect(res1.message).toContain("SuperAdmin");

    const res2 = await TenantUsuariosService.crearUsuarioTenant({
      empresaId: tenantCovaId,
      sucursalId: sucursalCovaId,
      nombre: "Intruso Super Lowercase",
      email: "hacker2@example.com",
      password: "Password123!",
      rol: "superadmin" as any,
    });
    expect(res2.success).toBe(false);
    expect(res2.error).toBe("UNAUTHORIZED_ROLE");
    expect(res2.message).toContain("SuperAdmin");

    expect(mockRpc).not.toHaveBeenCalled();
  });

  it("valida campos obligatorios (nombre, email, password) antes de llamar al backend", async () => {
    const res1 = await TenantUsuariosService.crearUsuarioTenant({
      empresaId: tenantCovaId,
      sucursalId: sucursalCovaId,
      nombre: "",
      email: "cajero@covatires.com",
      password: "Password123!",
      rol: "Cajero",
    });
    expect(res1.success).toBe(false);
    expect(res1.error).toBe("VALIDATION_ERROR");
    expect(res1.message).toBe("Nombre, correo y contraseña son obligatorios.");

    const res2 = await TenantUsuariosService.crearUsuarioTenant({
      empresaId: tenantCovaId,
      sucursalId: sucursalCovaId,
      nombre: "Cajero Test",
      email: "cajero@covatires.com",
      password: "123",
      rol: "Cajero",
    });
    expect(res2.success).toBe(false);
    expect(res2.error).toBe("VALIDATION_ERROR");
    expect(res2.message).toBe("La contraseña debe tener al menos 6 caracteres.");

    expect(mockRpc).not.toHaveBeenCalled();
  });

  it("permite la creación de roles operativos legítimos (Cajero, Administrador, Vendedor, Mecánico)", async () => {
    mockRpc.mockResolvedValueOnce({
      data: { success: true, userId: "user-12345" },
      error: null,
    });

    const result = await TenantUsuariosService.crearUsuarioTenant({
      empresaId: tenantCovaId,
      sucursalId: sucursalCovaId,
      nombre: "Ana Cajera",
      email: "ana.caja@covatires.com",
      password: "CovaSegura2026!",
      rol: "Cajero",
      telefono: "6621112233",
      puesto: "Cajera Principal",
    });

    expect(mockRpc).toHaveBeenCalledWith("fn_crear_usuario_tenant", {
      p_empresa_id: tenantCovaId,
      p_sucursal_id: sucursalCovaId,
      p_nombre: "Ana Cajera",
      p_email: "ana.caja@covatires.com",
      p_password: "CovaSegura2026!",
      p_rol: "Cajero",
      p_telefono: "6621112233",
      p_puesto: "Cajera Principal",
    });

    expect(result.success).toBe(true);
    expect(result.userId).toBe("user-12345");
  });

  it("impide suspender o cambiar el estatus a un SuperAdmin desde el tenant", async () => {
    mockRpc.mockResolvedValueOnce({
      data: null,
      error: { message: "UNAUTHORIZED_TARGET: No se permite modificar SuperAdmin" },
    });

    const res = await TenantUsuariosService.actualizarEstatusUsuario("superadmin-id", false);

    expect(res.success).toBe(false);
    expect(res.error).toBe("UPDATE_STATUS_FAILED");
    expect(res.message).toContain("UNAUTHORIZED_TARGET");
  });

  it("impide restablecer la contraseña de un SuperAdmin desde el tenant", async () => {
    mockRpc.mockResolvedValueOnce({
      data: null,
      error: { message: "UNAUTHORIZED_TARGET: No se permite alterar contraseñas de SuperAdmin" },
    });

    const res = await TenantUsuariosService.resetPasswordUsuario("superadmin-id", "NuevaClave123!");

    expect(res.success).toBe(false);
    expect(res.error).toBe("RESET_PASSWORD_FAILED");
    expect(res.message).toContain("UNAUTHORIZED_TARGET");
  });

  it("garantiza que obtenerUsuariosTenant invoca la función RPC de blindaje sin incluir SuperAdmins", async () => {
    mockRpc.mockResolvedValueOnce({
      data: [
        {
          id: "u1",
          empresa_id: tenantCovaId,
          nombre: "Larissa Orozco",
          email: "larissa@covatires.com",
          rol: "Administrador",
          activo: true,
        },
        {
          id: "u2",
          empresa_id: tenantCovaId,
          nombre: "Hugo Beltrán",
          email: "hugo@covatires.com",
          rol: "Cajero",
          activo: true,
        },
      ],
      error: null,
    });

    const { data: usuarios, error } = await TenantUsuariosService.obtenerUsuariosTenant(tenantCovaId);

    expect(error).toBeNull();
    expect(mockRpc).toHaveBeenCalledWith("fn_obtener_usuarios_tenant", {
      p_empresa_id: tenantCovaId,
    });
    expect(usuarios.length).toBe(2);
    expect(usuarios.every((u) => !u.rol.toLowerCase().includes("superadmin"))).toBe(true);
  });
});
