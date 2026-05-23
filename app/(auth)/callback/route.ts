import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/projects'

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      // If this is an invite flow, check user metadata for project info
      const { data: { user } } = await supabase.auth.getUser()
      if (user?.user_metadata?.project_id) {
        return NextResponse.redirect(`${origin}/projects/${user.user_metadata.project_id}`)
      }
      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  return NextResponse.redirect(`${origin}/(auth)/error`)
}
