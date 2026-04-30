import { type NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/middleware'

const PROTECTED = ['/dashboard', '/practice', '/settings']

export async function proxy(request: NextRequest) {
  const { supabase, supabaseResponse } = createClient(request)

  // Refresh the session — must be the first thing after createClient
  const { data: { user } } = await supabase.auth.getUser()

  const isProtected = PROTECTED.some((p) =>
    request.nextUrl.pathname.startsWith(p)
  )

  if (isProtected && !user) {
    const url = request.nextUrl.clone()
    url.pathname = '/signin'
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
