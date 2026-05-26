import { redirect } from 'next/navigation'
import { isRedirectError } from 'next/dist/client/components/redirect-error'
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
    redirect(`/login?next=/join/${token}`)
  }

  let projectId: string | null = null
  let joinError = false

  try {
    const result = await joinProjectByToken(token)
    if (result.success) {
      projectId = result.projectId
    }
  } catch (error) {
    // Re-throw redirect errors — never swallow them
    if (isRedirectError(error)) throw error
    joinError = true
  }

  // All redirects are outside the try/catch
  if (joinError) {
    redirect('/projects?error=invalid_share_link')
  }

  if (projectId) {
    redirect(`/projects/${projectId}/general`)
  }

  redirect('/projects')
}
