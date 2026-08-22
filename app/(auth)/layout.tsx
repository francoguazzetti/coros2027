import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'ClariBI - Authentication',
  description: 'Sign in to your ClariBI account',
}

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
