import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { createClient as createAdminClient } from '@supabase/supabase-js'

// TEMPORARY: local-only helper used to verify the admin panel in the preview.
export async function GET() {
  if (process.env.NODE_ENV === 'production') {
    return new NextResponse('Not found', { status: 404 })
  }

  const admin = createAdminClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  const { data: profiles } = await admin
    .from('profiles')
    .select('email')
    .eq('role', 'admin')
    .limit(1)

  const email = profiles?.[0]?.email
  if (!email) return NextResponse.json({ error: 'no admin' }, { status: 400 })

  const { data: link, error } = await admin.auth.admin.generateLink({
    type: 'magiclink',
    email,
  })
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (list) => list.forEach(({ name, value, options }) =>
          cookieStore.set(name, value, options)
        ),
      },
    }
  )

  const { error: otpError } = await supabase.auth.verifyOtp({
    token_hash: link.properties.hashed_token,
    type: 'email',
  })
  if (otpError) return NextResponse.json({ error: otpError.message }, { status: 400 })

  return NextResponse.redirect(new URL('/admin', 'http://localhost:3000'))
}
