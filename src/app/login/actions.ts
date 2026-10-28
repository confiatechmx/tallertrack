'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { getTenantRedirectAfterLogin } from '@/lib/tenantServer'

export async function login(formData: FormData) {
  const supabase = await createClient()

  const email = (formData.get('email') as string) || ''
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

  revalidatePath('/', 'layout')

  if (authData?.user) {
    let host = ''
    try {
      const headersList = await headers()
      host = headersList.get('host') || ''
    } catch {
      // Sin headers activos
    }

    const redirectUrl = await getTenantRedirectAfterLogin(
      authData.user.id,
      host,
      testDomain ? { test_domain: testDomain } : undefined
    )
    redirect(redirectUrl)
  }

  redirect('/tablero')
}

export async function loginDemo() {
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
