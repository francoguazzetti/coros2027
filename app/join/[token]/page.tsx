import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { joinProjectByToken } from '@/lib/actions/settings'

export default async function JoinPage({
  params,
}: {
  params: Promise<{ token: string }>
}) {
  const { token } = await params
  const supabase = await createClient()

  // Check if user is logged in
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    // Redirect to login with return URL
    redirect(`/login?next=/join/${token}`)
  }

  try {
    const result = await joinProjectByToken(token)

    if (result.success) {
      if (result.alreadyMember) {
        // Already a member, just redirect
        redirect(`/projects/${result.projectId}/general`)
      } else {
        // Newly added, redirect to project
        redirect(`/projects/${result.projectId}/general`)
      }
    }
  } catch (error) {
    // Invalid or disabled share link
    redirect('/login?error=invalid_share_link')
  }

  // Fallback redirect
  redirect('/projects')
}
