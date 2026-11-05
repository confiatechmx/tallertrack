import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { parseTenantFromHost, getTenantCookieDomain } from '../lib/tenantRouting'
import { getTenantRedirectAfterLogin } from '../lib/tenantServer'
import { updateSession } from '../lib/supabase/middleware'

// Mock next/headers
vi.mock('next/headers', () => ({
  headers: vi.fn(async () => new Map([['host', 'tallertrack.com']])),
  cookies: vi.fn(async () => ({
    getAll: () => [],
    set: () => {},
  })),
}))

// Mock Supabase Server Client
const mockSupabase = {
  from: vi.fn(),
  auth: {
    getUser: vi.fn(),
    signOut: vi.fn(),
  },
}

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(async () => mockSupabase),
}))

vi.mock('@supabase/ssr', () => ({
  createServerClient: vi.fn(() => mockSupabase),
}))

describe('Tenant Subdomain & Domain Routing Engine', () => {
  describe('parseTenantFromHost', () => {
    it('detects platform root and app domains correctly', () => {
      expect(parseTenantFromHost('tallertrack.com').isTenantHost).toBe(false)
      expect(parseTenantFromHost('www.tallertrack.com').isTenantHost).toBe(false)
      expect(parseTenantFromHost('app.tallertrack.com').isTenantHost).toBe(false)
      expect(parseTenantFromHost('localhost:3000').isTenantHost).toBe(false)
      expect(parseTenantFromHost('127.0.0.1:3000').isTenantHost).toBe(false)
    })

    it('identifies tenant subdomains like cova.tallertrack.com', () => {
      const res = parseTenantFromHost('cova.tallertrack.com')
      expect(res.isTenantHost).toBe(true)
      expect(res.subdomain).toBe('cova')
      expect(res.fullDomain).toBe('cova.tallertrack.com')
      expect(res.isCustomDomain).toBeFalsy()
    })

    it('identifies localhost subdomains for local dev (cova.localhost:3000)', () => {
      const res = parseTenantFromHost('cova.localhost:3000')
      expect(res.isTenantHost).toBe(true)
      expect(res.subdomain).toBe('cova')
      expect(res.fullDomain).toBe('cova.tallertrack.com')
    })

    it('handles test_domain query parameter in local dev', () => {
      const searchParams = new URLSearchParams('test_domain=cova.tallertrack.com')
      const res = parseTenantFromHost('localhost:3000', searchParams)
      expect(res.isTenantHost).toBe(true)
      expect(res.subdomain).toBe('cova')
      expect(res.fullDomain).toBe('cova.tallertrack.com')
    })

    it('handles custom domains (e.g. tallerescova.com)', () => {
      const res = parseTenantFromHost('tallerescova.com')
      expect(res.isTenantHost).toBe(true)
      expect(res.subdomain).toBeNull()
      expect(res.fullDomain).toBe('tallerescova.com')
      expect(res.isCustomDomain).toBe(true)
    })
  })

  describe('getTenantCookieDomain', () => {
    it('returns .tallertrack.com for any tallertrack host to allow cross-subdomain SSO', () => {
      expect(getTenantCookieDomain('tallertrack.com')).toBe('.tallertrack.com')
      expect(getTenantCookieDomain('cova.tallertrack.com')).toBe('.tallertrack.com')
      expect(getTenantCookieDomain('torqueyruta.tallertrack.com:443')).toBe('.tallertrack.com')
    })

    it('returns undefined for localhost and custom domains to preserve host isolation', () => {
      expect(getTenantCookieDomain('localhost:3000')).toBeUndefined()
      expect(getTenantCookieDomain('tallerescova.com')).toBeUndefined()
    })
  })

  describe('getTenantRedirectAfterLogin', () => {
    beforeEach(() => {
      vi.clearAllMocks()
    })

    it('redirects user from central tallertrack.com to their dedicated subdomain https://cova.tallertrack.com/tablero', async () => {
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'perfiles') {
          return {
            select: () => ({
              eq: () => ({
                maybeSingle: async () => ({
                  data: { empresa_id: 'b2ad09db-0a34-4876-9ca3-d584c40bd294' },
                }),
              }),
            }),
          }
        }
        if (table === 'tenant_domains') {
          return {
            select: () => ({
              eq: () => ({
                eq: () => ({
                  order: () => ({
                    limit: () => ({
                      maybeSingle: async () => ({
                        data: { domain: 'cova.tallertrack.com' },
                      }),
                    }),
                  }),
                }),
              }),
            }),
          }
        }
        return { select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: null }) }) }) }
      })

      const redirectUrl = await getTenantRedirectAfterLogin('user-123', 'tallertrack.com')
      expect(redirectUrl).toBe('https://cova.tallertrack.com/tablero')
    })

    it('keeps user on /tablero if already logging in from their dedicated subdomain cova.tallertrack.com', async () => {
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'perfiles') {
          return {
            select: () => ({
              eq: () => ({
                maybeSingle: async () => ({
                  data: { empresa_id: 'b2ad09db-0a34-4876-9ca3-d584c40bd294' },
                }),
              }),
            }),
          }
        }
        if (table === 'tenant_domains') {
          return {
            select: () => ({
              eq: () => ({
                eq: () => ({
                  order: () => ({
                    limit: () => ({
                      maybeSingle: async () => ({
                        data: { domain: 'cova.tallertrack.com' },
                      }),
                    }),
                  }),
                }),
              }),
            }),
          }
        }
        return { select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: null }) }) }) }
      })

      const redirectUrl = await getTenantRedirectAfterLogin('user-123', 'cova.tallertrack.com')
      expect(redirectUrl).toBe('/tablero')
    })

    it('in localhost, redirects to /tablero?test_domain=cova.tallertrack.com to maintain local session', async () => {
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'perfiles') {
          return {
            select: () => ({
              eq: () => ({
                maybeSingle: async () => ({
                  data: { empresa_id: 'b2ad09db-0a34-4876-9ca3-d584c40bd294' },
                }),
              }),
            }),
          }
        }
        if (table === 'tenant_domains') {
          return {
            select: () => ({
              eq: () => ({
                eq: () => ({
                  order: () => ({
                    limit: () => ({
                      maybeSingle: async () => ({
                        data: { domain: 'cova.tallertrack.com' },
                      }),
                    }),
                  }),
                }),
              }),
            }),
          }
        }
        return { select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: null }) }) }) }
      })

      const redirectUrl = await getTenantRedirectAfterLogin('user-123', 'localhost:3000')
      expect(redirectUrl).toBe('/tablero?test_domain=cova.tallertrack.com')
    })
  })

  describe('Zero-Trust Cross-Tenant Session Isolation in Middleware', () => {
    beforeEach(() => {
      vi.clearAllMocks()
    })

    it('revokes session and redirects to /login when a Demo user (Torque & Ruta) visits cova.tallertrack.com', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'd0000000-0000-0000-0000-000000000001' } },
      })
      mockSupabase.auth.signOut.mockResolvedValue({ error: null })

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'tenant_domains') {
          return {
            select: () => ({
              eq: () => ({
                eq: () => ({
                  maybeSingle: async () => ({
                    data: { empresa_id: 'b2ad09db-0a34-4876-9ca3-d584c40bd294' }, // Cova
                  }),
                }),
              }),
            }),
          }
        }
        if (table === 'perfiles') {
          return {
            select: () => ({
              eq: () => ({
                maybeSingle: async () => ({
                  data: {
                    empresa_id: 'a0000000-0000-0000-0000-000000000001', // Demo (Torque & Ruta)
                    rol: 'Administrador',
                  },
                }),
              }),
            }),
          }
        }
        return { select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: null }) }) }) }
      })

      const req = new NextRequest('https://cova.tallertrack.com/clientes', {
        headers: { host: 'cova.tallertrack.com' },
      })

      const res = await updateSession(req)
      expect(mockSupabase.auth.signOut).toHaveBeenCalledTimes(1)
      expect(res.status).toBe(307)
      expect(res.headers.get('location')).toBe('https://cova.tallertrack.com/login')
    })

    it('allows SuperAdmin to access any tenant subdomain without signing out', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: '6864a8d9-88de-4d5c-ba65-df6a5d7b6137' } },
      })

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'tenant_domains') {
          return {
            select: () => ({
              eq: () => ({
                eq: () => ({
                  maybeSingle: async () => ({
                    data: { empresa_id: 'a0000000-0000-0000-0000-000000000001' },
                  }),
                }),
              }),
            }),
          }
        }
        if (table === 'perfiles') {
          return {
            select: () => ({
              eq: () => ({
                maybeSingle: async () => ({
                  data: {
                    empresa_id: 'b2ad09db-0a34-4876-9ca3-d584c40bd294',
                    rol: 'SuperAdmin',
                  },
                }),
              }),
            }),
          }
        }
        return { select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: null }) }) }) }
      })

      const req = new NextRequest('https://torqueyruta.tallertrack.com/clientes', {
        headers: { host: 'torqueyruta.tallertrack.com' },
      })

      const res = await updateSession(req)
      expect(mockSupabase.auth.signOut).not.toHaveBeenCalled()
      expect(res.status).toBe(200)
    })
  })
})
