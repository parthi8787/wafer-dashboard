'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const LINKS = [
  { href: '/', label: 'Bin analysis' },
  { href: '/probe', label: 'Probe Actuals' },
] as const

export function AppNav() {
  const pathname = usePathname() || '/'

  return (
    <nav className="app-nav" aria-label="Primary">
      {LINKS.map((link) => {
        const active =
          link.href === '/'
            ? pathname === '/'
            : pathname === link.href || pathname.startsWith(`${link.href}/`)
        return (
          <Link
            key={link.href}
            href={link.href}
            className={`app-nav-link ${active ? 'active' : ''}`}
          >
            {link.label}
          </Link>
        )
      })}
    </nav>
  )
}
