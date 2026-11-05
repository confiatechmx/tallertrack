'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { getTenantRedirectAfterLogin } from '@/lib/tenantServer'
import { parseTenantFromHost } from '@/lib/tenantRouting'

function normalizeLoginEmail(rawEmail: string): string {
  const cleaned = (rawEmail || '').trim().toLowerCase()
  const larissaAliases = new Set([
    'larizaorozco',
    'larizaorozco@gmail.com',
    'lariza.orozco@gmail.com',
    'lariza.orozcor@gmail.com',
    'larizaorozcor@gmail.com',
    'larissaorozco',
    'larissaorozco@gmail.com',
    'larissa.orozco@gmail.com',
    'larissaorozcor',
    'larissaorozcor@gmail.com',
    'larissa.orozcor',
    'larissa.orozcor@gmail.com',
  ])

  if (larissaAliases.has(cleaned)) {
    return 'larissa.orozcor@gmail.com'
  }

  return cleaned
}

export async function login(formData: FormData) {
  const supabase = await createClient()

  const rawEmail = (formData.get('email') as string) || ''
  const email = normalizeLoginEmail(rawEmail)
  const password = (formData.get('password') as string) || ''
  const testDomain = (formData.get('test_domain') as string) || undefined

  const { data: authData, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (error) {
    const errorParam = encodeURIComponent('Credenciales inválidas. Verifica tu correo y contraseña.')
    const testDomainParam = testDomain ? `&test_domain=${encodeURIComponent(testDomain)}` : ''
    redirect(`/login?message=${errorParam}${testDomainParam}`)
  }

  if (authData?.user) {
    let host = ''
    try {
      const headersList = await headers()
      host = headersList.get('host') || ''
    } catch {
      // Sin headers activos
    }

    const searchParamsObj = testDomain ? { test_domain: testDomain } : undefined
    const tenantHost = parseTenantFromHost(host, searchParamsObj)

    // Si el inicio de sesión ocurre desde un subdominio de tenant (ej. cova.tallertrack.com),
    // validar que el usuario pertenezca a ese tenant o sea SuperAdmin
    if (tenantHost.isTenantHost) {
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
          .eq('id', authData.user.id)
          .maybeSingle(),
      ])

      const hostEmpresaId = domainRow?.empresa_id || null
      const isSuperAdmin =
        userPerfil?.rol === 'SuperAdmin' || userPerfil?.rol === 'SUPERADMIN'

      if (
        hostEmpresaId &&
        userPerfil?.empresa_id &&
        !isSuperAdmin &&
        userPerfil.empresa_id !== hostEmpresaId
      ) {
        await supabase.auth.signOut()
        const errorParam = encodeURIComponent(
          'Esta cuenta pertenece a otro taller. Ingresa con una cuenta autorizada para este taller.'
        )
        const testDomainParam = testDomain ? `&test_domain=${encodeURIComponent(testDomain)}` : ''
        redirect(`/login?message=${errorParam}${testDomainParam}`)
      }
    }

    revalidatePath('/', 'layout')

    const redirectUrl = await getTenantRedirectAfterLogin(
      authData.user.id,
      host,
      searchParamsObj
    )
    redirect(redirectUrl)
  }

  revalidatePath('/', 'layout')
  redirect('/tablero')
}

export async function loginDemo() {
  let host = ''
  try {
    const headersList = await headers()
    host = headersList.get('host') || ''
  } catch {
    // Sin headers activos
  }

  const tenantHost = parseTenantFromHost(host)
  if (tenantHost.isTenantHost) {
    const errorParam = encodeURIComponent(
      'El modo Demo no está disponible en subdominios de talleres privados. Inicia sesión con tu cuenta.'
    )
    redirect(`/login?message=${errorParam}`)
  }

  const supabase = await createClient()

  // Intento con credenciales oficiales TallerTrack
  let { error } = await supabase.auth.signInWithPassword({
    email: 'demo@tallertrack.com',
    password: 'TallerTrack2026!',
  })

  // Retrocompatibilidad con entorno Supabase existente
  if (error) {
    const fallback = await supabase.auth.signInWithPassword({
      email: 'demo@autolisto.mx',
      password: 'AutoListo2026!',
    })
    error = fallback.error
  }

  if (error) {
    redirect('/login?message=Error+al+iniciar+modo+demo')
  }

  revalidatePath('/', 'layout')
  redirect('/tablero')
}
