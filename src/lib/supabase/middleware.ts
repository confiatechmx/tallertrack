import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { parseTenantFromHost, getTenantCookieDomain } from '@/lib/tenantRouting'

export async function updateSession(request: NextRequest) {
  const host = request.headers.get('host') || ''
  const tenantHost = parseTenantFromHost(host, request.nextUrl.searchParams)
  const cookieDomain = getTenantCookieDomain(host)

  const requestHeaders = new Headers(request.headers)
  if (tenantHost.isTenantHost) {
    requestHeaders.set('x-tenant-domain', tenantHost.fullDomain)
    if (tenantHost.subdomain) {
      requestHeaders.set('x-tenant-subdomain', tenantHost.subdomain)
    }
  }

  let supabaseResponse = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  })

  // Propagar encabezados del tenant para respuesta
  if (tenantHost.isTenantHost) {
    supabaseResponse.headers.set('x-tenant-domain', tenantHost.fullDomain)
    if (tenantHost.subdomain) {
      supabaseResponse.headers.set('x-tenant-subdomain', tenantHost.subdomain)
    }
  }

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({
            request: {
              headers: requestHeaders,
            },
          })
          if (tenantHost.isTenantHost) {
            supabaseResponse.headers.set('x-tenant-domain', tenantHost.fullDomain)
            if (tenantHost.subdomain) {
              supabaseResponse.headers.set('x-tenant-subdomain', tenantHost.subdomain)
            }
          }
          cookiesToSet.forEach(({ name, value, options }) => {
            const finalOptions = cookieDomain ? { ...options, domain: cookieDomain } : options
            supabaseResponse.cookies.set(name, value, finalOptions)
          })
        },
      },
    }
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const pathname = request.nextUrl.pathname

  // 1. En subdominios de tenant (ej. cova.tallertrack.com o cova.localhost)
  if (tenantHost.isTenantHost) {
    // Si entran a la raíz de su subdominio:
    if (pathname === '/') {
      const url = request.nextUrl.clone()
      if (user) {
        url.pathname = '/tablero'
      } else {
        url.pathname = '/login'
      }
      return NextResponse.redirect(url)
    }

    // Si ya está autenticado y visita /login, enviar directo a su tablero
    if (user && pathname === '/login') {
      const url = request.nextUrl.clone()
      url.pathname = '/tablero'
      return NextResponse.redirect(url)
    }

    // Si no está autenticado y la ruta es protegida, enviar a /login
    const isPublicTenantRoute =
      pathname.startsWith('/login') ||
      pathname.startsWith('/auth') ||
      pathname.startsWith('/orden') ||
      pathname.startsWith('/api')

    if (!user && !isPublicTenantRoute) {
      const url = request.nextUrl.clone()
      url.pathname = '/login'
      return NextResponse.redirect(url)
    }

    return supabaseResponse
  }

  // 2. En dominio raíz de la plataforma (tallertrack.com / localhost sin subdominio)
  const isPublicRoute =
    pathname === '/' ||
    pathname.startsWith('/login') ||
    pathname.startsWith('/auth') ||
    pathname.startsWith('/orden') ||
    pathname.startsWith('/api')

  if (!user && !isPublicRoute) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  // Si ya tiene sesión activa en el sitio principal y visita /login, mandarlo al dashboard
  if (user && pathname === '/login') {
    const url = request.nextUrl.clone()
    url.pathname = '/tablero'
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}
