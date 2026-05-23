import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Coros - Authentication',
  description: 'Sign in to your Coros account',
}

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
