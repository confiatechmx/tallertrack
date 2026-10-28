import { describe, it, expect, vi, beforeEach } from 'vitest'
import { parseTenantFromHost, getTenantCookieDomain } from '../lib/tenantRouting'
import { getTenantRedirectAfterLogin } from '../lib/tenantServer'

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
}

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(async () => mockSupabase),
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
})
