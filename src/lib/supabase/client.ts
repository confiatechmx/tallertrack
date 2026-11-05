import { createBrowserClient } from '@supabase/ssr'
import { getTenantCookieDomain } from '@/lib/tenantRouting'

export function createClient() {
  const cookieDomain =
    typeof window !== 'undefined'
      ? getTenantCookieDomain(window.location.hostname)
      : undefined

  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    cookieDomain
      ? {
          cookieOptions: {
            domain: cookieDomain,
          },
        }
      : undefined
  )
}
