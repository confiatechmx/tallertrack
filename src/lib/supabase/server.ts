import { createServerClient } from '@supabase/ssr'
import { cookies, headers } from 'next/headers'
import { getTenantCookieDomain } from '@/lib/tenantRouting'

export async function createClient() {
  const cookieStore = await cookies()
  let cookieDomain: string | undefined

  try {
    const headersList = await headers()
    const host = headersList.get('host') || ''
    cookieDomain = getTenantCookieDomain(host)
  } catch {
    // Context without active request headers
  }

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              const finalOptions = cookieDomain ? { ...options, domain: cookieDomain } : options
              cookieStore.set(name, value, finalOptions)
            })
          } catch {
            // The `setAll` method was called from a Server Component.
          }
        },
      },
    }
  )
}
