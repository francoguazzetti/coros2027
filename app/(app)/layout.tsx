import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'ClariBI',
  description: 'Campaign intelligence platform',
}

export default function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
