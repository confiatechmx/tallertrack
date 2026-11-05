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
    let activeUser = user

    // Validación Zero-Trust: verificar que la sesión activa pertenezca realmente a este tenant (o sea SuperAdmin)
    if (activeUser) {
      const [{ data: domainRow }, { data: userPerfil }] = await Promise.all([
        supabase
          .from('tenant_domains')
          .select('empresa_id')
          .eq('domain', tenantHost.fullDomain)
          .eq('verified', true)
          .maybeSingle(),
        supabase
          .from('perfiles')
          .select('empresa_id, rol')
          .eq('id', activeUser.id)
          .maybeSingle(),
      ])

      const hostEmpresaId = domainRow?.empresa_id || null
      const isSuperAdmin =
        userPerfil?.rol === 'SuperAdmin' || userPerfil?.rol === 'SUPERADMIN'

      const isTenantMismatch = Boolean(
        hostEmpresaId &&
          userPerfil?.empresa_id &&
          !isSuperAdmin &&
          userPerfil.empresa_id !== hostEmpresaId
      )

      if (isTenantMismatch) {
        // Cerrar inmediatamente la sesión cruzada (ej. sesión Demo de tallertrack.com al abrir cova.tallertrack.com)
        await supabase.auth.signOut()
        activeUser = null
      }
    }

    // Helper para preservar cookies actualizadas/limpiadas al redirigir
    const redirectWithCookies = (url: URL) => {
      const redirectRes = NextResponse.redirect(url)
      supabaseResponse.cookies.getAll().forEach((cookie) => {
        redirectRes.cookies.set(cookie)
      })
      return redirectRes
    }

    // Si entran a la raíz de su subdominio:
    if (pathname === '/') {
      const url = request.nextUrl.clone()
      if (activeUser) {
        url.pathname = '/tablero'
      } else {
        url.pathname = '/login'
      }
      return redirectWithCookies(url)
    }

    // Si ya está autenticado (en el tenant correcto) y visita /login, enviar directo a su tablero
    if (activeUser && pathname === '/login') {
      const url = request.nextUrl.clone()
      url.pathname = '/tablero'
      return redirectWithCookies(url)
    }

    // Si no está autenticado (o su sesión cruzada fue revocada) y la ruta es protegida, enviar a /login
    const isPublicTenantRoute =
      pathname.startsWith('/login') ||
      pathname.startsWith('/auth') ||
      pathname.startsWith('/orden') ||
      pathname.startsWith('/api')

    if (!activeUser && !isPublicTenantRoute) {
      const url = request.nextUrl.clone()
      url.pathname = '/login'
      return redirectWithCookies(url)
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
